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

  getRevisionesBySolicitud: async (idsolicitud: number, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.BY_SOLICITUD, {
      method: 'POST',
      body: { idsolicitud },
      token
    });
  },

  getDocumentosByRevision: async (idrevision: number, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.DOCUMENTOS_BY_REVISION, {
      method: 'POST',
      body: { idrevision },
      token
    });
  }
};
