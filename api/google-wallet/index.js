const { SignJWT, importPKCS8 } = require('jose');

// Configuración de Google Wallet actualizada con tu nuevo JSON
const GOOGLE_WALLET_CONFIG = {
  issuerId: '3388000000023093196',
  serviceAccount: {
    type: 'service_account',
    project_id: 'licenciasdgo',
    private_key_id: '08dc9d6bdfe177e16bb4dd3449409e139f3603a4',
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEkGH+nz/seg++\nXHmwKE3lgmJQnG7HrR+lu0nvIYK5nW7np/k9XV5hQ5prtFQN0O9C9CCyjCAyaJFC\nwPpBXohZxwvgBzkbb1P9ySSauZaXmm2sVMO421KvWbElu+ClIi/3rR0sT2o/70gl\nIUlzC6I/S2KoToiFrdCEBjEu/n7K1em/B2KAH/fGu8WsveFk/lgQnKnRgnPJByrR\nX5qv76/A6dx898efk08H5/f1q4Vp5+UHkxANHn7TFxt6eFBvYfSnMjdn65sQidvr\nQBDW9Vbdv0M8YsscZ+wPo6AcYfMXnfilwp4T3hwiMOGMKG9l53OU4QtER7cAoFE4\nnOgCIGENAgMBAAECggEAICDZY5zz/dsVp6/F1B1CXjkpiLOJB+osOhKayxNXIq+w\n6PxzqKwSOSOrod8fvgJgmTj9/zEYMiUVWSvhu72P29zE/CEyHGHeAKVX7lJXYwBC\n3OAd/aEbqr2mTtyeo18rJ/iLxCpW24xo5mjCcKN+KYpQ3eG4PuFiK7I3Z88BOnXj\nFFXGhMgvFZIuHU3Fk+U+fqf6rp6jSXiOjbTz8BQRkOFy8BuYv77rdsjiB0l5gfyN\nanKGUlAA5y+QJ/+vue7iX1dVyiHt9JlHmoZUiRMovjxxJP3S7nvGMuQDnMuJuGlA\nSQvOtI6L6PwmIHYg7jkQIIkMvcnZ52O6CiDs91bBAQKBgQDpCgQyPDhUb/wsnU5A\ngY5xnFHUjgF0iSpYQ+7ruGmIAgtCqlkygbhoGtCAKwSH3JLuDvKmM/e+jW3BH0J0\njAfD09/GGWBnTYHmHl6Yp6lXkqNyjri3HEDo5Cg4lWNyA9FnLMgyPvX/BgJ4QIbI\nX2SbDlxLsIs4aiAgo80Lkj7A+QKBgQDX7lknmcdtGGQfSUXheE4AvrNhcATe76nG\nW6XLVWWdNSR79dU92vKIV9yQEX/HLBBXvGdr1fDzVqqEC64fVqvqgsqTr3uF0QGM\n8Ey/gwtVGmxR4wfDBn4U+3DsxADVfOGVDNwHQiPxuMMtJwNQ4xgC7k4iQfEUERvI\nPoP7Nj65tQKBgBHMBwgDG1YvezW5CbnZaxR4GLO/6JKKyyYUghGUctLFPTDpK4i0\n6W1h5txy7JSnnrz5fUR+IYR27pPaHEwkSY+GBcfuNjONcsctOJI187PRahQcnDS3\nvqlKi1vO5NpXOk3D2MIllsnUHqoqW2DAEEHbNec941P6ntt/RvCESbCZAoGAJZIQ\nKybDn0TOLu9l3Ew9bj3AImUGQ+/5X00U9OMf8hGMDpGAj+mnp3d6JgsVa4dMNKfQ\nat/ns79RnfYWTteaxAwLyVSQLoFmPqqVAAGCGEWnsTvKXvGjQG1bgaa86mh3K6L4\nKb8lV+qo8xNFrW5GAESMjcNhefdcGSRffHc8xL0CgYEApEmYDlqRimAw2OKC29Ib\nSk3GU++4Ppu7QPRtWMYEA6E4Q1gmCSkJjG0fKQ9s6Hq65VzztFZv15ZVMTQ+sE32\nqu3YvHZR6LcQTpbZYO2PaJGxeqZdBNWjDN5a40xK0tvXEASc83f1LvsFkiPKLfEn\nu35j8Qrd/uRt6D+Q69iSRdM=\n-----END PRIVATE KEY-----\n",
    client_email: 'api-licencias-wallet@licenciasdgo.iam.gserviceaccount.com',
    client_id: '116623889464452321355',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/api-licencias-wallet%40licenciasdgo.iam.gserviceaccount.com',
    universe_domain: 'googleapis.com'
  }
};

