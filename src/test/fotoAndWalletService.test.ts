import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../api/urlBuilder', () => ({
  buildApiUrl: (path: string) => `https://api.test${path}`,
}));

vi.mock('../api/apiClientWithLoading', () => ({
  apiRequestWithLoading: vi.fn(),
}));

vi.mock('../api/apiClient', () => ({
  apiRequest: vi.fn(),
  apiBlobRequest: vi.fn(),
}));

// Mock de @capacitor/core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn().mockReturnValue('web'),
  },
}));

import { fotoService, setFotoLoadingFunctions } from '../api/fotoService';
import { getPlatform, addToWallet } from '../api/walletService';
import { apiRequestWithLoading } from '../api/apiClientWithLoading';
import { Capacitor } from '@capacitor/core';

const mockReq = vi.mocked(apiRequestWithLoading);

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// fotoService
// ---------------------------------------------------------------------------
describe('fotoService.subirFotoRostro', () => {
  it('llama al endpoint con el payload correcto', async () => {
    mockReq.mockResolvedValueOnce({ ok: true });
    const payload = { idsolicitud: 1, archivoBase64: 'abc', nombreoriginal: 'foto.jpg', formato: 'jpg' };
    await fotoService.subirFotoRostro(payload, 'tok');
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/fotos-rostro/subir');
    expect(opts.body).toEqual(payload);
  });
});

describe('fotoService.verificarFotoExiste', () => {
  it('retorna true si la respuesta es exitosa', async () => {
    mockReq.mockResolvedValueOnce({ url: 'http://foto.jpg' });
    const exists = await fotoService.verificarFotoExiste(5, 'tok');
    expect(exists).toBe(true);
  });

  it('retorna false si apiRequest lanza error', async () => {
    mockReq.mockRejectedValueOnce(new Error('404'));
    const exists = await fotoService.verificarFotoExiste(5, 'tok');
    expect(exists).toBe(false);
  });
});

describe('fotoService.descargarFotoRostro', () => {
  it('retorna null si la petición falla', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    const result = await fotoService.descargarFotoRostro(1, 'tok');
    expect(result).toBeNull();
  });

  it('retorna null si el servidor responde 404', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await fotoService.descargarFotoRostro(1, 'tok');
    expect(result).toBeNull();
  });

  it('llama show/hide loading si están configuradas', async () => {
    const show = vi.fn();
    const hide = vi.fn();
    setFotoLoadingFunctions(show, hide);

    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    await fotoService.descargarFotoRostro(1, 'tok');
    expect(show).toHaveBeenCalledWith('Descargando foto...');
    expect(hide).toHaveBeenCalled();

    // Reset
    setFotoLoadingFunctions(vi.fn(), vi.fn());
  });
});

describe('setFotoLoadingFunctions', () => {
  it('puede ser llamado sin errores', () => {
    expect(() => setFotoLoadingFunctions(vi.fn(), vi.fn())).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// walletService
// ---------------------------------------------------------------------------
describe('getPlatform', () => {
  it('devuelve "web" por defecto (mock)', () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    expect(getPlatform()).toBe('web');
  });

  it('devuelve "ios" cuando Capacitor reporta ios', () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    expect(getPlatform()).toBe('ios');
  });

  it('devuelve "android" cuando Capacitor reporta android', () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    expect(getPlatform()).toBe('android');
  });
});

describe('addToWallet', () => {
  const passData = {
    folio: 'F001',
    nombre: 'Juan',
    tipo_licencia: 'Automovilista',
    vigencia: '2026-01-01',
    expedicion: '2025-01-01',
    solicitudId: 1,
  };

  it('lanza error si el servidor responde con error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Error interno' }),
    });
    await expect(addToWallet(1, 'tok', passData)).rejects.toThrow('Error interno');
  });

  it('lanza error si no se recibe saveUrl', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await expect(addToWallet(1, 'tok', passData)).rejects.toThrow('No se recibió URL de Google Wallet');
  });

  it('abre la URL de wallet en nueva pestaña (web)', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ saveUrl: 'https://wallet.google.com/pass' }),
    });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    await addToWallet(1, 'tok', passData);
    expect(openSpy).toHaveBeenCalledWith('https://wallet.google.com/pass', '_blank');
    openSpy.mockRestore();
  });
});
