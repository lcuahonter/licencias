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
  FechaInicio: string;  // Formato: "2026-01-01"
  FechaFin: string;     // Formato: "2026-01-31"
}

export interface OperadorSolicitudes {
  [key: string]: number; // "Activo": 8, "Asignada": 5, etc.
}

export interface OperadorData {
  Id: number; // ID del usuario en la base de datos
  Nombre: string;
  Correo: string;
  solicitudes: OperadorSolicitudes;
  idEstatus: number;
  estatus: string; // "Activo" | "Inactivo"
}

export interface DashboardRevisorResponse {
  data: OperadorData[];
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
   * Obtiene la lista de todos los operadores con sus estadísticas filtrado por fecha
   */
  async getDashboardRevisor(
    payload: DashboardRevisorRequest,
    token?: string
  ): Promise<OperadorData[]> {
    const response = await apiRequest<{ data: OperadorData[] }>(
      API_ENDPOINTS.DASHBOARD.OPERADORES_DATA,
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
