import apiClient from './apiClient';
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
    const response = await apiClient.post(
      API_ENDPOINTS.EXAM.OBTENER_PREGUNTAS,
      { idsolicitud },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  },

  async enviarRespuestas(
    idintento: number,
    respuestas: RespuestaExamen[],
    token: string
  ): Promise<any> {
    const response = await apiClient.post(
      API_ENDPOINTS.EXAM.ENVIAR_RESPUESTAS,
      { idintento, respuestas },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async verificarResultado(idintento: number, token: string): Promise<VerificarResultadoResponse> {
    const response = await apiClient.post(
      API_ENDPOINTS.EXAM.VERIFICAR_RESULTADO,
      { idintento },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.data;
  },
};

export default examService;
