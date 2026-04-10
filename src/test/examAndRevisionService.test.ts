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

import examService from '../api/examService';
import { revisionService } from '../api/revisionService';
import { apiRequestWithLoading } from '../api/apiClientWithLoading';

const mockReq = vi.mocked(apiRequestWithLoading);

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// examService
// ---------------------------------------------------------------------------
describe('examService.obtenerPreguntas', () => {
  it('retorna response.data', async () => {
    const fakeData = { idintento: 1, preguntas: [], fechaInicio: '2025-01-01' };
    mockReq.mockResolvedValueOnce({ data: fakeData });
    const result = await examService.obtenerPreguntas(10, 'tok');
    expect(result).toEqual(fakeData);
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/pruebas/examen-teorico/obtener-preguntas');
    expect(opts.body).toEqual({ idsolicitud: 10 });
  });
});

describe('examService.enviarRespuestas', () => {
  it('envía idintento y respuestas', async () => {
    mockReq.mockResolvedValueOnce({ ok: true });
    const respuestas = [{ idpregunta: 1, respuesta: 'A' as const, tiempoRespuesta: 5 }];
    await examService.enviarRespuestas(3, respuestas, 'tok');
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/pruebas/examen-teorico/enviar-respuestas');
    expect(opts.body).toEqual({ idintento: 3, respuestas });
  });
});

describe('examService.verificarResultado', () => {
  it('retorna response.data con calificación', async () => {
    const fakeResult = { aprobado: true, calificacion: 90, correctas: 9, incorrectas: 1 };
    mockReq.mockResolvedValueOnce({ data: fakeResult });
    const result = await examService.verificarResultado(3, 'tok');
    expect(result).toEqual(fakeResult);
    const [endpoint] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/pruebas/examen-teorico/verificar-resultado');
  });
});

describe('examService.verificarAprobacion', () => {
  it('envía idsolicitud y retorna data', async () => {
    mockReq.mockResolvedValueOnce({ data: { aprobado: true } });
    const result = await examService.verificarAprobacion(20, 'tok');
    expect(result).toEqual({ aprobado: true });
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/pruebas/examen-teorico/verificar-aprobacion');
    expect(opts.body).toEqual({ idsolicitud: 20 });
  });
});

describe('examService.obtenerPorSolicitud', () => {
  it('retorna response.data', async () => {
    mockReq.mockResolvedValueOnce({ data: { intentos: [] } });
    const result = await examService.obtenerPorSolicitud(5, 'tok');
    expect(result).toEqual({ intentos: [] });
    const [endpoint] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/pruebas/obtener-por-solicitud');
  });
});

// ---------------------------------------------------------------------------
// revisionService
// ---------------------------------------------------------------------------
describe('revisionService.createRevision', () => {
  it('llama al endpoint con el payload', async () => {
    mockReq.mockResolvedValueOnce({ id: 1 });
    const payload = {
      idrevision: 1,
      documentos: [{ iddocumento: 2, comentarios: 'ok', idestatus: 1 }],
    };
    await revisionService.createRevision(payload, 'tok');
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/revisiones/createRevision');
    expect(opts.body).toEqual(payload);
  });
});

describe('revisionService.revisionesBySolicitud', () => {
  it('envía idsolicitud', async () => {
    mockReq.mockResolvedValueOnce([]);
    await revisionService.revisionesBySolicitud(8, 'tok');
    const [, opts] = mockReq.mock.calls[0];
    expect(opts.body).toEqual({ idsolicitud: 8 });
  });
});

describe('revisionService.getRevisionesBySolicitud (alias)', () => {
  it('llama al mismo endpoint que revisionesBySolicitud', async () => {
    mockReq.mockResolvedValueOnce([]);
    await revisionService.getRevisionesBySolicitud(8, 'tok');
    const [endpoint] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/revisiones/revisionesBySolicitud');
  });
});

describe('revisionService.updateRevisionDocumento', () => {
  it('envía payload completo', async () => {
    mockReq.mockResolvedValueOnce({ updated: true });
    await revisionService.updateRevisionDocumento({ id: 1, comentarios: 'rechazado', idestatus: 2 }, 'tok');
    const [, opts] = mockReq.mock.calls[0];
    expect(opts.body).toEqual({ id: 1, comentarios: 'rechazado', idestatus: 2 });
  });
});

describe('revisionService.getDocumentosByRevision', () => {
  it('envía idrevision', async () => {
    mockReq.mockResolvedValueOnce([]);
    await revisionService.getDocumentosByRevision(4, 'tok');
    const [, opts] = mockReq.mock.calls[0];
    expect(opts.body).toEqual({ idrevision: 4 });
  });
});

describe('revisionService.getDocumentosByDocumento', () => {
  it('envía iddocumento', async () => {
    mockReq.mockResolvedValueOnce([]);
    await revisionService.getDocumentosByDocumento(9, 'tok');
    const [, opts] = mockReq.mock.calls[0];
    expect(opts.body).toEqual({ iddocumento: 9 });
  });
});
