const https = require('https');
const http = require('http');

module.exports = async function (context, req) {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    };
    return;
  }

  const backendUrl = process.env.BACKEND_URL || 'http://172.174.80.112';
  
  // Obtener el path desde la query string
  const targetPath = req.query.path || '';
  const targetUrl = `${backendUrl}${targetPath}`;
  
  // Extraer Authorization header (puede venir en diferentes formatos)
  const authHeader = req.headers['authorization'] 
    || req.headers['Authorization'] 
    || req.headers['AUTHORIZATION'];
  
  context.log(`Proxying ${req.method} request to: ${targetUrl}`);
  context.log(`All headers: ${JSON.stringify(Object.keys(req.headers))}`);
  if (authHeader) {
    context.log(`Auth header present: ${authHeader.substring(0, 20)}...`);
  } else {
    context.log('⚠️  No auth header found');
  }
  
  try {
    // Preparar el body
    let bodyData = undefined;
    if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
      bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // Preparar headers para reenviar
    const forwardHeaders = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Accept': 'application/json',
    };

    // Agregar Authorization si existe
    if (authHeader) {
      forwardHeaders['Authorization'] = authHeader;
    }

    const response = await makeRequest(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyData
    });

    context.res = {
      status: response.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: response.body
    };
  } catch (error) {
    context.log.error('Proxy error:', error);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: {
        error: 'Proxy error',
        message: error.message
      }
    };
  }
};

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      // Aumentar timeout
      timeout: 30000
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Intentar parsear como JSON, si falla devolver string
          const body = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            body: body
          });
        } catch (e) {
          // Si no es JSON válido, devolver el string
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}
