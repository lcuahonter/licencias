// src/api/apiClient.ts

// Usamos process.env directo. Si no existe, usa localhost por defecto.
const API_URL = process.env.REACT_APP_API_URL;
console.log("Valor real leído:", API_URL); // Debería salir la URL
export const API_BASE_URL = API_URL

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string;
}

export const apiRequest = async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
  // ... (el resto de la función sigue igual) ...
  const { method = 'GET', body, token } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
        return {} as T;
    }

    const data = await response.json();

    if (!response.ok || (data.code && data.code !== "200" && data.code !== "204")) {
       const message = data.message || data.data?.status || 'Error en el servidor';
       throw new Error(message);
    }

    return data;

  } catch (error: any) {
    console.error(`❌ API Error [${endpoint}]:`, error);
    throw error;
  }
};