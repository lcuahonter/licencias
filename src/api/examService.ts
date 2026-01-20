import { apiRequest } from './apiClient';
import { API_ENDPOINTS } from './endpoints';

export interface Pregunta {
  id: number;
  pregunta: string;
  opcionA: string;
  opcionB: string;
  opcionC: string;
  opcionD: string;
  categoria: string;
}

export interface RespuestaExamen {
  idpregunta: number;
  respuesta: 'A' | 'B' | 'C' | 'D';
  tiempoRespuesta: number;
}

export interface ObtenerPreguntasResponse {
  idintento: number;
  preguntas: Pregunta[];
  fechaInicio: string;
}

export interface VerificarResultadoResponse {
  aprobado: boolean;
  calificacion: number;
  correctas: number;
  incorrectas: number;
  respuestas?: any[];
}

const examService = {
  async obtenerPreguntas(idsolicitud: number, token: string): Promise<ObtenerPreguntasResponse> {
    const response = await apiRequest<{ data: ObtenerPreguntasResponse }>(
      API_ENDPOINTS.EXAM.OBTENER_PREGUNTAS,
      {
        method: 'POST',
        body: { idsolicitud },
        token
      }
    );
    return response.data;
  },

  async enviarRespuestas(
    idintento: number,
    respuestas: RespuestaExamen[],
    token: string
  ): Promise<any> {
    return await apiRequest<any>(
      API_ENDPOINTS.EXAM.ENVIAR_RESPUESTAS,
      {
        method: 'POST',
        body: { idintento, respuestas },
        token
      }
    );
  },

  async verificarResultado(idintento: number, token: string): Promise<VerificarResultadoResponse> {
    const response = await apiRequest<{ data: VerificarResultadoResponse }>(
      API_ENDPOINTS.EXAM.VERIFICAR_RESULTADO,
      {
        method: 'POST',
        body: { idintento },
        token
      }
    );
    return response.data;
  },

  async obtenerPorSolicitud(idsolicitud: number, token: string): Promise<any> {
    const response = await apiRequest<any>(
      API_ENDPOINTS.EXAM.OBTENER_POR_SOLICITUD,
      {
        method: 'POST',
        body: { idsolicitud },
        token
      }
    );
    return response.data;
  },

  async verificarAprobacion(idsolicitud: number, token: string): Promise<any> {
    const response = await apiRequest<any>(
      API_ENDPOINTS.EXAM.VERIFICAR_APROBACION,
      {
        method: 'POST',
        body: { idsolicitud },
        token
      }
    );
    return response.data;
  },
};

export default examService;
