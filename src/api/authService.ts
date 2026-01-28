import { apiRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints'; // <--- Importamos

export const authService = {
  login: async (payload: { username: string; password: string }) => {
    // Usamos la variable en lugar del string
    return await apiRequest<any>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: payload
    });
  },

  logout: async (token?: string) => {
    try {
      return await apiRequest<any>(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        token
      });
    } catch (error) {
      // Siempre permitir logout aunque falle el backend
      return null;
    }
  }
};

export const userService = {
  createUsuario: async (payload: any) => {
    return await apiRequest<any>(API_ENDPOINTS.USUARIOS.CREATE, {
      method: 'POST',
      body: payload
    });
  },

  getUsuarioById: async (id: number) => {
    return await apiRequest<any>(API_ENDPOINTS.USUARIOS.GET_BY_ID, {
      method: 'POST',
      body: { id }
    });
  },

  updateUsuario: async (payload: any) => {
    return await apiRequest<any>(API_ENDPOINTS.USUARIOS.UPDATE, {
      method: 'POST',
      body: payload
    });
  }
};
