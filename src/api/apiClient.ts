// Detectamos la URL según el entorno (Vite o CRA)
const BASE_URL = import.meta.env?.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://172.174.80.112/';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string; // Token opcional para llamadas protegidas
}

// Función genérica para hacer peticiones
export const apiRequest = async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
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

    // Manejo especial para status 204 (No Content) que a veces da error al hacer .json()
    if (response.status === 204) {
        return {} as T;
    }

    const data = await response.json();

    // Si el backend devuelve un código de error lógico (ej. "330", "500")
    // Aquí centralizamos la lógica de lanzar error
    if (!response.ok || (data.code && data.code !== "200" && data.code !== "204")) {
       const message = data.message || data.data?.status || 'Error en el servidor';
       throw new Error(message);
    }

    return data;

  } catch (error: any) {
    console.error(`❌ API Error [${endpoint}]:`, error);
    throw error; // Re-lanzamos el error para que lo maneje el componente
  }
};