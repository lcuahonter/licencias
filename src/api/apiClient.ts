// src/api/apiClient.ts
import { buildApiUrl } from './urlBuilder';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string;
}

// Nueva función para descargar archivos binarios
export const apiBlobRequest = async (endpoint: string, options: RequestOptions = {}): Promise<{ blob: Blob; filename?: string; contentType?: string }> => {
  const { method = 'POST', body, token } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(buildApiUrl(endpoint), {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Error al descargar archivo: ${response.statusText}`);
    }

    // Extraer content-type
    const contentType = response.headers.get('content-type') || undefined;

    // Extraer filename del header content-disposition
    const contentDisposition = response.headers.get('content-disposition');
    let filename: string | undefined;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Retornar el blob con metadatos
    const blob = await response.blob();
    return { blob, filename, contentType };

  } catch (error: any) {
    throw error;
  }
};

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
    const response = await fetch(buildApiUrl(endpoint), {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      if (!response.ok) {
        throw new Error(`Error en el servidor (${response.status})`);
      }
      return {} as T;
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new Error(`Error en el servidor (${response.status}): ${text}`);
      }
      return text as unknown as T;
    }

    if (!response.ok || (data.code && data.code !== "200" && data.code !== "204")) {
      const message = data.message || data.data?.status || 'Error en el servidor';
      const err: any = new Error(message);
      // Adjuntamos metadatos para que los handlers puedan reaccionar a códigos internos
      err.code = data.code;
      err.internalCode = data.internalCode;
      err.data = data.data;
      // Señalamos errores de autenticación (ej. token expirado) para manejo centralizado
      const msgLower = (message || '').toString().toLowerCase();
      const backendMessages = (data.data?.messages || data.data?.error || '').toString().toLowerCase();
      err.isAuthError = data.code === '401' || msgLower.includes('jwt expired') || backendMessages.includes('jwt expired');
      throw err;
    }

    return data;

  } catch (error: any) {
    throw error;
  }
};
