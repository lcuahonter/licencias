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
  },

  revisionesBySolicitud: async (idsolicitud: number, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.BY_SOLICITUD, {
      method: 'POST',
      body: { idsolicitud },
      token
    });
  },

  createRevisionDocumentos: async (payload: any, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.CREATE_DOCUMENTOS, {
      method: 'POST',
      body: payload,
      token
    });
  }
};
