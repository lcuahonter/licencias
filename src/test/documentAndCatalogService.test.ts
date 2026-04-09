import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks de dependencias
vi.mock('../api/urlBuilder', () => ({
  buildApiUrl: (path: string) => `https://api.test${path}`,
}));

vi.mock('../api/apiClientWithLoading', () => ({
  apiRequestWithLoading: vi.fn(),
  apiBlobRequestWithLoading: vi.fn(),
}));

vi.mock('../api/apiClient', () => ({
  apiRequest: vi.fn(),
  apiBlobRequest: vi.fn(),
}));

import { documentService } from '../api/documentService';
import { catalogService } from '../api/catalogService';
import { apiRequestWithLoading, apiBlobRequestWithLoading } from '../api/apiClientWithLoading';

const mockReq = vi.mocked(apiRequestWithLoading);
const mockBlob = vi.mocked(apiBlobRequestWithLoading);

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// documentService
// ---------------------------------------------------------------------------
describe('documentService.createDocumento', () => {
  it('llama al endpoint correcto con POST', async () => {
    mockReq.mockResolvedValueOnce({ id: 1 });
    const result = await documentService.createDocumento({ tipo: 'INE' }, 'tok');
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/documentos/createDocumento');
    expect(opts.method).toBe('POST');
    expect(result).toEqual({ id: 1 });
  });
});

describe('documentService.getByUser', () => {
  it('envía idusuario en body', async () => {
    mockReq.mockResolvedValueOnce([]);
    await documentService.getByUser(5, 'tok');
    const [, opts] = mockReq.mock.calls[0];
    expect(opts.body).toEqual({ idusuario: 5 });
  });
});

describe('documentService.getBySolicitud', () => {
  it('envía idsolicitud en body', async () => {
    mockReq.mockResolvedValueOnce([]);
    await documentService.getBySolicitud(12, 'tok');
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/documentos/documentosBySolicitud');
    expect(opts.body).toEqual({ idsolicitud: 12 });
  });
});

describe('documentService.downloadDocumento', () => {
  it('usa apiBlobRequestWithLoading', async () => {
    const fakeBlob = { blob: new Blob(['pdf']), filename: 'doc.pdf', contentType: 'application/pdf' };
    mockBlob.mockResolvedValueOnce(fakeBlob);
    const result = await documentService.downloadDocumento(7, 'tok');
    const [endpoint, opts] = mockBlob.mock.calls[0];
    expect(endpoint).toContain('/api/documentos/downloadDocumento');
    expect(opts.body).toEqual({ id: 7 });
    expect(result.filename).toBe('doc.pdf');
  });
});

describe('documentService.updateDocumento', () => {
  it('envía payload correctamente', async () => {
    mockReq.mockResolvedValueOnce({ updated: true });
    await documentService.updateDocumento({ id: 3, comentarios: 'ok' }, 'tok');
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/documentos/updateDocumento');
    expect(opts.body).toEqual({ id: 3, comentarios: 'ok' });
  });
});

// ---------------------------------------------------------------------------
// catalogService
// ---------------------------------------------------------------------------
describe('catalogService.getLocalidadByCP', () => {
  it('envía cp en body', async () => {
    mockReq.mockResolvedValueOnce({ localidad: 'Durango' });
    await catalogService.getLocalidadByCP('34000');
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/catalogo/localidadByCP');
    expect(opts.body).toEqual({ cp: '34000' });
  });
});

describe('catalogService.getDocumentos', () => {
  it('usa método GET', async () => {
    mockReq.mockResolvedValueOnce({ data: { catDocumentos: [] } });
    await catalogService.getDocumentos();
    const [endpoint, opts] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/catalogo/catDocumentos');
    expect(opts.method).toBe('GET');
  });
});

describe('catalogService.getUsuarios', () => {
  it('usa método GET', async () => {
    mockReq.mockResolvedValueOnce({ data: { catUsuarios: [] } });
    await catalogService.getUsuarios();
    const [endpoint] = mockReq.mock.calls[0];
    expect(endpoint).toContain('/api/catalogo/catUsuarios');
  });
});
