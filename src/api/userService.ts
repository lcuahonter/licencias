import { apiRequest } from './apiClient';

export const userService = {
  createUsuario: async (payload: any) => {
    return await apiRequest<any>('/api/usuarios/createUsuario', {
      method: 'POST',
      body: payload
    });
  },

  getUsuarioById: async (id: number, token?: string) => {
    // Nota: Este endpoint ahora puede requerir autenticación en el backend
    return await apiRequest<any>('/api/usuarios/getUsuarioById', {
      method: 'POST',
      body: { id }, // Ajustamos aquí el nombre del campo para que el screen no se preocupe
      token
    });
  },

  updateUsuario: async (payload: any, token?: string) => {
    return await apiRequest<any>('/api/usuarios/updateUsuario', {
      method: 'POST',
      body: payload,
      token
    });
  }
};