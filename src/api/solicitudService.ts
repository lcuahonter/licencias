import { apiRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints';

export const solicitudService = {
  createSolicitud: async (payload: any, token?: string) => {
    return await apiRequest<any>(API_ENDPOINTS.SOLICITUDES.CREATE, {
      method: 'POST',
      body: payload,
      token
    });
  }
};
