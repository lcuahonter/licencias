# Configuración de Producción para Capacitor

Este archivo debe ser actualizado antes de compilar para producción (Android/iOS).

## Configuración Actual

```typescript
appId: 'com.example.app'
appName: 'licencia-digital-mx'
```

## Para Producción

Actualizar `capacitor.config.ts` con:

```typescript
appId: 'mx.gob.durango.licencias'  // O el ID oficial del paquete
appName: 'Licencias Durango'       // Nombre oficial de la app
```

## Notas Importantes

- El `appId` debe coincidir con el registro en App Store y Google Play
- No cambiar el `appId` después de publicar la app (causaría problemas de actualización)
- El `appName` es el nombre que aparecerá en el dispositivo del usuario
