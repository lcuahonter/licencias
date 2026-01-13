import { apiRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints'; // <--- Importamos

export const catalogService = {
  getLocalidadByCP: async (cp: string) => {
    return await apiRequest<any>(API_ENDPOINTS.CATALOGOS.LOCALIDAD_POR_CP, {
      method: 'POST',
      body: { cp }
    });
  }
};