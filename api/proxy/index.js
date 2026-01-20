const https = require('https');
const http = require('http');

module.exports = async function (context, req) {
  const backendUrl = process.env.BACKEND_URL || 'http://172.174.80.112';
  
  // Obtener el path desde la query string
  const targetPath = req.query.path || '';
  const targetUrl = `${backendUrl}${targetPath}`;
  
  context.log(`Proxying request to: ${targetUrl}`);
  
  try {
    const response = await makeRequest(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Accept': 'application/json',
        // Reenviar otros headers importantes
        ...(req.headers['authorization'] && { 'Authorization': req.headers['authorization'] }),
      },
      body: req.body ? JSON.stringify(req.body) : undefined
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
      headers: options.headers || {}
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            body: body
          });
        } catch (e) {
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

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}
