import { apiRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints';

export interface DashboardTramiteRequest {
  FechaInicio: string; // Formato: "2026-01-01"
  FechaFin: string;    // Formato: "2026-01-31"
}

export interface TipoLicencia {
  cantidad: number;
  nombre: string;
  porcentaje: number;
}

export interface DesgloseMunicipio {
  municipio: string;
  licenciaTotal: number;
  tipos: TipoLicencia[];
}

export interface DashboardTramiteResponse {
  tramitesCreados: number;
  recaudacionTotal: number;
  desglose: DesgloseMunicipio[];
}

export interface DashboardRevisorRequest {
  id: number;           // ID del revisor
  FechaInicio: string;  // Formato: "2026-01-01"
  FechaFin: string;     // Formato: "2026-01-31"
}

export interface DashboardRevisorResponse {
  Nombre: string;
  Correo: string;
  solicitudes: {
    Activo: number;
  };
  idEstatus: number;
  estatus: string; // "Activo" | "Inactivo"
}

const dashboardService = {
  /**
   * Obtiene el dashboard de trámites filtrado por fecha
   */
  async getDashboardTramite(
    payload: DashboardTramiteRequest,
    token?: string
  ): Promise<DashboardTramiteResponse> {
    const response = await apiRequest<{ data: DashboardTramiteResponse }>(
      API_ENDPOINTS.DASHBOARD.ADMIN_DATA,
      {
        method: 'POST',
        body: payload,
        token
      }
    );
    return response.data;
  },

  /**
   * Obtiene el dashboard de un revisor específico filtrado por fecha
   */
  async getDashboardRevisor(
    payload: DashboardRevisorRequest,
    token?: string
  ): Promise<DashboardRevisorResponse> {
    const response = await apiRequest<{ data: DashboardRevisorResponse }>(
      API_ENDPOINTS.DASHBOARD.MUNICIPIO_DATA,
      {
        method: 'POST',
        body: payload,
        token
      }
    );
    return response.data;
  }
};

export default dashboardService;
