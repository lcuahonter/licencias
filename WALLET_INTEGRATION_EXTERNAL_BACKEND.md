# 🔧 Integración de Google Wallet con Backend Externo

## 📋 Descripción

Este documento explica cómo integrar la funcionalidad de Google Wallet cuando tu **backend está en un repositorio separado**.

---

## 🎯 Pasos Rápidos

### 1. **Copia el código al backend**

En tu repositorio de backend, crea un nuevo endpoint:

**Ruta**: `POST /wallet/google/create`

**Archivo**: Copia el contenido de [`api/wallet-google/index.js`](api/wallet-google/index.js)

### 2. **Instala la dependencia**

En tu backend:
```bash
npm install jose@^5.2.0
```

### 3. **Configura las credenciales**

Edita las credenciales en el código copiado:

```javascript
const GOOGLE_WALLET_CONFIG = {
  issuerId: 'BCR2DN5T23UZ3ZAJ',  // ✅ Ya configurado
  serviceAccount: {
    // ... resto de credenciales ya incluidas
  }
};
```

### 4. **Configura CORS**

Asegúrate de permitir:
- **Origin**: `https://tu-frontend.com` (o `*` para desarrollo)
- **Methods**: `POST, OPTIONS`
- **Headers**: `Content-Type, Authorization`

### 5. **Configura la URL en el frontend**

Crea un archivo `.env` en el frontend:

```bash
# .env
VITE_API_URL=https://tu-backend.azurewebsites.net
```

---

## 📦 Código del Endpoint

Si tu backend NO es Azure Functions, adapta este código:

### Express.js

```javascript
const express = require('express');
const { SignJWT, importPKCS8 } = require('jose');
const router = express.Router();

const GOOGLE_WALLET_CONFIG = {
  issuerId: 'BCR2DN5T23UZ3ZAJ',
  serviceAccount: {
    // ... credenciales completas aquí
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
    client_email: 'wallet-licencias@skilled-flight-491317-c7.iam.gserviceaccount.com'
  }
};

router.post('/wallet/google/create', async (req, res) => {
  try {
    const licenseData = req.body;
    
    if (!licenseData || !licenseData.folio || !licenseData.nombre) {
      return res.status(400).json({
        error: 'Datos de licencia incompletos',
        required: ['folio', 'nombre', 'tipo_licencia', 'vigencia', 'expedicion']
      });
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

    console.log('✅ JWT generado correctamente');

    res.status(200).json({
      success: true,
      saveUrl: saveUrl,
      jwt: jwt,
      expiresIn: '1h'
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: 'Error al generar el JWT',
      message: error.message
    });
  }
});

module.exports = router;
```

---

## 🧪 Testing

### 1. Probar el endpoint directamente

```bash
curl -X POST https://tu-backend.com/wallet/google/create \
  -H "Content-Type: application/json" \
  -d '{
    "folio": "TEST123",
    "nombre": "Juan Pérez",
    "tipo_licencia": "Automovilista",
    "vigencia": "01/01/2029",
    "expedicion": "01/01/2024",
    "rfc": "TEST800101XXX",
    "fecha_nacimiento": "01/01/1980",
    "sexo": "M",
    "nacionalidad": "MEXICANA",
    "tipo_sangre": "O+",
    "donador": "SI",
    "telefono_emergencia": "6181234567",
    "direccion": "Durango"
  }'
```

**Respuesta esperada**:
```json
{
  "success": true,
  "saveUrl": "https://pay.google.com/gp/v/save/eyJhbGciOiJSUzI1NiIs...",
  "jwt": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": "1h"
}
```

### 2. Probar desde el frontend

1. Configura `.env`:
   ```bash
   VITE_API_URL=https://tu-backend.com
   ```

2. Reinicia el frontend:
   ```bash
   npm run dev
   ```

3. Haz clic en "Agregar a Google Wallet" en una licencia activa

---

## 🔐 Seguridad en Producción

### ⚠️ NO HARDCODEAR CREDENCIALES

En lugar de:
```javascript
const GOOGLE_WALLET_CONFIG = {
  private_key: "-----BEGIN PRIVATE KEY-----\n..." // ❌ NO
};
```

Usa variables de entorno:
```javascript
const GOOGLE_WALLET_CONFIG = {
  issuerId: process.env.GOOGLE_WALLET_ISSUER_ID,
  serviceAccount: {
    private_key: process.env.GOOGLE_WALLET_PRIVATE_KEY,
    client_email: process.env.GOOGLE_WALLET_CLIENT_EMAIL
  }
};
```

### Azure App Settings

Si usas Azure, configura las variables en:
- Portal Azure → Tu App Service → Configuration → Application Settings

```
GOOGLE_WALLET_ISSUER_ID = BCR2DN5T23UZ3ZAJ
GOOGLE_WALLET_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\nMIIEvgIBAD...
GOOGLE_WALLET_CLIENT_EMAIL = wallet-licencias@skilled-flight-491317-c7.iam.gserviceaccount.com
```

---

## 📚 Archivos de Referencia

- **Código completo**: [`api/wallet-google/index.js`](api/wallet-google/index.js)
- **Cliente frontend**: [`src/api/walletService.ts`](src/api/walletService.ts)
- **Documentación**: [WALLET_BACKEND_ARCHITECTURE.md](WALLET_BACKEND_ARCHITECTURE.md)

---

## ❓ FAQ

### ¿Necesito Azure Functions?

No. Puedes usar cualquier backend (Express, Fastify, Nest.js, etc.). Solo necesitas crear el endpoint que reciba POST y devuelva el JWT firmado.

### ¿Qué pasa si mi backend está en otro dominio?

Configura CORS en tu backend y actualiza `VITE_API_URL` en el `.env` del frontend.

### ¿Puedo usar este código en producción?

Sí, pero **mueve las credenciales a variables de entorno** para mayor seguridad.

---

**🎉 Listo para integrar**
