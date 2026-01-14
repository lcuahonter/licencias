import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'licencia-digital-mx',
  webDir: 'dist',
  server: {
    androidScheme: 'https' // Recomendado para evitar errores de red en Android
  },
  plugins: {
    StatusBar: {
      // "LIGHT" significa que el fondo es claro, por lo tanto pone los ICONOS OSCUROS (Negros)
      style: 'LIGHT', 
      
      // Color de fondo blanco sólido
      backgroundColor: '#FFFFFF', 
      
      // FALSE = La app empieza DEBAJO de la barra (no se encima)
      overlaysWebView: false, 
    },
  },
};

export default config;