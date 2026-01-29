// src/api/apiClientWithLoading.ts
import { apiRequest, apiBlobRequest } from './apiClient';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string;
  showLoading?: boolean;
  loadingMessage?: string;
}

// Variable para almacenar las funciones del contexto de loading
let loadingFunctions: {
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
} | null = null;

export const setLoadingFunctions = (functions: {
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
}) => {
  loadingFunctions = functions;
};

export const apiRequestWithLoading = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { showLoading = true, loadingMessage = 'Procesando...', ...apiOptions } = options;

  try {
    if (showLoading && loadingFunctions) {
      loadingFunctions.setLoadingMessage(loadingMessage);
      loadingFunctions.setLoading(true);
    }

    const result = await apiRequest<T>(endpoint, apiOptions);
    return result;
  } finally {
    if (showLoading && loadingFunctions) {
      loadingFunctions.setLoading(false);
    }
  }
};

export const apiBlobRequestWithLoading = async (
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ blob: Blob; filename?: string; contentType?: string }> => {
  const { showLoading = true, loadingMessage = 'Descargando...', ...apiOptions } = options;

  try {
    if (showLoading && loadingFunctions) {
      loadingFunctions.setLoadingMessage(loadingMessage);
      loadingFunctions.setLoading(true);
    }

    const result = await apiBlobRequest(endpoint, apiOptions);
    return result;
  } finally {
    if (showLoading && loadingFunctions) {
      loadingFunctions.setLoading(false);
    }
  }
};
