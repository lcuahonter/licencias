import { apiRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints';

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
  }
};
