import { apiRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints';

export const solicitudService = {
  createSolicitud: async (payload: any, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.SOLICITUDES.CREATE, {
      method: 'POST',
      body: payload,
      token
    });
  },

  getByUser: async (idUsuario: number, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.SOLICITUDES.BY_USER, {
      method: 'POST',
      body: { idUsuario },
      token
    });
  },

  getAllSolicitudes: async (token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.SOLICITUDES.GET_ALL, {
      method: 'GET',
      token
    });
  }
};
