export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
  },
  USUARIOS: {
    CREATE: '/api/usuarios/createUsuario',
    GET_BY_ID: '/api/usuarios/getUsuarioById',
    UPDATE: '/api/usuarios/updateUsuario',
  },
  CATALOGOS: {
    LOCALIDAD_POR_CP: '/api/catalogo/localidadByCP',
    CAT_DOCUMENTOS: '/api/catalogo/catDocumentos',
    CAT_USUARIOS: '/api/catalogo/catUsuarios'
  },
  DOCUMENTOS: {
    CREATE: '/api/documentos/createDocumento',
    BY_USER: '/api/documentos/documentosByUsuario',
    BY_SOLICITUD: '/api/documentos/documentosBySolicitud',
    DOWNLOAD: '/api/documentos/downloadDocumento',
    UPDATE: '/api/documentos/updateDocumento'
  },
  SOLICITUDES: {
    CREATE: '/api/solicitudes/createSolicitud',
    BY_USER: '/api/solicitudes/solicitudesByIdUsuario',
    GET_ALL: '/api/solicitudes/solicitudes',
    BY_ESTATUS: '/api/solicitudes/solicitudesByIdEstatus',
    UPDATE: '/api/solicitudes/updateSolicitud'
  },
  REVISION: {
    CREATE: '/api/revisiones/createRevision',
    BY_SOLICITUD: '/api/revisiones/revisionesBySolicitud',
    BY_REVISOR: '/api/revisiones/revisionesByRevisor',
    CREATE_DOCUMENTOS: '/createRevisionDocumentos',
    UPDATE_DOCUMENTO: '/updateRevisionDocumento',
    DOCUMENTOS_BY_REVISION: '/revisionesDocumentosByRevision',
    DOCUMENTOS_BY_DOCUMENTO: '/revisionesDocumentosByDocumento'
  },
  EXAM: {
    OBTENER_PREGUNTAS: '/api/pruebas/examen-teorico/obtener-preguntas',
    ENVIAR_RESPUESTAS: '/api/pruebas/examen-teorico/enviar-respuestas',
    VERIFICAR_RESULTADO: '/api/pruebas/examen-teorico/verificar-resultado',
    VERIFICAR_APROBACION: '/api/pruebas/examen-teorico/verificar-aprobacion',
    OBTENER_POR_SOLICITUD: '/api/pruebas/obtener-por-solicitud'
  }
};