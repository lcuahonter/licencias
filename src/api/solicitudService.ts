import { apiRequest } from './apiClient';
import { apiRequestWithLoading } from './apiClientWithLoading';
import { API_ENDPOINTS } from './endpoints';

export const solicitudService = {
  createSolicitud: async (payload: any, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.SOLICITUDES.CREATE, {
      method: 'POST',
      body: payload,
      token,
      loadingMessage: 'Creando solicitud...'
    });
  },

  getByUser: async (idUsuario: number, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.SOLICITUDES.BY_USER, {
      method: 'POST',
      body: { idUsuario },
      token,
      loadingMessage: 'Cargando solicitudes...'
    });
  },

  getAllSolicitudes: async (token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.SOLICITUDES.GET_ALL, {
      method: 'GET',
      token,
      loadingMessage: 'Cargando solicitudes...'
    });
  },

  getByEstatus: async (idEstatus: number, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.SOLICITUDES.BY_ESTATUS, {
      method: 'POST',
      body: { idEstatus },
      token,
      loadingMessage: 'Filtrando solicitudes...'
    });
  },

  updateSolicitud: async (idsolicitud: number, idestatus: number, token?: string, showLoading?: boolean) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.SOLICITUDES.UPDATE, {
      method: 'POST',
      body: { idsolicitud, idestatus },
      token,
      loadingMessage: 'Actualizando solicitud...',
      showLoading
    });
  },

  /** Actualiza el UUID de verificación VDID en una solicitud existente. */
  updateUuid: async (idsolicitud: number, uuid: string, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.SOLICITUDES.UPDATE, {
      method: 'POST',
      body: { idsolicitud, uuid },
      token,
    });
  },

  createRevision: async (payload: any, token?: string) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.REVISION.CREATE, {
      method: 'POST',
      body: payload,
      token,
      loadingMessage: 'Creando revisión...'
    });
  }
};
