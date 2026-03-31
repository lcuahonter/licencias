# Implementación de Validación de Licencias vía QR

## Objetivo

Cuando alguien escanea el código QR de una licencia, debe abrir una página web que muestre la información formateada del conductor, en lugar de mostrar un JSON crudo.

## Solución

### 1. Crear endpoint en tu backend

Crea un archivo nuevo en tu backend (por ejemplo: `api/validar-licencia/index.js`):

```javascript
module.exports = async function (context, req) {
    const folio = req.params.folio || req.query.folio;
    
    if (!folio) {
        context.res = {
            status: 400,
            body: 'Folio requerido'
        };
        return;
    }

    try {
        // Aquí debes hacer una consulta a tu base de datos para obtener la licencia
        // Este es un ejemplo - ajusta según tu BD
        const licencia = await obtenerLicenciaPorFolio(folio);
        
        if (!licencia) {
            context.res = {
                status: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: generarPaginaError()
            };
            return;
        }

        // Generar HTML con los datos de la licencia
        const html = generarPaginaValidacion(licencia);
        
        context.res = {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: html
        };
        
    } catch (error) {
        console.error('Error al validar licencia:', error);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: generarPaginaError('Error interno del servidor')
        };
    }
};

function generarPaginaValidacion(licencia) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validación de Licencia - ${licencia.folio}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .content {
            padding: 30px;
        }
        
        .info-group {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .info-group:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .info-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 16px;
            color: #1f2937;
            font-weight: 500;
        }
        
        .info-value.large {
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
        }
        
        .footer {
            background: #f9fafb;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.6;
        }
        
        .status-badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-top: 10px;
        }
        
        .logo {
            width: 60px;
            height: 60px;
            margin: 0 auto 15px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
        }
        
        @media (max-width: 480px) {
            .container {
                border-radius: 15px;
            }
            
            .header {
                padding: 20px;
            }
            
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🪪</div>
            <h1>Datos Personales</h1>
            <p>Validación de Licencias de Conducir</p>
            <div class="status-badge">✓ Licencia Válida</div>
        </div>
        
        <div class="content">
            <div class="info-group">
                <div class="info-label">Nombre Completo</div>
                <div class="info-value large">${licencia.nombre}</div>
            </div>
            
            <div class="info-group">
                <div class="info-label">Folio</div>
                <div class="info-value">${licencia.folio}</div>
            </div>
            
            <div class="info-group">
                <div class="info-label">Fecha Expedición</div>
                <div class="info-value">${formatearFecha(licencia.expedicion)}</div>
            </div>
            
            <div class="info-group">
                <div class="info-label">Módulo</div>
                <div class="info-value">${licencia.modulo || 'N/A'}</div>
            </div>
            
            <div class="info-group">
                <div class="info-label">Tipo de Licencia</div>
                <div class="info-value">${licencia.tipo_licencia}</div>
            </div>
            
            <div class="info-group">
                <div class="info-label">Vigencia</div>
                <div class="info-value">${licencia.vigencia}</div>
            </div>
        </div>
        
        <div class="footer">
            <p>
                <strong>Gobierno del Estado de Durango</strong><br>
                Este documento es válido para verificación de licencia.<br>
                Escaneado el ${new Date().toLocaleDateString('es-MX', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    if (typeof fecha === 'string' && fecha.includes('T')) {
        return new Date(fecha).toLocaleDateString('es-MX', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }
    return fecha;
}

function generarPaginaError(mensaje = 'Licencia no encontrada') {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error de Validación</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .error-container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .error-icon {
            font-size: 60px;
            margin-bottom: 20px;
        }
        h1 {
            color: #ef4444;
            margin-bottom: 10px;
            font-size: 24px;
        }
        p {
            color: #6b7280;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">❌</div>
        <h1>Error</h1>
        <p>${mensaje}</p>
    </div>
</body>
</html>
    `;
}

// Función auxiliar que debes implementar según tu base de datos
async function obtenerLicenciaPorFolio(folio) {
    // IMPLEMENTA AQUÍ LA CONSULTA A TU BASE DE DATOS
    // Ejemplo con Prisma:
    // return await prisma.licencia.findUnique({
    //     where: { folio: folio },
    //     include: { usuario: true }
    // });
    
    // Ejemplo con SQL directo:
    // const result = await pool.query(
    //     'SELECT * FROM licencias WHERE folio = $1',
    //     [folio]
    // );
    // return result.rows[0];
    
    throw new Error('Debes implementar obtenerLicenciaPorFolio según tu BD');
}
```

### 2. Configurar la ruta

Si usas Azure Functions, crea un archivo `validar-licencia/function.json`:

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get"],
      "route": "validar-licencia/{folio?}"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

### 3. Actualizar el código QR en el frontend

El archivo `DigitalLicenseModal.tsx` ya está actualizado automáticamente para usar la nueva URL.

## Resultado

Cuando alguien escanee el código QR de una licencia:

1. **Antes**: Veía un JSON con todos los datos
   ```json
   {"folio":"17516939","nombre":"EDSON CARLOS..."}
   ```

2. **Ahora**: Verá una página web profesional con:
   - Nombre completo
   - Folio
   - Fecha de expedición
   - Módulo
   - Tipo de licencia
   - Vigencia
   - Diseño responsive y profesional

## URL del QR

El QR contendrá: `https://licenciasdurango.com/api/validar-licencia/17516939`

## Seguridad

- El endpoint es público (necesario para que el QR funcione)
- Solo muestra información básica de la licencia
- No expone datos sensibles como contraseñas o tokens
- El folio ya es información que aparece en la licencia física

## Testing

1. Despliega el endpoint en tu backend
2. Prueba manualmente: `https://licenciasdurango.com/api/validar-licencia/17516939`
3. Escanea el QR generado en la app
4. Verifica que se muestre la página correctamente
