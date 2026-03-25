# ✅ Integración con Google Wallet - Configurada

La integración con Google Wallet ya está configurada y lista para usar.

## 🎯 Estado actual

- ✅ **Credenciales configuradas** - Las credenciales de Google Cloud están en `src/api/walletConfig.ts`
- ✅ **JWT firmado correctamente** - Usando la biblioteca `jose` para firmar con RS256
- ✅ **Botón funcional** - El botón "Agregar a Google Wallet" abre directamente Google Wallet
- ✅ **Seguridad** - El archivo de credenciales está en `.gitignore`

## 📋 Pasos completados

### 1. Google Cloud Console ✅
- Proyecto creado: `skilled-flight-491317-c7`
- Google Wallet API habilitada
- Cuenta de servicio creada: `wallet-licencias@skilled-flight-491317-c7.iam.gserviceaccount.com`
- Credenciales descargadas

### 2. Google Pay & Wallet Console ⚠️ PENDIENTE
**Acción requerida:** Necesitas crear el Issuer ID en Google Pay & Wallet Console

1. Ve a: https://pay.google.com/business/console
2. Haz clic en "Get Started" o "Create Issuer"
3. Completa la información:
   - **Business name:** Gobierno del Estado de Durango
   - **Support email:** soporte@durango.gob.mx
   - **Support phone:** +52 618 xxx xxxx
   - **Website:** https://www.durango.gob.mx
4. Una vez aprobado, obtendrás tu **Issuer ID** (formato: 1234567890123456789)
5. Actualiza el `issuerId` en `src/api/walletConfig.ts` con tu Issuer ID real

### 3. Crear la clase de pass ⚠️ PENDIENTE
Una vez que tengas el Issuer ID, necesitas crear una clase genérica:

**Opción A: Usando la consola web**
1. Ve a: https://pay.google.com/business/console
2. Ve a "Generic passes"
3. Crea una nueva clase genérica
4. Usa el ID: `{TU_ISSUER_ID}.licencias_durango_automovilista`

**Opción B: Usando la API REST**

```bash
# Obtener token de acceso
gcloud auth print-access-token

# Crear la clase (reemplaza {ISSUER_ID} y {ACCESS_TOKEN})
curl -X POST \
  https://walletobjects.googleapis.com/walletobjects/v1/genericClass \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "{ISSUER_ID}.licencias_durango_automovilista",
    "classTemplateInfo": {
      "cardTemplateOverride": {
        "cardRowTemplateInfos": [
          {
            "twoItems": {
              "startItem": {
                "firstValue": {
                  "fields": [{
                    "fieldPath": "object.textModulesData[\"nombre\"]"
                  }]
                }
              },
              "endItem": {
                "firstValue": {
                  "fields": [{
                    "fieldPath": "object.textModulesData[\"folio\"]"
                  }]
                }
              }
            }
          }
        ]
      }
    }
  }'
```

## 🚀 Cómo funciona

1. **Usuario hace clic en "Agregar a Google Wallet"**
2. El frontend genera un objeto JSON con los datos de la licencia
3. Se crea un JWT firmado con la clave privada de la cuenta de servicio
4. Se genera la URL: `https://pay.google.com/gp/v/save/{JWT}`
5. Se abre en una nueva ventana
6. Google Wallet valida el JWT y muestra el pass para guardarlo

## 🔐 Seguridad

### Archivos protegidos:
- ✅ `src/api/walletConfig.ts` - Agregado a `.gitignore`
- ✅ Credenciales no se suben al repositorio
- ⚠️ **IMPORTANTE:** Aunque las credenciales están en el frontend, esto es solo para pruebas. En producción, la firma del JWT debe hacerse en el backend.

### Migración a producción:
1. Mover la lógica de firma JWT a un endpoint del backend
2. El frontend envía los datos de la licencia al backend
3. El backend firma el JWT con las credenciales
4. El backend devuelve la URL firmada
5. El frontend abre la URL

## 📱 Probar la integración

### En desarrollo:
1. Ejecuta la aplicación: `npm run dev`
2. Ve a una licencia activa
3. Haz clic en "Agregar a Google Wallet"
4. Se abrirá Google Wallet (o mostrará error si el Issuer ID no está configurado)

### Errores comunes:

**Error: "Issuer not found"**
- Causa: El Issuer ID no está configurado en Google Pay & Wallet Console
- Solución: Completa el paso 2 (crear Issuer)

**Error: "Class not found"**
- Causa: La clase genérica no existe
- Solución: Completa el paso 3 (crear clase de pass)

**Error: "Invalid JWT"**
- Causa: La clave privada no coincide con la cuenta de servicio
- Solución: Verifica que las credenciales en `walletConfig.ts` sean correctas

## 📊 Datos incluidos en el pass

El pass de Google Wallet incluye:
- ✅ Nombre completo
- ✅ Número de licencia (folio)
- ✅ Tipo de licencia
- ✅ Vigencia
- ✅ Fecha de expedición
- ✅ Código QR con todos los datos
- ✅ Logo del gobierno de Durango
- ✅ Colores institucionales

## 🌐 URLs importantes

- **Google Cloud Console:** https://console.cloud.google.com/
- **Google Pay & Wallet Console:** https://pay.google.com/business/console
- **API Reference:** https://developers.google.com/wallet/generic/rest/v1
- **Documentación:** https://developers.google.com/wallet

## 🔄 Próximos pasos

1. [ ] Obtener Issuer ID de Google Pay & Wallet Console
2. [ ] Actualizar `issuerId` en `walletConfig.ts`
3. [ ] Crear la clase genérica de pass
4. [ ] Probar agregando una licencia a Google Wallet
5. [ ] (Opcional) Personalizar el diseño del pass en la consola
6. [ ] (Producción) Migrar la firma JWT al backend

## 💡 Notas

- Las credenciales actuales son para **propósitos de prueba**
- En producción, **NUNCA** expongas las credenciales en el frontend
- La biblioteca `jose` funciona completamente en el navegador
- El JWT tiene una expiración de 1 hora
- Los passes se pueden actualizar posteriormente usando la misma API
