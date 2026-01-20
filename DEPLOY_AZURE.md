# 🚀 Guía de Despliegue a Azure Static Web Apps

## 📋 Prerequisitos

1. Cuenta de Azure activa
2. Repositorio en GitHub (ya tienes: `pbhernandezn/licencias`)
3. Azure CLI instalado (opcional, pero recomendado)

---

## 🔧 Paso 1: Crear Azure Static Web App

### Opción A: Desde Azure Portal (Recomendado para primera vez)

1. **Ir al Portal de Azure**
   - https://portal.azure.com

2. **Crear Recurso**
   - Buscar "Static Web Apps"
   - Click en "Create"

3. **Configuración Básica**
   ```
   Subscription: [Tu suscripción]
   Resource Group: [Crear nuevo] rg-licencias-durango
   Name: licencias-durango-frontend
   Plan type: Free (para pruebas) o Standard (para producción)
   Region: Central US
   ```

4. **Configuración de Deployment**
   ```
   Source: GitHub
   Organization: pbhernandezn
   Repository: licencias
   Branch: MainLicencias
   Build Presets: React
   App location: /
   Output location: dist
   ```

5. **Click en "Review + Create"**

6. **Copiar el Deployment Token**
   - Después de crear, ve a "Manage deployment token"
   - Copia el token (lo necesitarás para GitHub)

---

## 🔑 Paso 2: Configurar GitHub Secrets

1. **Ir a tu repositorio en GitHub**
   - https://github.com/pbhernandezn/licencias

2. **Settings → Secrets and variables → Actions**

3. **Agregar estos Secrets:**

   **CRÍTICO - Token de Azure:**
   ```
   Name: AZURE_STATIC_WEB_APPS_API_TOKEN
   Value: [El token que copiaste de Azure]
   ```

   **Variables de Entorno del API:**
   ```
   Name: VITE_API_URL
   Value: http://172.174.80.112
   (O la URL de tu backend en AKS)
   ```

   **Opcional - Endpoints personalizados:**
   Solo si los cambiaste en tu `.env`:
   ```
   VITE_AUTH_LOGIN
   VITE_USUARIOS_CREATE
   VITE_USUARIOS_GET_BY_ID
   ... (etc, según necesites)
   ```

---

## 📤 Paso 3: Subir Archivos de Configuración

Los archivos ya están creados en tu proyecto:

1. ✅ `staticwebapp.config.json` - Configuración de routing
2. ✅ `.github/workflows/azure-static-web-apps.yml` - CI/CD automático

**Ahora súbelos a GitHub:**

```bash
# En tu terminal
cd /Users/luzcuahonte/Documents/Durango/licencias

# Agregar archivos nuevos
git add staticwebapp.config.json
git add .github/workflows/azure-static-web-apps.yml
git add DEPLOY_AZURE.md

# Commit
git commit -m "feat: Agregar configuración para Azure Static Web Apps"

# Push al repositorio
git push origin MainLicencias
```

---

## ✨ Paso 4: Deploy Automático

1. **GitHub Actions se ejecutará automáticamente** al hacer push
2. Ve a: https://github.com/pbhernandezn/licencias/actions
3. Verás el workflow "Azure Static Web Apps CI/CD" ejecutándose
4. Espera 3-5 minutos para que compile y despliegue

---

## 🌐 Paso 5: Verificar el Despliegue

1. **En Azure Portal**
   - Ve a tu Static Web App
   - En "Overview" verás la URL: `https://[nombre-aleatorio].azurestaticapps.net`

2. **Probar la aplicación**
   - Abre la URL en tu navegador
   - Verifica que todo funcione correctamente
   - Prueba login y funcionalidades principales

---

## 🔧 Configuración Adicional (Opcional)

### Agregar Dominio Personalizado

1. **En Azure Portal → Tu Static Web App**
2. **Custom domains → Add**
3. **Agregar tu dominio:**
   ```
   licencias.durango.gob.mx
   ```
4. **Configurar DNS según instrucciones de Azure**

### Habilitar CORS en el Backend (AKS)

Tu backend debe permitir requests desde:
```
https://[tu-app].azurestaticapps.net
```

En tu backend (AKS), agrega a CORS:
```javascript
// Ejemplo para Express
app.use(cors({
  origin: [
    'https://[tu-app].azurestaticapps.net',
    'http://localhost:5173' // Para desarrollo
  ]
}));
```

---

## 🐛 Troubleshooting

### Problema: El build falla

**Solución:**
1. Verifica que los secrets estén correctos en GitHub
2. Revisa los logs en GitHub Actions
3. Asegúrate que `npm run build` funciona localmente

### Problema: La app se despliega pero da 404

**Solución:**
- Verifica que `staticwebapp.config.json` esté en la raíz del proyecto
- Revisa que `output_location: "dist"` sea correcto

### Problema: Error de CORS

**Solución:**
- Configura CORS en tu backend en AKS
- Agrega la URL de Azure Static Web App a origins permitidos

### Problema: Variables de entorno no funcionan

**Solución:**
1. Verifica que los secrets estén en GitHub
2. Los nombres deben empezar con `VITE_`
3. Recuerda que se inyectan en tiempo de build, no runtime

---

## 📊 Monitoreo (Recomendado para Producción)

### Agregar Application Insights

1. **En Azure Portal**
2. **Create Resource → Application Insights**
3. **Vincular con tu Static Web App**
4. **Configurar en tu código:**

```typescript
// src/utils/appInsights.ts
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: import.meta.env.VITE_APPINSIGHTS_KEY
  }
});

appInsights.loadAppInsights();
export default appInsights;
```

---

## 🔄 Actualizar la Aplicación

**Es automático:**
1. Haces cambios en tu código local
2. `git commit -am "feat: nuevo cambio"`
3. `git push origin MainLicencias`
4. GitHub Actions despliega automáticamente
5. En 3-5 minutos los cambios están en producción

---

## 💰 Costos Estimados

### Tier Free (Para pruebas)
- Costo: $0/mes
- 100 GB bandwidth/mes
- Perfecto para desarrollo y pruebas

### Tier Standard (Para producción)
- Costo: ~$9 USD/mes
- 100 GB bandwidth incluido
- Custom domains
- SLA 99.95%

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en GitHub Actions
2. Consulta esta guía
3. Revisa los logs en Azure Portal → Static Web App → Log Stream
4. Contacta al equipo de DevOps

---

## ✅ Checklist de Despliegue

- [ ] Azure Static Web App creada
- [ ] Token copiado de Azure
- [ ] Secrets configurados en GitHub
- [ ] Archivos de configuración subidos
- [ ] Push realizado a MainLicencias
- [ ] GitHub Actions ejecutándose
- [ ] Aplicación accesible en Azure URL
- [ ] Backend configurado con CORS
- [ ] Variables de entorno funcionando
- [ ] Tests realizados

---

**Última actualización:** 19 de enero de 2026
**Próximo paso:** Cuando estés listo para producción, agregar Azure Front Door
