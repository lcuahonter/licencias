import { apiRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints';

export const documentService = {
  createDocumento: async (payload: any, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.DOCUMENTOS.CREATE, {
      method: 'POST',
      body: payload,
      token
    });
  }
};
