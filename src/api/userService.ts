import { apiRequest } from './apiClient';
import { UserData } from '../types'; // Asumo que tienes tus tipos aquí

export const userService = {
  createUsuario: async (payload: any) => {
    return await apiRequest<any>('/api/usuarios/createUsuario', {
      method: 'POST',
      body: payload
    });
  },

  getUsuarioById: async (id: number) => {
    // Nota: Como este endpoint en tu backend es POST y público
    return await apiRequest<any>('/api/usuarios/getUsuarioById', {
      method: 'POST',
      body: { id } // Ajustamos aquí el nombre del campo para que el screen no se preocupe
    });
  },

  updateUsuario: async (payload: any) => {
    return await apiRequest<any>('/api/usuarios/updateUsuario', {
      method: 'POST',
      body: payload
    });
  }
};