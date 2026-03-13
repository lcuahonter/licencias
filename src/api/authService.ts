import { apiRequest } from './apiClient';
import { apiRequestWithLoading } from './apiClientWithLoading';
import { API_ENDPOINTS } from './endpoints'; // <--- Importamos

export const authService = {
  login: async (payload: { username: string; password: string }) => {
    // Usamos la variable en lugar del string
    return await apiRequestWithLoading<any>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: payload,
      loadingMessage: 'Iniciando sesión...'
    });
  },

  logout: async (token?: string) => {
    try {
      return await apiRequestWithLoading<any>(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        token,
        loadingMessage: 'Cerrando sesión...'
      });
    } catch (error) {
      // Siempre permitir logout aunque falle el backend
      return null;
    }
  }
};

export const userService = {
  createUsuario: async (payload: any) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.USUARIOS.CREATE, {
      method: 'POST',
      body: payload,
      loadingMessage: 'Creando usuario...'
    });
  },

  getUsuarioById: async (id: number) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.USUARIOS.GET_BY_ID, {
      method: 'POST',
      body: { id },
      loadingMessage: 'Obteniendo información del usuario...'
    });
  },

  updateUsuario: async (payload: any) => {
    return await apiRequestWithLoading<any>(API_ENDPOINTS.USUARIOS.UPDATE, {
      method: 'POST',
      body: payload,
      loadingMessage: 'Actualizando información...'
    });
  }
};
