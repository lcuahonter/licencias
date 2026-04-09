import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/urlBuilder', () => ({
  buildApiUrl: (path: string) => `https://api.test${path}`,
}));

vi.mock('../api/apiClient', () => ({
  apiRequest: vi.fn(),
}));

import { userService } from '../api/userService';
import { apiRequest } from '../api/apiClient';

const mockApiReq = vi.mocked(apiRequest);

beforeEach(() => vi.clearAllMocks());

describe('userService (userService.ts) - createUsuario', () => {
  it('llama a apiRequest con POST y el payload', async () => {
    mockApiReq.mockResolvedValueOnce({ idUsuario: 5 });
    const result = await userService.createUsuario({ nombre: 'Maria' });
    const [endpoint, opts] = mockApiReq.mock.calls[0];
    expect(endpoint).toContain('/api/usuarios/createUsuario');
    expect(opts.method).toBe('POST');
    expect(opts.body).toEqual({ nombre: 'Maria' });
    expect(result).toEqual({ idUsuario: 5 });
  });
});

describe('userService (userService.ts) - getUsuarioById', () => {
  it('envía id como body y token', async () => {
    mockApiReq.mockResolvedValueOnce({ nombre: 'Pedro' });
    await userService.getUsuarioById(10, 'my-token');
    const [endpoint, opts] = mockApiReq.mock.calls[0];
    expect(endpoint).toContain('/api/usuarios/getUsuarioById');
    expect(opts.body).toEqual({ id: 10 });
    expect(opts.token).toBe('my-token');
  });
});

describe('userService (userService.ts) - updateUsuario', () => {
  it('envía payload y token', async () => {
    mockApiReq.mockResolvedValueOnce({ updated: true });
    await userService.updateUsuario({ idUsuario: 3, nombre: 'Nuevo' }, 'tok');
    const [endpoint, opts] = mockApiReq.mock.calls[0];
    expect(endpoint).toContain('/api/usuarios/updateUsuario');
    expect(opts.body).toEqual({ idUsuario: 3, nombre: 'Nuevo' });
  });
});
