import { apiRequest } from './apiClient';

export const authService = {
  login: async (payload: { username: string; password: string }) => {
    return await apiRequest<any>('/auth/login', {
      method: 'POST',
      body: payload
    });
  }
};