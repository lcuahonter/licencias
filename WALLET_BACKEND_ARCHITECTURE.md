# Google Wallet - Arquitectura Backend

## 📋 Resumen

La integración de Google Wallet ha sido migrada a una **arquitectura backend segura** utilizando Azure Functions. Las credenciales privadas y la firma de JWT están protegidas en el servidor.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  - Solo envía datos de licencia al backend                     │
│  - Recibe URL de Google Wallet lista para usar                 │
│  - NO contiene credenciales sensibles                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ POST /api/wallet/google/create
                         │ { folio, nombre, tipo_licencia, ... }
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Azure Functions)                     │
│  - Almacena credenciales de Google Cloud de forma segura       │
│  - Genera JWT firmado con clave privada RS256                  │
│  - Crea genericObject con estructura de Google Wallet          │
│  - Retorna URL: https://pay.google.com/gp/v/save/{JWT}         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura de Archivos

### Backend (`/api/wallet-google/`)

```
api/wallet-google/
├── function.json          # Configuración de Azure Function (POST)
├── index.js              # Lógica principal (CONTIENE CREDENCIALES)
└── index.example.js      # Plantilla de ejemplo
```

### Frontend (`/src/api/`)

```
src/api/
└── walletService.ts      # Cliente simplificado (solo llamada fetch)
```

---

## 🔐 Seguridad

### ✅ Buenas Prácticas Implementadas

1. **Credenciales en Backend**: 
   - Las credenciales de Google Cloud están **solo en el servidor**
   - La clave privada PKCS8 nunca se expone al navegador
   
2. **Firma JWT Segura**: 
   - El JWT se firma en Node.js con `jose` library
   - Usa algoritmo RS256 con clave privada de 2048 bits

3. **Protección Git**:
   - `api/wallet-google/index.js` está en `.gitignore`
   - Solo se versiona `index.example.js` sin credenciales reales

4. **CORS Configurado**:
   - El backend permite solicitudes desde el dominio del frontend
   - Headers CORS correctamente configurados

### ⚠️ Archivos Sensibles (NO SUBIR A GIT)

```bash
api/wallet-google/index.js         # Contiene private_key
api/local.settings.json            # Configuración local de Azure
```

---

## 🚀 Cómo Usar

### 1. Configurar Backend

1. Copia el archivo de ejemplo:
   ```bash
   cd api/wallet-google
   cp index.example.js index.js
   ```

2. Edita `index.js` y reemplaza:
   - `issuerId`: Tu Issuer ID de Google Pay Console
   - `project_id`: ID del proyecto de Google Cloud
   - `private_key`: Tu clave privada PKCS8 completa
   - `client_email`: Email de tu service account

3. Instala dependencias:
   ```bash
   cd api
   npm install
   ```

### 2. Iniciar Backend Local

```bash
cd api
func start
```

El servidor estará en: `http://localhost:7071`

### 3. Usar desde el Frontend

El frontend ya está configurado. Solo necesitas:

```typescript
import { WalletService } from './api/walletService';

const licenseData = {
  folio: 'ABC123',
  nombre: 'Juan Pérez',
  tipo_licencia: 'Automovilista',
  vigencia: '01/01/2029',
  // ... resto de datos
};

await WalletService.addToGoogleWallet(licenseData);
```

---

## 📡 API Endpoint

### `POST /api/wallet/google/create`

Genera un JWT firmado para agregar una licencia a Google Wallet.

#### Request Body

```json
{
  "folio": "ABC123456",
  "nombre": "Juan Pérez García",
  "rfc": "PEGJ800101XXX",
  "tipo_licencia": "Automovilista",
  "expedicion": "01/01/2024",
  "vigencia": "01/01/2029",
  "fecha_nacimiento": "01/01/1980",
  "sexo": "M",
  "nacionalidad": "MEXICANA",
  "tipo_sangre": "O+",
  "donador": "SI",
  "telefono_emergencia": "6181234567",
  "direccion": "Calle Principal #123, Durango"
}
```

