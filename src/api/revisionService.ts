import { apiRequest } from './apiClient';
import { apiRequestWithLoading } from './apiClientWithLoading';
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
    return await apiRequestWithLoading<any>(API_ENDPOINTS.REVISION.CREATE, {
      method: 'POST',
      body: payload,
      token,
      loadingMessage: 'Creando revisión...'
    });
  },

  // Alias para compatibilidad con código existente de Equipo2
  revisionesBySolicitud: async (idsolicitud: number, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.REVISION.BY_SOLICITUD, {
      method: 'POST',
      body: { idsolicitud },
      token,
      loadingMessage: 'Cargando revisiones...'
    });
  },

  // Método mejorado de Equipo1 - mismo comportamiento pero nombre más claro
  getRevisionesBySolicitud: async (idsolicitud: number, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.REVISION.BY_SOLICITUD, {
      method: 'POST',
      body: { idsolicitud },
      token,
      loadingMessage: 'Cargando revisiones...'
    });
  },

  createRevisionDocumentos: async (payload: any, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.REVISION.CREATE_DOCUMENTOS, {
      method: 'POST',
      body: payload,
      token,
      loadingMessage: 'Creando revisión de documentos...'
    });
  },

  updateRevisionDocumento: async (payload: { id: number; comentarios: string; idestatus: number }, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.REVISION.UPDATE_DOCUMENTO, {
      method: 'POST',
      body: payload,
      token,
      loadingMessage: 'Actualizando revisión...'
    });
  },

  getDocumentosByRevision: async (idrevision: number, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.REVISION.DOCUMENTOS_BY_REVISION, {
      method: 'POST',
      body: { idrevision },
      token,
      loadingMessage: 'Cargando documentos...'
    });
  },

  getDocumentosByDocumento: async (iddocumento: number, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.REVISION.DOCUMENTOS_BY_DOCUMENTO, {
      method: 'POST',
      body: { iddocumento },
      token,
      loadingMessage: 'Cargando historial...'
    });
  },

  getRevisionesByRevisor: async (idrevisor: number, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.REVISION.BY_REVISOR, {
      method: 'POST',
      body: { idrevisor },
      token,
      loadingMessage: 'Cargando revisiones...'
    });
  },

  updateRevision: async (payload: { id: number; comentarios: string; idestatus: number }, token?: string, showLoading?: boolean) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.REVISION.UPDATE, {
      method: 'POST',
      body: payload,
      token,
      loadingMessage: 'Actualizando revisión...',
      showLoading
    });
  }
};
