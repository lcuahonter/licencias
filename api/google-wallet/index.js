// Azure Function para generar JWT de Google Wallet
const { SignJWT, importPKCS8 } = require('jose');

// Configuración de Google Wallet (REEMPLAZAR CON TUS CREDENCIALES)
const GOOGLE_WALLET_CONFIG = {
  issuerId: 'BCR2DN5T23UZ3ZAJ',  // Tu Issuer ID real
  serviceAccount: {
    type: 'service_account',
    project_id: 'skilled-flight-491317-c7',
    private_key_id: '919dc8ff9db14b8466a5b79823b53e13bf37c0c1',
    private_key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDMZAh89VUNyxHU
YBLYQ6ANfEKA3NZ3ARUPOwsJq+Mo+RZFqjKW+I1W4rKMZmNbVj5FsoLMyw+6x7Sa
9M0c+x+fXNf4cxrVPHGTrm7qHhE/0uRABchaMI4lmYo1JQHFPpIWSLkiGzjHc4rL
XqTXVLBzbn6ZwjO7gE2oWU3C4+TIN5+qqeDnElCTLhLVJmWNmhqCSb6hy/EjfSvs
7nfXwoWGReBHRJ+ZYrpnj+HRC9cEtUK8YaaaQt/GqbgTUBNJq8pPPXP1VDfRRBwP
M5/7ExYHn+ByMy3EXgz+zFGEVd7XMgk+cpDS29WuMbEOcb9avPgRnL2HpRIjxvB5
KBLXDUCPAgMBAAECggEAIecn7J5UjOoAcPNnZ38SiJoc0pDkdtn0RdH75eSf/2Bj
PDaxQeSZq+4E7ZAK7rrIBTnz7gdyz6nSVe/BruB4NtrTgi/e+rxAygfhowOjcIGe
qytVDUzHj19qvZ+qra6lfyfHTxZ9MmxX0J3IMbr9B9tYtFAyfOlujZG+pH4L1Cqa
4ujlvckQNmaqBmF77Sh1HYwXwp5sX+dY6tQl9d0Xe3+nDsPIfCB1jfS9210KX4b9
4ldghwVx+ifLMjIkhmllE34UBAil/0p6cpAmN3BqlSTmzttE/gbXh47iT3SeGWfl
ZUTEUkpfFXfnxwTLP3DsC2WMF+5DD1YVcrC80NPk1QKBgQD9x22KrqwGzHtZ0Zrk
IrGgjlIauTKFA1ioQYfvv18SWfjnmBJnlTTsmrAL4lGAe8YAcDwaNr6DZmoGXkGi
c1EUqNs+PHnvJZUEZsDsEqABoNrl0vKJzROL6y/MC6OdRX7JPl4hn/U+6HTSMLd9
v4yoUfv+RbV4llp74hn7IlZRLQKBgQDOLfRn7dDaP2wfsQMv+Bu1jVe3yHlLIhmP
b6OJeP1+PDJ5J8OlMFjL8SAZH7l6EbI2qwU87JcMFhr/BAlbVegli/86bOUFh3tC
QfOa03LE5NEzwh2HN5acMigl4olEcg3VPGO5/Gk8PbexGZWLaG+iw5D7KdgzLng9
Mx6SsLrWKwKBgQDqKnJxXOtu+o93OWlqyHiOZcRs1CZBhezwlEcSecsH6+04BaI1
4f+LstBups39eDgjf2x14723EXETnzWA6FcQcR6cNsFsYYk3Hnk1W5o45mwVVKhn
bstyd/kKllLKc62hk+LXs/lfqq7gpAMsDOuFBOE4pqnkMxga526BxBVRoQKBgGsZ
bfrKixHDniu8LHavf91IBYe/CFqh5PsgN6gChFMde+55XGSjf4y4vT6vvw4MwTEq
lzb1guTRWsabVyztrABM/5Be3nyHytw5HAyRx+1FGvKy49nIY2DRoQ9E5J78S/k3
PGpxFk0nlhLVwlu/LTY0NkxxiQ/VFLpdooT6bqMvAoGBANOP4z+Kx9yVYzdAVMb1
EQjzNxGQlDpvDukmXKXTDzZcILRJft0mzRwj+DlD9AosXn1EAjwAserQieFdIsDP
z2bc0NTvQ63yBQtEaclVsqHTHmRBo98aGXpm/gHxi3HmWqr8SFNkaIzfBS8axEyZ
GGErDjELiu+4zi4oQR4r+OCq
-----END PRIVATE KEY-----`,
    client_email: 'wallet-licencias@skilled-flight-491317-c7.iam.gserviceaccount.com',
    client_id: '114261544750696739996',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/wallet-licencias%40skilled-flight-491317-c7.iam.gserviceaccount.com',
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
    const classId = `${issuerId}.licencias_durango_class`;

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
      cardTitle: {
        defaultValue: { language: 'es-MX', value: 'Licencia de Conducir' }
      },
      subheader: {
        defaultValue: { language: 'es-MX', value: 'Gobierno del Estado de Durango' }
      },
      header: {
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
      textModulesData: [
        { id: 'nombre', header: 'NOMBRE', body: licenseData.nombre },
        { id: 'folio', header: 'NO. LICENCIA', body: licenseData.folio },
        { id: 'vigencia', header: 'VIGENCIA', body: licenseData.vigencia },
        { id: 'expedicion', header: 'EXPEDICIÓN', body: licenseData.expedicion }
      ],
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
