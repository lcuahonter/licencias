export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: import.meta.env.VITE_AUTH_LOGIN || '/auth/login',
  },
  USUARIOS: {
    CREATE: import.meta.env.VITE_USUARIOS_CREATE || '/api/usuarios/createUsuario',
    GET_BY_ID: import.meta.env.VITE_USUARIOS_GET_BY_ID || '/api/usuarios/getUsuarioById',
    UPDATE: import.meta.env.VITE_USUARIOS_UPDATE || '/api/usuarios/updateUsuario',
  },
  CATALOGOS: {
    LOCALIDAD_POR_CP: import.meta.env.VITE_CATALOGOS_LOCALIDAD_POR_CP || '/api/catalogo/localidadByCP',
    CAT_DOCUMENTOS: import.meta.env.VITE_CATALOGOS_CAT_DOCUMENTOS || '/api/catalogo/catDocumentos',
    CAT_USUARIOS: import.meta.env.VITE_CATALOGOS_CAT_USUARIOS || '/api/catalogo/catUsuarios'
  },
  DOCUMENTOS: {
    CREATE: import.meta.env.VITE_DOCUMENTOS_CREATE || '/api/documentos/createDocumento',
    BY_USER: import.meta.env.VITE_DOCUMENTOS_BY_USER || '/api/documentos/documentosByUsuario',
    BY_SOLICITUD: import.meta.env.VITE_DOCUMENTOS_BY_SOLICITUD || '/api/documentos/documentosBySolicitud',
    DOWNLOAD: import.meta.env.VITE_DOCUMENTOS_DOWNLOAD || '/api/documentos/downloadDocumento',
    UPDATE: import.meta.env.VITE_DOCUMENTOS_UPDATE || '/api/documentos/updateDocumento'
  },
  SOLICITUDES: {
    CREATE: import.meta.env.VITE_SOLICITUDES_CREATE || '/api/solicitudes/createSolicitud',
    BY_USER: import.meta.env.VITE_SOLICITUDES_BY_USER || '/api/solicitudes/solicitudesByIdUsuario',
    GET_ALL: import.meta.env.VITE_SOLICITUDES_GET_ALL || '/api/solicitudes/solicitudes',
    BY_ESTATUS: import.meta.env.VITE_SOLICITUDES_BY_ESTATUS || '/api/solicitudes/solicitudesByIdEstatus',
    UPDATE: import.meta.env.VITE_SOLICITUDES_UPDATE || '/api/solicitudes/updateSolicitud'
  },
  REVISION: {
    CREATE: import.meta.env.VITE_REVISION_CREATE || '/api/revisiones/createRevision',
    BY_SOLICITUD: import.meta.env.VITE_REVISION_BY_SOLICITUD || '/api/revisiones/revisionesBySolicitud',
    BY_REVISOR: import.meta.env.VITE_REVISION_BY_REVISOR || '/api/revisiones/revisionesByRevisor',
    CREATE_DOCUMENTOS: import.meta.env.VITE_REVISION_CREATE_DOCUMENTOS || '/createRevisionDocumentos',
    UPDATE_DOCUMENTO: import.meta.env.VITE_REVISION_UPDATE_DOCUMENTO || '/updateRevisionDocumento',
    DOCUMENTOS_BY_REVISION: import.meta.env.VITE_REVISION_DOCUMENTOS_BY_REVISION || '/revisionesDocumentosByRevision',
    DOCUMENTOS_BY_DOCUMENTO: import.meta.env.VITE_REVISION_DOCUMENTOS_BY_DOCUMENTO || '/revisionesDocumentosByDocumento'
  },
  EXAM: {
    OBTENER_PREGUNTAS: import.meta.env.VITE_EXAM_OBTENER_PREGUNTAS || '/api/pruebas/examen-teorico/obtener-preguntas',
    ENVIAR_RESPUESTAS: import.meta.env.VITE_EXAM_ENVIAR_RESPUESTAS || '/api/pruebas/examen-teorico/enviar-respuestas',
    VERIFICAR_RESULTADO: import.meta.env.VITE_EXAM_VERIFICAR_RESULTADO || '/api/pruebas/examen-teorico/verificar-resultado',
    VERIFICAR_APROBACION: import.meta.env.VITE_EXAM_VERIFICAR_APROBACION || '/api/pruebas/examen-teorico/verificar-aprobacion',
    OBTENER_POR_SOLICITUD: import.meta.env.VITE_EXAM_OBTENER_POR_SOLICITUD || '/api/pruebas/obtener-por-solicitud'
  },
  DASHBOARD: {
    ADMIN_DATA: import.meta.env.VITE_DASHBOARD_ADMIN_DATA || '/api/dashboard/getDashboardTramite',
    OPERADORES_DATA: import.meta.env.VITE_DASHBOARD_OPERADORES_DATA || '/api/dashboard/getDashboardRevisor'
  }
};

