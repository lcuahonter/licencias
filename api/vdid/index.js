/**
 * Azure Function: /api/vdid
 *
 * Proxy seguro para la API de VeriDocID / Suma México.
 * Las keys secretas viven SOLO en variables de entorno del servidor Azure:
 *   - VDID_API_KEY        → sk_test_... (x-api-key para /v3/createVerification)
 *   - VDID_CLIENT_ID      → client_id OAuth
 *   - VDID_CLIENT_SECRET  → client_secret OAuth
 *
 * El frontend solo necesita VITE_VDID_PUBLIC_KEY (pk_test_...) para generar la URL del iframe.
 *
 * Acciones disponibles (body JSON: { action, ...params }):
 *   - createVerification  → POST /id/v3/createVerification  → { uuid }
 *   - status              → POST /id/v2/status              → { ready: bool }
 *   - results             → POST /id/v2/results             → { ...data }
 *   - curp                → POST /gov/curp                  → { ...data }
 */

const https = require('https');

const VDID_BASE = 'veridocid.azure-api.net';
const VDID_API_KEY       = process.env.VDID_API_KEY;
const VDID_CLIENT_ID     = process.env.VDID_CLIENT_ID;
const VDID_CLIENT_SECRET = process.env.VDID_CLIENT_SECRET;

// Cache JWT en memoria (por instancia de función)
let _cachedToken = null;
let _tokenExpiry = 0;

// ── Helpers ────────────────────────────────────────────────────────────────

function httpsPost(path, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(bodyObj);
    const options = {
      hostname: VDID_BASE,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function httpsPostForm(path, formBody) {
  return new Promise((resolve, reject) => {
    const bodyStr = formBody;
    const options = {
      hostname: VDID_BASE,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function getJwt() {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const form = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     VDID_CLIENT_ID || '',
    client_secret: VDID_CLIENT_SECRET || '',
    audience:      'veridocid',
  }).toString();

  const { status, body } = await httpsPostForm('/api/auth/token', form);
  if (status !== 200) throw new Error(`OAuth token error ${status}: ${body}`);

  const data = JSON.parse(body);
  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + ((data.expires_in ?? 86400) - 60) * 1000;
  return _cachedToken;
}

// ── Handlers por acción ────────────────────────────────────────────────────

async function actionCreateVerification(body, context) {
  const ref = body.userRef || `licencias-dgo-${Date.now()}`;

  // Intento 1: x-api-key
  if (VDID_API_KEY) {
    try {
      const { status, body: raw } = await httpsPost(
        '/api/id/v3/createVerification',
        { 'x-api-key': VDID_API_KEY },
        {
          id: ref,
          options: {
            checks: { selfie: true, verifyIp: false, onlyVerifyID: false },
            language_sdk: 'es',
          },
        }
      );
      if (status === 200) {
        const uuid = raw.replace(/^"|"$/g, '').trim();
        if (uuid) {
          context.log('[VDID proxy] v3/createVerification OK, UUID:', uuid);
          return { uuid };
        }
      }
      context.log('[VDID proxy] v3 falló:', status, raw);
    } catch (e) {
      context.log('[VDID proxy] v3 error de red:', e.message);
    }
  }

  // Intento 2: Bearer JWT
  if (VDID_CLIENT_ID && VDID_CLIENT_SECRET) {
    try {
      const jwt = await getJwt();
      const { status, body: raw } = await httpsPost(
        '/api/id/v2/createVerification',
        { Authorization: `Bearer ${jwt}` },
        { id: ref, options: { selfie: true, verifyIp: false } }
      );
      if (status === 200) {
        const uuid = raw.replace(/^"|"$/g, '').trim();
        if (uuid) {
          context.log('[VDID proxy] v2/createVerification OK, UUID:', uuid);
          return { uuid };
        }
      }
      context.log('[VDID proxy] v2 falló:', status, raw);
    } catch (e) {
      context.log('[VDID proxy] v2 error:', e.message);
    }
  }

  throw new Error('No se pudo crear la verificación VDID — revisa VDID_API_KEY en Azure App Settings');
}

async function actionStatus(body) {
  const jwt = await getJwt();
  const { status, body: text } = await httpsPost(
    '/api/id/v2/status',
    { Authorization: `Bearer ${jwt}` },
    { uuid: body.uuid }
  );
  if (status !== 200) throw new Error(`status error ${status}: ${text}`);
  const ready = !text.toLowerCase().includes("isn't ready") && !text.toLowerCase().includes('not ready');
  return { ready };
}

async function actionResults(body) {
  const jwt = await getJwt();
  const { status, body: raw } = await httpsPost(
    '/api/id/v2/results',
    { Authorization: `Bearer ${jwt}` },
    { uuid: body.uuid, includeImages: true }
  );
  if (status !== 200) throw new Error(`results error ${status}: ${raw}`);
  const data = JSON.parse(raw);
  return {
    status:                  data.status || data.verificationStatus || 'unknown',
    globalResult:            data.globalResult || 'unknown',
    globalResultDescription: data.globalResultDescription || data.expertComments || '',
    selfieBase64: data.images?.selfie || data.selfie || null,
    frontBase64:  data.images?.front  || data.front  || null,
    backBase64:   data.images?.back   || data.back   || null,
    data,
  };
}

async function actionCurp(body) {
  const jwt = await getJwt();
  const { status, body: raw } = await httpsPost(
    '/api/gov/curp',
    { Authorization: `Bearer ${jwt}` },
    { id: '01', curp: body.curp }
  );
  if (status !== 200) throw new Error(`curp error ${status}: ${raw}`);
  const data = JSON.parse(raw);
  if (data.estatus !== 'OK') throw new Error('CURP no encontrada en el RENAPO');
  const parts = (data.fechaNacimiento || '').split('/');
  const fechaIso = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';
  return {
    nombre:          (data.nombre         || '').trim(),
    apellidoPaterno: (data.apellidoPaterno || '').trim(),
    apellidoMaterno: (data.apellidoMaterno || '').trim(),
    fechaNacimiento: fechaIso,
  };
}

// ── Handler principal ──────────────────────────────────────────────────────

module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
    return;
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const body = req.body || {};
    const action = body.action;

    let result;
    switch (action) {
      case 'createVerification':
        result = await actionCreateVerification(body, context);
        break;
      case 'status':
        result = await actionStatus(body);
        break;
      case 'results':
        result = await actionResults(body);
        break;
      case 'curp':
        result = await actionCurp(body);
        break;
      default:
        context.res = {
          status: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: `Acción desconocida: "${action}"` }),
        };
        return;
    }

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(result),
    };
  } catch (err) {
    context.log('[VDID proxy] Error:', err.message);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
