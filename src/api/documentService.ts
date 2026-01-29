import { apiRequest, apiBlobRequest } from './apiClient';
import { apiRequestWithLoading, apiBlobRequestWithLoading } from './apiClientWithLoading';
import { API_ENDPOINTS } from './endpoints';

export const documentService = {
  createDocumento: async (payload: any, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.DOCUMENTOS.CREATE, {
      method: 'POST',
      body: payload,
      token,
      loadingMessage: 'Subiendo documento...'
    });
  },

  getByUser: async (idusuario: number, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.DOCUMENTOS.BY_USER, {
      method: 'POST',
      body: { idusuario },
      token,
      loadingMessage: 'Cargando documentos...'
    });
  },

  getBySolicitud: async (idsolicitud: number, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.DOCUMENTOS.BY_SOLICITUD, {
      method: 'POST',
      body: { idsolicitud },
      token,
      loadingMessage: 'Cargando documentos...'
    });
  },

  downloadDocumento: async (id: number, token?: string): Promise<{ blob: Blob; filename?: string; contentType?: string }> => {
    return await apiBlobRequestWithLoading(API_ENDPOINTS.DOCUMENTOS.DOWNLOAD, {
      method: 'POST',
      body: { id },
      token,
      loadingMessage: 'Descargando documento...'
    });
  },

  updateDocumento: async (payload: any, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.DOCUMENTOS.UPDATE, {
      method: 'POST',
      body: payload,
      token,
      loadingMessage: 'Actualizando documento...'
    });
  }
};
