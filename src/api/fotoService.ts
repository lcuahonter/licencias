import { apiRequest, apiBlobRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import { buildApiUrl } from './urlBuilder';

export const fotoService = {
  subirFotoRostro: async (payload: {
    idsolicitud: number;
    archivoBase64: string;
    nombreoriginal: string;
    formato: string;
  }, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.FOTOS_ROSTRO.SUBIR, {
      method: 'POST',
      body: payload,
      token
    });
  },

  descargarFotoRostro: async (idsolicitud: number, token?: string): Promise<string | null> => {
    try {
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
    }
  },

  verificarFotoExiste: async (idsolicitud: number, token?: string): Promise<boolean> => {
    try {
      const response = await apiRequest<any>(`${API_ENDPOINTS.FOTOS_ROSTRO.URL}/${idsolicitud}`, {
        method: 'GET',
        token
      });

      // Si responde exitosamente (200), asumimos que la foto existe
      return true;
    } catch (error: any) {
      // Si retorna 404 o cualquier error, la foto no existe
      return false;
    }
  }
};
