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
    DOWNLOAD: '/api/documentos/downloadDocumento',
    UPDATE: '/api/documentos/updateDocumento'
  },
  SOLICITUDES: {
    CREATE: '/api/solicitudes/createSolicitud',
    BY_USER: '/api/solicitudes/solicitudesByIdUsuario',
    GET_ALL: '/api/solicitudes/solicitudes'
  },
  REVISION: {
    CREATE: '/createRevisionDocumentos',
    BY_SOLICITUD: '/api/revisiones/revisionesBySolicitud',
    DOCUMENTOS_BY_REVISION: '/revisionesDocumentosByRevision'
  }
};