module.exports = async function (context, req) {
  context.log('🔐 Generando JWT para Google Wallet');

  // CORS
  context.res = {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  };

  if (req.method === 'OPTIONS') {
    context.res.status = 200;
    context.res.body = '';
    return;
  }

  try {
    const licenseData = req.body;
   
    if (!licenseData || !licenseData.folio || !licenseData.nombre) {
      context.res.status = 400;
      context.res.body = {
        error: 'Datos de licencia incompletos',
        required: ['folio', 'nombre', 'tipo_licencia', 'vigencia', 'expedicion']
      };
      return;
    }

    const issuerId = GOOGLE_WALLET_CONFIG.issuerId;
    
<<<<<<< HEAD
    // AQUÍ ESTÁ EL ID DE TU CLASE GENÉRICA
    const classId = `${issuerId}.Licencias`;

    const genericObject = {
      id: `${issuerId}.${licenseData.folio.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
      classId: classId,
      genericType: 'GENERIC_TYPE_UNSPECIFIED',
      hexBackgroundColor: '#005c35',
      logo: {
        sourceUri: {
          uri: 'https://www.durango.gob.mx/wp-content/uploads/2021/03/escudo-durango.png'
        },
        contentDescription: {
          defaultValue: { language: 'es-MX', value: 'Gobierno de Durango' }
        }
      },
=======
    // AQUÍ ESTÁ EL ID DE TU CLASE GENÉRICA CONFIRMADA
    const classId = `${issuerId}.Licencias`;

    // VERSIÓN MINIMALISTA PARA PRUEBAS (Evita bloqueos de validación de Google)
    const genericObject = {
      // Agregamos Date.now() para asegurar que el ID sea único y evitar error de duplicados
      id: `${issuerId}.${licenseData.folio.replace(/[^a-zA-Z0-9_.-]/g, '_')}_${Date.now()}`,
      classId: classId,
      hexBackgroundColor: '#005c35',
      
      // LOGO COMENTADO: A menudo causa errores si el servidor rechaza la conexión de Google
      /*
      logo: {
        sourceUri: { uri: 'https://www.durango.gob.mx/wp-content/uploads/2021/03/escudo-durango.png' },
        contentDescription: { defaultValue: { language: 'es-MX', value: 'Gobierno de Durango' } }
      },
      */

>>>>>>> bed688e889c949dadae0f550240dac2c6e6a796c
      cardTitle: {
        defaultValue: { language: 'es-MX', value: 'Licencia de Conducir' }
      },
      subheader: {
        defaultValue: { language: 'es-MX', value: 'Gobierno del Estado de Durango' }
      },
      header: {
<<<<<<< HEAD
        defaultValue: { language: 'es-MX', value: licenseData.tipo_licencia }
      },
      barcode: {
        type: 'QR_CODE',
        value: JSON.stringify({
          folio: licenseData.folio,
          nombre: licenseData.nombre,
          tipo_licencia: licenseData.tipo_licencia,
          vigencia: licenseData.vigencia,
          rfc: licenseData.rfc,
          expedicion: licenseData.expedicion
        }),
        alternateText: licenseData.folio
      },
=======
        defaultValue: { language: 'es-MX', value: licenseData.tipo_licencia || 'Licencia' }
      },
      
      // QR SIMPLIFICADO
      barcode: {
        type: 'QR_CODE',
        value: licenseData.folio || '123456789',
        alternateText: licenseData.folio || 'Folio'
      },
      
>>>>>>> bed688e889c949dadae0f550240dac2c6e6a796c
      textModulesData: [
        { id: 'nombre', header: 'NOMBRE', body: licenseData.nombre },
        { id: 'folio', header: 'NO. LICENCIA', body: licenseData.folio },
        { id: 'vigencia', header: 'VIGENCIA', body: licenseData.vigencia },
        { id: 'expedicion', header: 'EXPEDICIÓN', body: licenseData.expedicion }
      ],
<<<<<<< HEAD
=======
      
>>>>>>> bed688e889c949dadae0f550240dac2c6e6a796c
      hexForegroundColor: '#ffffff'
    };

    const payload = {
      iss: GOOGLE_WALLET_CONFIG.serviceAccount.client_email,
      aud: 'google',
      origins: [],
      typ: 'savetowallet',
      payload: { genericObjects: [genericObject] }
    };

    const privateKey = await importPKCS8(
      GOOGLE_WALLET_CONFIG.serviceAccount.private_key,
      'RS256'
    );

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`;

    context.log('✅ JWT generado correctamente');

    context.res.status = 200;
    context.res.body = {
      success: true,
      saveUrl: saveUrl,
      jwt: jwt,
      expiresIn: '1h'
    };

  } catch (error) {
    context.log.error('❌ Error:', error);
    context.res.status = 500;
    context.res.body = {
      error: 'Error al generar el JWT',
      message: error.message
    };
  }
};

