import { apiRequest, apiBlobRequest } from './apiClient';
import { apiRequestWithLoading } from './apiClientWithLoading';
import { API_ENDPOINTS } from './endpoints';
import { buildApiUrl } from './urlBuilder';

let showLoadingFn: ((message: string) => void) | null = null;
let hideLoadingFn: (() => void) | null = null;

// Función para inyectar las funciones del contexto
export const setFotoLoadingFunctions = (show: (message: string) => void, hide: () => void) => {
  showLoadingFn = show;
  hideLoadingFn = hide;
};

export const fotoService = {
  subirFotoRostro: async (payload: {
    idsolicitud: number;
    archivoBase64: string;
    nombreoriginal: string;
    formato: string;
  }, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.FOTOS_ROSTRO.SUBIR, {
      method: 'POST',
      body: payload,
      token,
      loadingMessage: 'Subiendo foto...'
    });
  },

  descargarFotoRostro: async (idsolicitud: number, token?: string): Promise<string | null> => {
    try {
      if (showLoadingFn) showLoadingFn('Descargando foto...');
      
      const url = buildApiUrl(`${API_ENDPOINTS.FOTOS_ROSTRO.DESCARGAR}/${idsolicitud}`);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Error al descargar la foto');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
    } catch (error) {
      return null;
    } finally {
      if (hideLoadingFn) hideLoadingFn();
    }
  },

  verificarFotoExiste: async (idsolicitud: number, token?: string): Promise<boolean> => {
    try {
      const response = await apiRequestWithLoading<any>(`${API_ENDPOINTS.FOTOS_ROSTRO.URL}/${idsolicitud}`, {
        method: 'GET',
        token,
        loadingMessage: 'Verificando foto...'
      });

      // Si responde exitosamente (200), asumimos que la foto existe
      return true;
    } catch (error: any) {
      // Si retorna 404 o cualquier error, la foto no existe
      return false;
    }
  }
};
