import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/urlBuilder', () => ({
  buildApiUrl: (path: string) => `https://api.test${path}`,
}));

vi.mock('../api/apiClientWithLoading', () => ({
  apiRequestWithLoading: vi.fn(),
}));

vi.mock('../api/apiClient', () => ({
  apiRequest: vi.fn(),
}));

import { userService } from '../api/authService';
import dashboardService from '../api/dashboardService';
import { revisionService } from '../api/revisionService';
import { apiRequestWithLoading } from '../api/apiClientWithLoading';
import { apiRequest } from '../api/apiClient';

const mockReq = vi.mocked(apiRequestWithLoading);
const mockApiReq = vi.mocked(apiRequest);

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// userService (updateUsuario)
// ---------------------------------------------------------------------------
describe('userService.updateUsuario', () => {
  it('envía payload al endpoint de actualización', async () => {
    mockReq.mockResolvedValueOnce({ updated: true });
    await userService.updateUsuario({ idUsuario: 1, nombre: 'Ana' });
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/usuarios/updateUsuario');
    expect(opts.method).toBe('POST');
    expect(opts.body).toEqual({ idUsuario: 1, nombre: 'Ana' });
  });
});

// ---------------------------------------------------------------------------
// dashboardService
// ---------------------------------------------------------------------------
describe('dashboardService.getDashboardTramite', () => {
  it('retorna response.data con estadísticas', async () => {
    const fakeData = { tramitesCreados: 10, recaudacionTotal: 5000, desglose: [] };
    mockApiReq.mockResolvedValueOnce({ data: fakeData });

    const result = await dashboardService.getDashboardTramite(
      { FechaInicio: '2026-01-01', FechaFin: '2026-01-31' },
      'tok'
    );
    expect(result).toEqual(fakeData);
    const [endpoint, opts] = mockApiReq.mock.calls[0];
    expect(endpoint).toContain('/api/dashboard/getDashboardTramite');
    expect(opts.body).toEqual({ FechaInicio: '2026-01-01', FechaFin: '2026-01-31' });
  });
});

describe('dashboardService.getDashboardRevisor', () => {
  it('retorna response.data con operadores', async () => {
    const fakeOperadores = [{ Id: 1, Nombre: 'Op1', Correo: 'op1@test.com', solicitudes: {}, idEstatus: 1, estatus: 'Activo' }];
    mockApiReq.mockResolvedValueOnce({ data: fakeOperadores });

    const result = await dashboardService.getDashboardRevisor(
      { FechaInicio: '2026-01-01', FechaFin: '2026-01-31' },
      'tok'
    );
    expect(result).toEqual(fakeOperadores);
    const [endpoint] = mockApiReq.mock.calls[0];
    expect(endpoint).toContain('/api/dashboard/getDashboardRevisor');
  });
});

// ---------------------------------------------------------------------------
// revisionService - métodos faltantes
// ---------------------------------------------------------------------------
describe('revisionService.createRevisionDocumentos', () => {
  it('llama al endpoint correcto', async () => {
    mockReq.mockResolvedValueOnce({ ok: true });
    await revisionService.createRevisionDocumentos({ idrevision: 1, docs: [] }, 'tok');
    const [endpoint] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/createRevisionDocumentos');
  });
});

describe('revisionService.getRevisionesByRevisor', () => {
  it('envía idrevisor en body', async () => {
    mockReq.mockResolvedValueOnce([]);
    await revisionService.getRevisionesByRevisor(3, 'tok');
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/revisiones/revisionesByRevisor');
    expect(opts.body).toEqual({ idrevisor: 3 });
  });
});

describe('revisionService.updateRevision', () => {
  it('envía payload completo', async () => {
    mockReq.mockResolvedValueOnce({ updated: true });
    await revisionService.updateRevision({ id: 5, comentarios: 'aprobado', idestatus: 1 }, 'tok');
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/revisiones/updateRevision');
    expect(opts.body).toEqual({ id: 5, comentarios: 'aprobado', idestatus: 1 });
  });
});
