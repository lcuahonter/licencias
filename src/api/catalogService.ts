import { apiRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints'; // <--- Importamos

export const catalogService = {
  getLocalidadByCP: async (cp: string) => {
    return await apiRequest<any>(API_ENDPOINTS.CATALOGOS.LOCALIDAD_POR_CP, {
      method: 'POST',
      body: { cp }
    });
  },

  getDocumentos: async () => {
    // Devuelve el catálogo de documentos: { data: { catDocumentos: [...] } }
    return await apiRequest<any>(API_ENDPOINTS.CATALOGOS.CAT_DOCUMENTOS, {
      method: 'GET'
    });
  },

  getUsuarios: async () => {
    // Devuelve el catálogo de usuarios (roles): { data: { catUsuarios: [...] } }
    return await apiRequest<any>(API_ENDPOINTS.CATALOGOS.CAT_USUARIOS, {
      method: 'GET'
    });
  }
};