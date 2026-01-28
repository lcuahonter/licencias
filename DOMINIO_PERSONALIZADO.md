# Configuración de Dominio Personalizado

## Dominio: licenciasdurango.com

### URLs del Sistema

- **Frontend (Producción)**: https://app.licenciasdurango.com
- **Frontend (Azure)**: https://wonderful-plant-07cf4a40f.4.azurestaticapps.net
- **Backend API**: https://licenciasdurango.com

### Pasos de Configuración

#### 1. Configurar DNS en Azure DNS o tu proveedor DNS

**Para dominio root (licenciasdurango.com):**
```
Tipo: A
Nombre: @
Valor: [IP del Static Web App - obténla desde el portal]
TTL: 3600
```

**Para subdominio www:**
```
Tipo: CNAME
Nombre: www
Valor: wonderful-plant-07cf4a40f.4.azurestaticapps.net
TTL: 3600
```

**Registro de validación (requerido por Azure):**
```
Tipo: TXT
Nombre: _dnsauth
Valor: [Token de validación proporcionado por Azure Static Web Apps]
TTL: 3600
```

#### 2. Agregar el dominio en Azure Static Web Apps

1. Ve a Azure Portal → Tu Static Web App
2. Configuración → Custom domains
3. Add → On Azure DNS / On other DNS
4. Ingresa tu dominio: `licenciasdurango.com`
5. Valida la propiedad del dominio
6. Espera que se aprovisione el certificado SSL (puede tardar hasta 24 horas)

#### 3. Verificar la configuración

Una vez configurado, verifica que:
- El dominio resuelve correctamente: `nslookup licenciasdurango.com`
- El certificado SSL está activo: https://licenciasdurango.com
- La aplicación carga correctamente

#### 4. Configurar redirección HTTP → HTTPS

Azure Static Web Apps automáticamente redirige HTTP a HTTPS.

#### 5. Actualizar enlaces externos

Si tienes enlaces en otros lugares (documentación, emails, etc.), actualízalos al nuevo dominio.

### Tiempo de propagación DNS

- Los cambios DNS pueden tardar entre 15 minutos y 48 horas en propagarse globalmente
- El certificado SSL se aprovisiona automáticamente pero puede tardar hasta 24 horas

### Troubleshooting

**DNS no resuelve:**
- Verifica los registros con: `dig licenciasdurango.com`
- Espera tiempo de propagación

**Certificado SSL no funciona:**
- Verifica que el registro TXT de validación esté correcto
- Espera hasta 24 horas para el aprovisionamiento

**Error 404:**
- Verifica que el dominio esté apuntando al hostname correcto
- Revisa la configuración en Azure Static Web Apps
