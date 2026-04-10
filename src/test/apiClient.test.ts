import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/urlBuilder', () => ({
  buildApiUrl: (path: string) => `https://api.test${path}`,
}));

describe('apiClient.apiRequest', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna datos cuando la respuesta es exitosa', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ code: '200', data: { user: 'Juan' } }),
    });

    const { apiRequest } = await import('../api/apiClient');
    const result = await apiRequest('/auth/login', { method: 'POST', body: { username: 'Juan' } });
    expect(result).toEqual({ code: '200', data: { user: 'Juan' } });
  });

  it('incluye Authorization header cuando se pasa token', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const { apiRequest } = await import('../api/apiClient');
    await apiRequest('/endpoint', { token: 'my-token' });

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const headers = fetchCall[1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-token');
  });

  it('retorna {} vacío para respuesta 204', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    const { apiRequest } = await import('../api/apiClient');
    const result = await apiRequest('/endpoint');
    expect(result).toEqual({});
  });

  it('lanza error cuando response.ok es false', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad Request', code: '400' }),
    });

    const { apiRequest } = await import('../api/apiClient');
    await expect(apiRequest('/endpoint')).rejects.toThrow('Bad Request');
  });

  it('lanza error cuando data.code no es 200 ni 204', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ code: '500', message: 'Internal Error' }),
    });

    const { apiRequest } = await import('../api/apiClient');
    await expect(apiRequest('/endpoint')).rejects.toThrow('Internal Error');
  });

  it('marca isAuthError cuando el mensaje contiene jwt expired', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'jwt expired', code: '401' }),
    });

    const { apiRequest } = await import('../api/apiClient');
    try {
      await apiRequest('/endpoint');
    } catch (err: any) {
      expect(err.isAuthError).toBe(true);
    }
  });
});

describe('apiClient.apiBlobRequest', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('retorna blob con filename desde content-disposition', async () => {
    const fakeBlob = new Blob(['pdf content']);
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === 'content-type') return 'application/pdf';
          if (name === 'content-disposition') return 'attachment; filename="document.pdf"';
          return null;
        },
      },
      blob: async () => fakeBlob,
    });

    const { apiBlobRequest } = await import('../api/apiClient');
    const result = await apiBlobRequest('/documentos/download', { method: 'POST', body: { id: 1 } });

    expect(result.blob).toBe(fakeBlob);
    expect(result.filename).toBe('document.pdf');
    expect(result.contentType).toBe('application/pdf');
  });

  it('lanza error cuando la descarga falla', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => null },
    });

    const { apiBlobRequest } = await import('../api/apiClient');
    await expect(apiBlobRequest('/bad')).rejects.toThrow('Error al descargar archivo');
  });
});
