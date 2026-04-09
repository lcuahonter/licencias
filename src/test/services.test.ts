import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock del módulo urlBuilder para evitar dependencia de import.meta.env
vi.mock('../api/urlBuilder', () => ({
  buildApiUrl: (endpoint: string) => `https://test.example.com${endpoint}`,
}));

// Mock del módulo apiClientWithLoading
vi.mock('../api/apiClientWithLoading', () => ({
  apiRequestWithLoading: vi.fn(),
}));

// Mock del módulo apiClient
vi.mock('../api/apiClient', () => ({
  apiRequest: vi.fn(),
}));

import { authService, userService } from '../api/authService';
import { solicitudService } from '../api/solicitudService';
import { apiRequestWithLoading } from '../api/apiClientWithLoading';
import { apiRequest } from '../api/apiClient';

const mockApiRequestWithLoading = vi.mocked(apiRequestWithLoading);
const mockApiRequest = vi.mocked(apiRequest);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// authService
// ---------------------------------------------------------------------------
describe('authService.login', () => {
  it('llama a apiRequestWithLoading con el payload correcto', async () => {
    mockApiRequestWithLoading.mockResolvedValueOnce({ token: 'abc123' });

    const result = await authService.login({ username: 'user@test.com', password: '1234' });

    expect(mockApiRequestWithLoading).toHaveBeenCalledTimes(1);
    const [endpoint, opts] = mockApiRequestWithLoading.mock.calls[0];
    expect(endpoint).toContain('/auth/login');
    expect(opts.method).toBe('POST');
    expect(opts.body).toEqual({ username: 'user@test.com', password: '1234' });
    expect(result).toEqual({ token: 'abc123' });
  });

  it('propaga errores del servidor', async () => {
    mockApiRequestWithLoading.mockRejectedValueOnce(new Error('401 Unauthorized'));

    await expect(authService.login({ username: 'bad', password: 'bad' }))
      .rejects.toThrow('401 Unauthorized');
  });
});

describe('authService.logout', () => {
  it('retorna null si el backend falla (error silencioso)', async () => {
    mockApiRequestWithLoading.mockRejectedValueOnce(new Error('Network error'));

    const result = await authService.logout('some-token');
    expect(result).toBeNull();
  });

  it('llama al endpoint de logout con el token', async () => {
    mockApiRequestWithLoading.mockResolvedValueOnce(null);

    await authService.logout('mi-token');
    const [endpoint, opts] = mockApiRequestWithLoading.mock.calls[0];
    expect(endpoint).toContain('/auth/logout');
    expect(opts.token).toBe('mi-token');
  });
});

// ---------------------------------------------------------------------------
// userService
// ---------------------------------------------------------------------------
describe('userService.createUsuario', () => {
  it('envía el payload al endpoint correcto', async () => {
    const fakeUser = { nombre: 'Juan', email: 'juan@test.com' };
    mockApiRequestWithLoading.mockResolvedValueOnce({ idUsuario: 1 });

    const result = await userService.createUsuario(fakeUser);
    const [endpoint, opts] = mockApiRequestWithLoading.mock.calls[0];

    expect(endpoint).toContain('/api/usuarios/createUsuario');
    expect(opts.method).toBe('POST');
    expect(opts.body).toEqual(fakeUser);
    expect(result).toEqual({ idUsuario: 1 });
  });
});

describe('userService.getUsuarioById', () => {
  it('envía el id correctamente', async () => {
    mockApiRequestWithLoading.mockResolvedValueOnce({ nombre: 'Ana' });

    await userService.getUsuarioById(42);
    const [endpoint, opts] = mockApiRequestWithLoading.mock.calls[0];

    expect(endpoint).toContain('/api/usuarios/getUsuarioById');
    expect(opts.body).toEqual({ id: 42 });
  });
});

// ---------------------------------------------------------------------------
// solicitudService
// ---------------------------------------------------------------------------
describe('solicitudService.createSolicitud', () => {
  it('crea solicitud con token', async () => {
    mockApiRequestWithLoading.mockResolvedValueOnce({ idsolicitud: 99 });

    const result = await solicitudService.createSolicitud({ tipo: 'Automovilista' }, 'token-xyz');
    const [endpoint, opts] = mockApiRequestWithLoading.mock.calls[0];

    expect(endpoint).toContain('/api/solicitudes/createSolicitud');
    expect(opts.token).toBe('token-xyz');
    expect(result).toEqual({ idsolicitud: 99 });
  });
});

describe('solicitudService.getByUser', () => {
  it('envía idUsuario en el body', async () => {
    mockApiRequestWithLoading.mockResolvedValueOnce([]);

    await solicitudService.getByUser(7, 'my-token');
    const [endpoint, opts] = mockApiRequestWithLoading.mock.calls[0];

    expect(endpoint).toContain('/api/solicitudes/solicitudesByIdUsuario');
    expect(opts.body).toEqual({ idUsuario: 7 });
    expect(opts.token).toBe('my-token');
  });
});

describe('solicitudService.updateSolicitud', () => {
  it('envía idsolicitud e idestatus', async () => {
    mockApiRequestWithLoading.mockResolvedValueOnce({ updated: true });

    await solicitudService.updateSolicitud(5, 2, 'tok');
    const [endpoint, opts] = mockApiRequestWithLoading.mock.calls[0];

    expect(endpoint).toContain('/api/solicitudes/updateSolicitud');
    expect(opts.body).toEqual({ idsolicitud: 5, idestatus: 2 });
  });
});

describe('solicitudService.updateUuid', () => {
  it('usa apiRequest (sin loading) y envía uuid', async () => {
    mockApiRequest.mockResolvedValueOnce({ updated: true });

    await solicitudService.updateUuid(10, 'uuid-1234', 'tok');
    const [endpoint, opts] = mockApiRequest.mock.calls[0];

    expect(endpoint).toContain('/api/solicitudes/updateSolicitud');
    expect(opts.body).toEqual({ idsolicitud: 10, uuid: 'uuid-1234' });
  });
});
