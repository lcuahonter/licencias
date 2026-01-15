import { apiRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints';

export const revisionService = {
  createRevision: async (payload: {
    idrevision: number;
    documentos: Array<{
      iddocumento: number;
      comentarios: string;
      idestatus: number;
    }>;
  }, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.CREATE, {
      method: 'POST',
      body: payload,
      token
    });
  }
};
