# Integración de intl-tel-input

## ¿Qué se hizo?

Se reemplazó el selector de teléfono manual (con select y tabla de países) por la librería **intl-tel-input**, que proporciona:

✅ Autocompletado de prefijos de país con banderas  
✅ Validación internacional de números telefónicos  
✅ Interfaz visual más profesionald y moderna  
✅ Soporte para más de 250 países  
✅ Entrada automática de formato correcto  

## Instalación

La librería ya fue instalada. Si necesitas instalarla en otro proyecto:

```bash
npm install intl-tel-input
```

## Implementación en CompleteProfileScreen.tsx

El componente `PhoneInput` fue actualizado automáticamente para usar intl-tel-input. 

### Características del nuevo componente:

1. **Selector de país automático** - Se muestra una bandera y el prefijo del país
2. **Entrada unificada** - El usuario escribe el número completo (prefijo + número)
3. **Extracción automática** - El componente separa automáticamente:
   - `ladaValue`: El código de país (ej: +52)
   - `phoneValue`: Solo los dígitos del número (ej: 6141234567)

4. **Países preferidos** - Muestra México, USA y España al inicio por defecto
5. **Soporte de utilidades** - Usa CDN para validar números internacionalmente

### Props del componente

```tsx
<PhoneInput 
  ladaValue={form.phoneLada}           // Código de país actual (+52)
  phoneValue={form.phone}             // Número telefónico (sin prefijo)
  onLadaChange={value => {...}}       // Actualiza el código de país
  onPhoneChange={value => {...}}      // Actualiza el número
  error={errors.phone}                // Mensaje de error
  innerRef={inputRefs.phone}          // Ref para acceso directo
/>
```

## Personalización

Para cambiar los países preferidos, edita la línea en `CompleteProfileScreen.tsx`:

```tsx
preferredCountries: ["mx", "us", "es"],  // Cambia esto
```

Los códigos de país usan formato ISO 3166-1 alpha-2 (ej: mx, us, es, ar, br, etc.)

## Estilos Dark Mode

El componente incluye soporte automático para dark mode. Los estilos están incluidos en el CSS inyectado.

## Validación

Para validar números telefónicos internacionalmente:

```tsx
if (itiRef.current?.isValidNumber()) {
  // Número válido
  const fullNumber = itiRef.current?.getNumber();
}
```

## Archivos modificados

- ✏️ **screens/CompleteProfileScreen.tsx** - Actualizado con nuevo componente
- 📦 **package.json** - Dependencia intl-tel-input agregada

## Próximos pasos (opcional)

Si deseas más funcionalidades:

1. **Validación estricta**: Usa `itiRef.current?.isValidNumber()` en validación
2. **Autoformato**: La librería formatea automáticamente mientras escribes
3. **Información del país**: Accede a datos del país con `itiRef.current?.getSelectedCountryData()`

Esta librería es completamente compatible con tu actual validación y estado del formulario.