#### Response (Success)

```json
{
  "success": true,
  "saveUrl": "https://pay.google.com/gp/v/save/eyJhbGciOiJSUzI1NiIs...",
  "jwt": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": "1h"
}
```

#### Response (Error)

```json
{
  "error": "Error al generar el JWT para Google Wallet",
  "message": "Descripción del error",
  "details": "Stack trace (solo en desarrollo)"
}
```

---

## 🧪 Testing

### Probar Backend Localmente

```bash
# Iniciar Azure Functions
cd api
func start

# En otra terminal, hacer una petición de prueba
curl -X POST http://localhost:7071/api/wallet/google/create \
  -H "Content-Type: application/json" \
  -d '{
    "folio": "TEST123",
    "nombre": "Test User",
    "tipo_licencia": "Automovilista",
    "vigencia": "01/01/2029",
    "expedicion": "01/01/2024",
    "rfc": "TEST800101XXX"
  }'
```

### Probar desde Frontend

1. Inicia el backend:
   ```bash
   cd api
   func start
   ```

2. En otra terminal, inicia el frontend:
   ```bash
   npm run dev
   ```

3. Navega a una licencia activa y haz clic en "Agregar a Google Wallet"

---

## 🔧 Troubleshooting

### Error: "Cannot POST /api/wallet/google/create"

**Causa**: Azure Functions no está corriendo localmente

**Solución**:
```bash
cd api
npm install
func start
```

### Error: "DataError" al importar clave privada

**Causa**: Formato incorrecto de la clave privada

**Solución**: Verifica que la clave en `index.js` incluya:
- Header: `-----BEGIN PRIVATE KEY-----`
- Footer: `-----END PRIVATE KEY-----`
- Saltos de línea correctos en el contenido base64

### El navegador bloquea la ventana emergente

**Causa**: Bloqueador de pop-ups del navegador

**Solución**: Permite ventanas emergentes para tu sitio

---

## 📦 Deployment

### Azure Functions (Producción)

1. **Variables de Entorno**: 
   - NO subir `index.js` con credenciales
   - Usar Azure Key Vault o App Settings para almacenar credenciales

2. **Deploy**:
   ```bash
   func azure functionapp publish <NOMBRE_DE_TU_FUNCTION_APP>
   ```

3. **Verificar**:
   ```bash
   curl -X POST https://<tu-app>.azurewebsites.net/api/wallet/google/create \
     -H "Content-Type: application/json" \
     -d '{"folio":"TEST","nombre":"Test",...}'
   ```

### Configuración Recomendada para Producción

```javascript
// NO HACER ESTO EN PRODUCCIÓN:
const GOOGLE_WALLET_CONFIG = {
  private_key: "-----BEGIN PRIVATE KEY-----\n..."  // ❌
};

// HACER ESTO:
const GOOGLE_WALLET_CONFIG = {
  private_key: process.env.GOOGLE_WALLET_PRIVATE_KEY  // ✅
};
```

---

## 📚 Referencias

- [Google Wallet API - Generic Pass](https://developers.google.com/wallet/generic)
- [Google Pay & Wallet Console](https://pay.google.com/business/console)
- [Azure Functions Documentation](https://learn.microsoft.com/azure/azure-functions/)
- [jose Library (JWT Signing)](https://github.com/panva/jose)

---

## ✅ Estado Actual

- ✅ Backend creado y configurado
- ✅ Frontend simplificado (sin credenciales)
- ✅ Seguridad implementada (.gitignore)
- ✅ CORS configurado
- ✅ Dependencias instaladas
- ⏳ Pendiente: Deploy a producción
- ⏳ Pendiente: Configurar Azure Key Vault

---

**Última actualización**: Marzo 2026  
**Versión**: 2.0 (Arquitectura Backend Segura)
