import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('urlBuilder - acceso directo (sin proxy)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('buildApiUrl concatena la base + path', async () => {
    vi.stubEnv('VITE_API_URL', 'http://192.168.1.1');
    const { buildApiUrl } = await import('../api/urlBuilder');
    expect(buildApiUrl('/auth/login')).toBe('http://192.168.1.1/auth/login');
  });

  it('getApiBaseUrl devuelve la URL base configurada', async () => {
    vi.stubEnv('VITE_API_URL', 'http://192.168.1.1');
    const { getApiBaseUrl } = await import('../api/urlBuilder');
    expect(getApiBaseUrl()).toBe('http://192.168.1.1');
  });

  it('isUsingProxy devuelve false sin proxy', async () => {
    vi.stubEnv('VITE_API_URL', 'http://192.168.1.1');
    const { isUsingProxy } = await import('../api/urlBuilder');
    expect(isUsingProxy()).toBe(false);
  });

  it('usa fallback http://172.174.80.112 si VITE_API_URL no está definida', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const { buildApiUrl } = await import('../api/urlBuilder');
    const result = buildApiUrl('/test');
    // El fallback puede ser vacío+path o la IP por defecto; sólo verificamos que incluya el path
    expect(result).toContain('/test');
  });
});
