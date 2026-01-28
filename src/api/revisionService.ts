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

  // Alias para compatibilidad con código existente de Equipo2
  revisionesBySolicitud: async (idsolicitud: number, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.BY_SOLICITUD, {
      method: 'POST',
      body: { idsolicitud },
      token
    });
  },

  // Método mejorado de Equipo1 - mismo comportamiento pero nombre más claro
  getRevisionesBySolicitud: async (idsolicitud: number, token?: string) => {
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
  },

  updateRevisionDocumento: async (payload: { id: number; comentarios: string; idestatus: number }, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.UPDATE_DOCUMENTO, {
      method: 'POST',
      body: payload,
      token
    });
  },

  getDocumentosByRevision: async (idrevision: number, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.DOCUMENTOS_BY_REVISION, {
      method: 'POST',
      body: { idrevision },
      token
    });
  },

  getDocumentosByDocumento: async (iddocumento: number, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.DOCUMENTOS_BY_DOCUMENTO, {
      method: 'POST',
      body: { iddocumento },
      token
    });
  },

  getRevisionesByRevisor: async (idrevisor: number, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.BY_REVISOR, {
      method: 'POST',
      body: { idrevisor },
      token
    });
  },

  updateRevision: async (payload: { id: number; comentarios: string; idestatus: number }, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.REVISION.UPDATE, {
      method: 'POST',
      body: payload,
      token
    });
  }
};
