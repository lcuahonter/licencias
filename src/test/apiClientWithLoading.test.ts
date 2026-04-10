import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/urlBuilder', () => ({
  buildApiUrl: (path: string) => `https://api.test${path}`,
}));

vi.mock('../api/apiClient', () => ({
  apiRequest: vi.fn(),
  apiBlobRequest: vi.fn(),
}));

import { setLoadingFunctions, apiRequestWithLoading } from '../api/apiClientWithLoading';
import { apiRequest } from '../api/apiClient';

const mockApiRequest = vi.mocked(apiRequest);

beforeEach(() => vi.clearAllMocks());

describe('setLoadingFunctions', () => {
  it('puede ser llamado sin errores', () => {
    expect(() =>
      setLoadingFunctions({
        setLoading: vi.fn(),
        setLoadingMessage: vi.fn(),
      })
    ).not.toThrow();
  });
});

describe('apiRequestWithLoading', () => {
  it('delega en apiRequest y retorna el resultado', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: 'ok' });
    const result = await apiRequestWithLoading('/endpoint', { method: 'POST', body: { x: 1 }, showLoading: false });
    expect(result).toEqual({ data: 'ok' });
    expect(mockApiRequest).toHaveBeenCalledWith('/endpoint', expect.objectContaining({ method: 'POST' }));
  });

  it('llama show/hide loading cuando loadingFunctions están configuradas', async () => {
    const setLoading = vi.fn();
    const setLoadingMessage = vi.fn();
    setLoadingFunctions({ setLoading, setLoadingMessage });

    mockApiRequest.mockResolvedValueOnce({ ok: true });
    await apiRequestWithLoading('/endpoint', { method: 'GET', showLoading: true, loadingMessage: 'Cargando...' });

    expect(setLoadingMessage).toHaveBeenCalledWith('Cargando...');
    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(false);
  });

  it('oculta loading aunque apiRequest lance error', async () => {
    const setLoading = vi.fn();
    const setLoadingMessage = vi.fn();
    setLoadingFunctions({ setLoading, setLoadingMessage });

    mockApiRequest.mockRejectedValueOnce(new Error('Server error'));
    await expect(
      apiRequestWithLoading('/bad', { showLoading: true })
    ).rejects.toThrow('Server error');

    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it('no llama loading si showLoading es false', async () => {
    const setLoading = vi.fn();
    const setLoadingMessage = vi.fn();
    setLoadingFunctions({ setLoading, setLoadingMessage });

    mockApiRequest.mockResolvedValueOnce({});
    await apiRequestWithLoading('/endpoint', { showLoading: false });

    expect(setLoading).not.toHaveBeenCalled();
    expect(setLoadingMessage).not.toHaveBeenCalled();
  });
});
