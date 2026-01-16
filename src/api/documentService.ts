import { apiRequest, apiBlobRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints';

export const documentService = {
  createDocumento: async (payload: any, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.DOCUMENTOS.CREATE, {
      method: 'POST',
      body: payload,
      token
    });
  },

  getByUser: async (idusuario: number, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.DOCUMENTOS.BY_USER, {
      method: 'POST',
      body: { idusuario },
      token
    });
  },

  downloadDocumento: async (id: number, token?: string): Promise<{ blob: Blob; filename?: string; contentType?: string }> => {
    return await apiBlobRequest(API_ENDPOINTS.DOCUMENTOS.DOWNLOAD, {
      method: 'POST',
      body: { id },
      token
    });
  },

  updateDocumento: async (payload: any, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.DOCUMENTOS.UPDATE, {
      method: 'POST',
      body: payload,
      token
    });
  }
};
