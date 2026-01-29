import { apiRequest } from './apiClient';
import { apiRequestWithLoading } from './apiClientWithLoading';
import { API_ENDPOINTS } from './endpoints'; // <--- Importamos

export const catalogService = {
  getLocalidadByCP: async (cp: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.CATALOGOS.LOCALIDAD_POR_CP, {
      method: 'POST',
      body: { cp },
      loadingMessage: 'Buscando localidad...'
    });
  },

  getDocumentos: async () => {
    // Devuelve el catálogo de documentos: { data: { catDocumentos: [...] } }
    return await apiRequestWithLoading<any>(API_ENDPOINTS.CATALOGOS.CAT_DOCUMENTOS, {
      method: 'GET',
      loadingMessage: 'Cargando documentos...'
    });
  },

  getUsuarios: async () => {
    // Devuelve el catálogo de usuarios (roles): { data: { catUsuarios: [...] } }
    return await apiRequestWithLoading<any>(API_ENDPOINTS.CATALOGOS.CAT_USUARIOS, {
      method: 'GET',
      loadingMessage: 'Cargando catálogo...'
    });
  }
};
