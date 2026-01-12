import { apiRequest } from './apiClient';

export const catalogService = {
  getLocalidadByCP: async (cp: string) => {
    return await apiRequest<any>('/api/catalogo/localidadByCP', {
      method: 'POST',
      body: { cp }
    });
  }
};