// Helper para construir URLs del API
// Maneja tanto acceso directo como a través del proxy de Azure Static Web Apps

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://172.174.80.112';
const IS_PROXY = API_BASE_URL.startsWith('/api/proxy');

/**
 * Construye la URL completa para una petición al API
 * @param path - Path del endpoint (ej: '/auth/login')
 * @returns URL completa para hacer la petición
 */
export function buildApiUrl(path: string): string {
  // Si estamos usando el proxy de Azure Static Web Apps
  if (IS_PROXY) {
    // El proxy espera el path como query parameter
    return `${API_BASE_URL}?path=${encodeURIComponent(path)}`;
  }
  
  // Acceso directo al backend
  return `${API_BASE_URL}${path}`;
}

/**
 * Obtiene la URL base del API
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Indica si estamos usando el proxy
 */
export function isUsingProxy(): boolean {
  return IS_PROXY;
}
