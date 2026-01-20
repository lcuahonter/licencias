# 📡 Configuración de Endpoints del API

## 🎯 Descripción

Todos los endpoints del API ahora son **configurables** desde el archivo `.env`, lo que permite cambiar fácilmente entre diferentes versiones del backend o servidores sin modificar el código fuente.

---

## ⚙️ Configuración Básica

### Paso 1: Copiar el archivo de ejemplo

```bash
cp .env.example .env
```

### Paso 2: Editar el archivo `.env`

Abre el archivo `.env` y ajusta la URL base del servidor:

```bash
# URL base del servidor
VITE_API_URL=http://172.174.80.112

# Para producción:
# VITE_API_URL=https://api.licencias.durango.gob.mx
```

### Paso 3: Reiniciar el servidor de desarrollo

```bash
npm run dev
```

---

## 📋 Variables de Entorno Disponibles

### URL Base
- **`VITE_API_URL`** - URL principal del servidor backend (sin barra al final)

### Autenticación
- **`VITE_AUTH_LOGIN`** - Endpoint de login

### Usuarios
- **`VITE_USUARIOS_CREATE`** - Crear usuario
- **`VITE_USUARIOS_GET_BY_ID`** - Obtener usuario por ID
- **`VITE_USUARIOS_UPDATE`** - Actualizar usuario

### Catálogos
- **`VITE_CATALOGOS_LOCALIDAD_POR_CP`** - Obtener localidad por código postal
- **`VITE_CATALOGOS_CAT_DOCUMENTOS`** - Catálogo de tipos de documentos
- **`VITE_CATALOGOS_CAT_USUARIOS`** - Catálogo de usuarios

### Documentos
- **`VITE_DOCUMENTOS_CREATE`** - Crear documento
- **`VITE_DOCUMENTOS_BY_USER`** - Documentos por usuario
- **`VITE_DOCUMENTOS_BY_SOLICITUD`** - Documentos por solicitud
- **`VITE_DOCUMENTOS_DOWNLOAD`** - Descargar documento
- **`VITE_DOCUMENTOS_UPDATE`** - Actualizar documento

### Solicitudes
- **`VITE_SOLICITUDES_CREATE`** - Crear solicitud
- **`VITE_SOLICITUDES_BY_USER`** - Solicitudes por usuario
- **`VITE_SOLICITUDES_GET_ALL`** - Obtener todas las solicitudes
- **`VITE_SOLICITUDES_BY_ESTATUS`** - Solicitudes por estatus
- **`VITE_SOLICITUDES_UPDATE`** - Actualizar solicitud

### Revisiones
- **`VITE_REVISION_CREATE`** - Crear revisión
- **`VITE_REVISION_BY_SOLICITUD`** - Revisiones por solicitud
- **`VITE_REVISION_BY_REVISOR`** - Revisiones por revisor
- **`VITE_REVISION_CREATE_DOCUMENTOS`** - Crear documentos de revisión
- **`VITE_REVISION_UPDATE_DOCUMENTO`** - Actualizar documento de revisión
- **`VITE_REVISION_DOCUMENTOS_BY_REVISION`** - Documentos por revisión
- **`VITE_REVISION_DOCUMENTOS_BY_DOCUMENTO`** - Documentos por documento

### Exámenes
- **`VITE_EXAM_OBTENER_PREGUNTAS`** - Obtener preguntas del examen
- **`VITE_EXAM_ENVIAR_RESPUESTAS`** - Enviar respuestas del examen
- **`VITE_EXAM_VERIFICAR_RESULTADO`** - Verificar resultado del examen
- **`VITE_EXAM_VERIFICAR_APROBACION`** - Verificar aprobación del examen
- **`VITE_EXAM_OBTENER_POR_SOLICITUD`** - Obtener examen por solicitud

---

## 🔄 Casos de Uso

### Cambiar entre Desarrollo y Producción

**Desarrollo:**
```bash
VITE_API_URL=http://172.174.80.112
```

**Producción:**
```bash
VITE_API_URL=https://api.licencias.durango.gob.mx
```

### Usar una versión diferente del API

Si el backend tiene una nueva versión con endpoints diferentes:

```bash
# Cambiar solo los endpoints que sean diferentes
VITE_USUARIOS_CREATE=/api/v2/usuarios/createUsuario
VITE_USUARIOS_UPDATE=/api/v2/usuarios/updateUsuario
```

### Testing con servidor local

```bash
VITE_API_URL=http://localhost:3000
```

### Usar un servidor de staging

```bash
VITE_API_URL=https://staging-api.licencias.durango.gob.mx
```

---

## 🛡️ Valores por Defecto

Si no se especifica una variable de entorno, el sistema usará valores por defecto:

```typescript
// Ejemplo en endpoints.ts
CREATE: import.meta.env.VITE_USUARIOS_CREATE || '/api/usuarios/createUsuario'
```

Esto asegura que la aplicación siempre funcione, incluso si faltan algunas variables.

---

## ⚠️ Notas Importantes

1. **Reiniciar el servidor:** Los cambios en `.env` requieren reiniciar el servidor de desarrollo (`npm run dev`)

2. **No subir al repositorio:** El archivo `.env` está en `.gitignore` y **NO** debe subirse al repositorio

3. **Usar `.env.example`:** Este archivo SÍ debe estar en el repositorio como referencia

4. **Prefijo `VITE_`:** Todas las variables deben empezar con `VITE_` para que Vite las exponga al frontend

5. **Build de producción:** Al compilar con `npm run build`, las variables se incluyen en el bundle con los valores actuales del `.env`

---

## 🚀 Ejemplos de Configuración

### Archivo `.env` para Desarrollo Local

```bash
VITE_API_URL=http://localhost:3000
VITE_AUTH_LOGIN=/auth/login
VITE_USUARIOS_CREATE=/api/usuarios/createUsuario
# ... resto de endpoints con valores por defecto
```

### Archivo `.env` para Producción

```bash
VITE_API_URL=https://api.licencias.durango.gob.mx
# Los endpoints usan los valores por defecto
```

### Archivo `.env` para Testing

```bash
VITE_API_URL=http://test-server.local:8080
VITE_AUTH_LOGIN=/v1/auth/login
VITE_USUARIOS_CREATE=/v1/api/usuarios/create
# Endpoints personalizados para testing
```

---

## 🔧 Troubleshooting

### Problema: Los cambios no se reflejan

**Solución:** Reinicia el servidor de desarrollo:
```bash
# Detener el servidor (Ctrl+C)
npm run dev
```

### Problema: Variable no definida

**Solución:** Verifica que la variable empiece con `VITE_`:
```bash
# ❌ Incorrecto
API_URL=http://example.com

# ✅ Correcto
VITE_API_URL=http://example.com
```

### Problema: Error 404 en endpoints

**Solución:** Verifica que las rutas no tengan doble barra:
```bash
# ❌ Incorrecto (genera: http://api.com//usuarios)
VITE_API_URL=http://api.com/
VITE_USUARIOS_CREATE=/usuarios

# ✅ Correcto
VITE_API_URL=http://api.com
VITE_USUARIOS_CREATE=/usuarios
```

---

## 📞 Soporte

Si tienes dudas sobre la configuración de endpoints:
1. Revisa el archivo `.env.example` con la configuración por defecto
2. Consulta este documento
3. Verifica que el backend esté funcionando correctamente
4. Contacta al equipo de desarrollo del backend para confirmar las rutas

---

**Última actualización:** 19 de enero de 2026
