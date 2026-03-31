# Configuración de Google Wallet y Apple Wallet

Este documento describe cómo configurar la integración con Google Wallet y Apple Wallet para agregar licencias digitales.

## Funcionalidades Implementadas

### Frontend
- Detección automática de plataforma (iOS, Android, Web)
- Botones contextuales para agregar a Google Wallet (Android) o Apple Wallet (iOS)
- Interfaz de usuario integrada en el modal de licencia digital
- Manejo de errores y estados de carga

### Backend
- Azure Functions para generar passes de Google Wallet
- Azure Functions para generar passes de Apple Wallet
- API endpoints `/api/wallet/google/create` y `/api/wallet/apple/create`

## Configuración de Google Wallet

### 1. Crear cuenta de Google Cloud y habilitar Google Wallet API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la "Google Wallet API"
4. Ve a "IAM & Admin" > "Service Accounts"
5. Crea una nueva cuenta de servicio
6. Descarga la clave JSON de la cuenta de servicio

### 2. Registrar tu emisor de passes

1. Ve a [Google Pay & Wallet Console](https://pay.google.com/business/console)
2. Crea un emisor de passes (Issuer)
3. Anota tu "Issuer ID"

### 3. Configurar variables de entorno en Azure

En tu Azure Function App, configura las siguientes variables de entorno:

```
GOOGLE_WALLET_ISSUER_ID=tu_issuer_id
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=tu-cuenta-servicio@tu-proyecto.iam.gserviceaccount.com
GOOGLE_WALLET_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA\n-----END PRIVATE KEY-----
```

**Nota:** La clave privada debe incluir los saltos de línea como `\n`

### 4. Crear una clase de pass genérico

Antes de poder crear passes, necesitas crear una clase genérica:

```javascript
// Esto se puede hacer mediante la API de Google Wallet o la consola
const genericClass = {
  id: `${ISSUER_ID}.licencias_durango_class`,
  classTemplateInfo: {
    cardTemplateOverride: {
      cardRowTemplateInfos: [
        {
          twoItems: {
            startItem: {
              firstValue: {
                fields: [{
                  fieldPath: "object.textModulesData['nombre']"
                }]
              }
            },
            endItem: {
              firstValue: {
                fields: [{
                  fieldPath: "object.textModulesData['folio']"
                }]
              }
            }
          }
        }
      ]
    }
  }
};
```

## Configuración de Apple Wallet

### 1. Obtener certificados de Apple Developer

1. Ve a [Apple Developer Portal](https://developer.apple.com/)
2. Ve a "Certificates, IDs & Profiles"
3. Crea un nuevo "Pass Type ID" (ej: `pass.mx.gob.durango.licencias`)
4. Crea un certificado de tipo "Pass Type ID Certificate"
5. Descarga el certificado (.cer) y conviértelo a formato PEM:

```bash
# Convertir certificado .cer a .pem
openssl x509 -inform DER -in pass.cer -out pass.pem

# Exportar clave privada desde el Keychain (Mac) o crear nueva
openssl pkcs12 -in Certificates.p12 -out key.pem -nodes -nocerts
```

6. Descarga el certificado intermedio WWDR de Apple:
   - [Apple WWDR Certificate](https://www.apple.com/certificateauthority/)

### 2. Configurar variables de entorno en Azure

```
APPLE_PASS_TYPE_ID=pass.mx.gob.durango.licencias
APPLE_TEAM_ID=TU_TEAM_ID
APPLE_CERTIFICATE=-----BEGIN CERTIFICATE-----\nTU_CERTIFICADO\n-----END CERTIFICATE-----
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA\n-----END PRIVATE KEY-----
APPLE_WWDR_CERTIFICATE=-----BEGIN CERTIFICATE-----\nCERTIFICADO_WWDR\n-----END CERTIFICATE-----
```

### 3. Recursos necesarios para el pass

Coloca estos archivos en la carpeta del pass:

- `logo.png` - Logo (160x50 px @1x, 320x100 px @2x)
- `icon.png` - Icono (58x58 px @1x, 116x116 px @2x)
- `logo@2x.png` - Logo en alta resolución
- `icon@2x.png` - Icono en alta resolución

## Estructura del archivo .pkpass

Un archivo `.pkpass` es un archivo ZIP con la siguiente estructura:

```
licencia.pkpass/
├── pass.json           # Datos del pass
├── manifest.json       # Hashes SHA1 de todos los archivos
├── signature           # Firma PKCS7 del manifest
├── logo.png
├── logo@2x.png
├── icon.png
└── icon@2x.png
```

## Flujo de usuario

### Para Android (Google Wallet)

1. Usuario toca el botón "Agregar a Google Wallet"
2. El frontend llama a `/api/wallet/google/create` con los datos de la licencia
3. El backend genera un JWT token firmado con las credenciales de Google
4. El backend devuelve una URL `https://pay.google.com/gp/v/save/{token}`
5. El frontend abre esta URL en una nueva ventana
6. Google Wallet se abre automáticamente y muestra el pass para agregar

### Para iOS (Apple Wallet)

1. Usuario toca el botón "Agregar a Apple Wallet"
2. El frontend llama a `/api/wallet/apple/create` con los datos de la licencia
3. El backend genera un archivo `.pkpass` con toda la estructura requerida
4. El backend devuelve el archivo como blob
5. El frontend descarga el archivo `.pkpass`
6. iOS detecta automáticamente el archivo y ofrece agregarlo a Apple Wallet

## Datos incluidos en el pass

Ambos passes (Google y Apple) incluyen:

- **Frente:**
  - Nombre completo
  - Número de licencia
  - Tipo de licencia
  - Vigencia
  - Fecha de expedición

- **Código QR:**
  - JSON con todos los datos de la licencia
  - Folio, nombre, RFC, tipo, vigencia, etc.

- **Reverso/Detalles:**
  - Tipo de sangre
  - Donador de órganos
  - Fecha de nacimiento
  - Sexo
  - RFC
  - Teléfono de emergencia

## Pruebas

### Probar Google Wallet

1. Usa un dispositivo Android o emulador
2. Asegúrate de tener instalada la app de Google Wallet
3. Abre la aplicación de licencias
4. Ve a una licencia activa y toca "Agregar a Google Wallet"

### Probar Apple Wallet

1. Usa un dispositivo iOS (iPhone/iPad) - no funciona en simulador
2. Abre la aplicación de licencias
3. Ve a una licencia activa y toca "Agregar a Apple Wallet"
4. Descarga el archivo .pkpass
5. iOS debería detectarlo automáticamente

## Limitaciones actuales

### Google Wallet
- Requiere configuración completa de Google Cloud
- Necesita una cuenta de servicio con permisos adecuados
- Solo funciona en dispositivos Android con Google Play Services

### Apple Wallet
- Requiere certificados de Apple Developer (cuenta de pago $99/año)
- Los archivos .pkpass deben estar firmados correctamente
- Solo funciona en dispositivos iOS físicos (no en simulador)
- Requiere servidor web con HTTPS para distribución automática

## Estado de implementación

✅ Frontend completamente implementado
✅ Detección de plataforma
✅ Botones contextuales
✅ Servicios de API
✅ Funciones de Azure (estructura básica)
⚠️ Google Wallet: Requiere credenciales de Google Cloud
⚠️ Apple Wallet: Requiere certificados de Apple Developer

## Próximos pasos

1. **Configurar Google Cloud:**
   - Crear proyecto en Google Cloud
   - Habilitar Google Wallet API
   - Crear cuenta de servicio
   - Configurar variables de entorno

2. **Configurar Apple Developer:**
   - Crear Pass Type ID
   - Generar certificados
   - Convertir certificados a formato PEM
   - Configurar variables de entorno

3. **Crear recursos visuales:**
   - Logo de Durango para passes
   - Iconos en diferentes resoluciones
   - Imágenes de fondo (opcional)

4. **Pruebas:**
   - Probar en dispositivos Android reales
   - Probar en dispositivos iOS reales
   - Verificar que el código QR funcione correctamente
   - Validar que todos los datos se muestren correctamente

## Recursos adicionales

- [Google Wallet API Documentation](https://developers.google.com/wallet)
- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
- [PassKit Programming Guide](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/index.html)
- [Google Wallet Pass Class Reference](https://developers.google.com/wallet/generic/rest/v1/genericclass)

## Soporte

Para problemas o preguntas sobre la configuración:
1. Revisa los logs de Azure Functions
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que los certificados estén en formato correcto
4. Consulta la documentación oficial de Google Wallet y Apple Wallet
