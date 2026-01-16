import React, { useState, useEffect } from 'react';
import { solicitudService } from '../src/api/solicitudService';
import { documentService } from '../src/api/documentService';
import { revisionService } from '../src/api/revisionService';

interface OperatorDashboardScreenProps {
  onLogout: () => void;
  token?: string;
}

const OperatorDashboardScreen: React.FC<OperatorDashboardScreenProps> = ({ onLogout, token }) => {
  
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSolicitud, setSelectedSolicitud] = useState<any | null>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [solicitudesEnProceso, setSolicitudesEnProceso] = useState<Map<number, boolean>>(new Map());
  const [isTakingRequest, setIsTakingRequest] = useState(false);
  const [revisionActual, setRevisionActual] = useState<any | null>(null);
  
  // Estados Validación
  const [docStatus, setDocStatus] = useState<Record<number, 'accepted' | 'rejected' | null>>({});
  const [docReasons, setDocReasons] = useState<Record<number, string>>({});
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string; isBlob?: boolean; filename?: string; contentType?: string } | null>(null);

  // Limpiar blob URLs cuando el componente se desmonte o cambie el preview
  React.useEffect(() => {
    return () => {
      if (previewDoc?.isBlob && previewDoc?.url.startsWith('blob:')) {
        URL.revokeObjectURL(previewDoc.url);
      }
    };
  }, [previewDoc]);

  const closePreview = () => {
    if (previewDoc?.isBlob && previewDoc?.url.startsWith('blob:')) {
      URL.revokeObjectURL(previewDoc.url);
    }
    setPreviewDoc(null);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- CARGAR SOLICITUDES Y VALIDAR ESTADO ---
  useEffect(() => {
    fetchSolicitudes();
  }, []);

  useEffect(() => {
    // Una vez que se cargan las solicitudes, validar estado de cada una
    if (solicitudes.length > 0) {
      validarEstadoSolicitudes();
    }
  }, [solicitudes]);

  const validarEstadoSolicitudes = async () => {
    try {
      const estadoMap = new Map<number, boolean>();
      
      for (const sol of solicitudes) {
        try {
          const resp = await revisionService.revisionesBySolicitud(sol.id, token);
          console.log(`✅ Revisión para solicitud ${sol.id}:`, resp);
          
          // Si el code es "200", la solicitud está en proceso (mostrar Validar)
          const enProceso = resp?.code === '200' || resp?.data?.code === '200';
          estadoMap.set(sol.id, enProceso);
        } catch (error) {
          console.error(`Error validando solicitud ${sol.id}:`, error);
          estadoMap.set(sol.id, false);
        }
      }
      
      setSolicitudesEnProceso(estadoMap);
    } catch (error) {
      console.error('Error validando estado de solicitudes:', error);
    }
  };

  const fetchSolicitudes = async () => {
    try {
      setIsLoading(true);
      const resp = await solicitudService.getAllSolicitudes(token);
      const lista = resp?.data?.solicitudesData || resp?.data?.solicitudes || [];
      setSolicitudes(lista);
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FILTRADO ---
  const filteredSolicitudes = solicitudes.filter(sol => {
    // Solo mostrar solicitudes sin número de licencia (nuevas/pendientes)
    if (sol.numerolicencia !== null) return false;
    
    const lowerTerm = searchTerm.toLowerCase();
    const nombreCompleto = `${sol.nombres} ${sol.apellidopaterno} ${sol.apellidomaterno}`.toLowerCase();
    return nombreCompleto.includes(lowerTerm);
  });

  // --- HANDLERS ---
  const handleOpenValidation = async (solicitud: any) => {
    setSelectedSolicitud(solicitud);
    setIsLoadingDocs(true);
    
    try {
      // Obtener datos de la revisión si existe
      if (solicitudesEnProceso.get(solicitud.id)) {
        const revResp = await revisionService.revisionesBySolicitud(solicitud.id, token);
        const revisionData = revResp?.data?.revisionesData?.[0] || revResp?.data?.revisiones?.[0];
        setRevisionActual(revisionData);
        console.log('📋 Datos de revisión obtenidos:', revisionData);
      }

      const resp = await documentService.getByUser(solicitud.idusuario, token);
      const docs = resp?.data?.documentosData || resp?.data?.documentos || [];
      setDocumentos(docs);
      
      // Inicializar estados de validación
      const initialStatus: any = {};
      const initialReasons: any = {};
      docs.forEach((doc: any) => {
        initialStatus[doc.id] = null;
        initialReasons[doc.id] = '';
      });
      setDocStatus(initialStatus);
      setDocReasons(initialReasons);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      alert('Error al cargar los documentos');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleSetDocStatus = (docId: number, status: 'accepted' | 'rejected') => {
    setDocStatus(prev => ({ ...prev, [docId]: status }));
    if (status === 'accepted') {
      setDocReasons(prev => ({ ...prev, [docId]: '' }));
    }
  };

  const handleReasonChange = (docId: number, text: string) => {
    setDocReasons(prev => ({ ...prev, [docId]: text }));
  };

  const handleViewDocument = async (doc: any) => {
    try {
      // Descargar el archivo binario (blob) desde el backend con metadatos
      const { blob, filename, contentType } = await documentService.downloadDocumento(doc.id, token);
      
      // Crear un nuevo blob con el content-type correcto
      const typedBlob = contentType ? new Blob([blob], { type: contentType }) : blob;
      
      // Crear una URL temporal del blob
      const blobUrl = URL.createObjectURL(typedBlob);
      
      // Determinar la extensión correcta si no viene filename
      let finalFilename = filename;
      if (!finalFilename) {
        // Determinar extensión por content-type
        let extension = '.bin';
        if (contentType) {
          if (contentType.includes('pdf')) extension = '.pdf';
          else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
          else if (contentType.includes('png')) extension = '.png';
          else if (contentType.includes('gif')) extension = '.gif';
          else if (contentType.includes('webp')) extension = '.webp';
        }
        finalFilename = `${doc.tipodocumento}${extension}`;
      }
      
      // Mostrar en el modal preview con el nombre del archivo
      setPreviewDoc({ 
        url: blobUrl, 
        title: doc.tipodocumento, 
        isBlob: true,
        filename: finalFilename,
        contentType: contentType
      });
      
    } catch (error: any) {
      console.error('Error al descargar documento:', error);
      alert(error.message || 'Error al cargar el documento. El archivo puede no estar disponible.');
    }
  };

  // --- TOMAR SOLICITUD (Crear Revisión) ---
  const handleTakeSolicitud = async (solicitud: any) => {
    try {
      setIsTakingRequest(true);

      // Decodificar token para obtener idrevisor
      const tokenParts = token?.split('.') || [];
      if (tokenParts.length !== 3) {
        alert('Token inválido');
        return;
      }

      const decodedPayload = JSON.parse(atob(tokenParts[1]));
      const idrevisor = decodedPayload.aData || decodedPayload.idUsuario || 1;

      // Preparar payload para createRevision
      const payload = {
        idsolicitud: solicitud.id,
        idrevisor: idrevisor,
        comentarios: 'Documento en Proceso',
        idestatus: 1
      };

      console.log('📤 Enviando createRevision:', payload);

      // Llamar al servicio
      await solicitudService.createRevision(payload, token);

      // Marcar solicitud como "En Proceso"
      setSolicitudesEnProceso(prev => {
        const newMap = new Map(prev);
        newMap.set(solicitud.id, true);
        return newMap;
      });

      alert('Solicitud tomada. Estado: En Proceso');
      setSelectedSolicitud(null);
    } catch (error: any) {
      console.error('❌ Error al tomar solicitud:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsTakingRequest(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedSolicitud) return;

    // Validar que la revisión actual existe
    if (!revisionActual || !revisionActual.id) {
      alert('Error: No se encontró la información de la revisión');
      return;
    }

    // Filtrar solo los documentos que han sido seleccionados (aceptados o rechazados)
    const selectedDocs = documentos.filter(doc => docStatus[doc.id] !== null);
    
    // Validar que al menos un documento haya sido revisado
    if (selectedDocs.length === 0) {
      alert('Debes seleccionar y revisar al menos un documento');
      return;
    }

    // Validar que los rechazados tengan comentarios
    const rejectedDocs = selectedDocs.filter(doc => docStatus[doc.id] === 'rejected');
    const missingReasons = rejectedDocs.filter(doc => !docReasons[doc.id] || docReasons[doc.id].trim() === '');
    if (missingReasons.length > 0) {
      alert('Debes ingresar el motivo para todos los documentos rechazados');
      return;
    }

    // Construir payload solo con documentos seleccionados
    const documentosPayload = selectedDocs.map(doc => ({
      iddocumento: doc.id,
      comentarios: docStatus[doc.id] === 'accepted' 
        ? `${doc.tipodocumento} aprobado`
        : docReasons[doc.id],
      idestatus: docStatus[doc.id] === 'accepted' ? 14 : 15
    }));

    const payload = {
      idrevision: revisionActual.id,
      documentos: documentosPayload
    };

    try {
      setIsSubmitting(true);
      await revisionService.createRevisionDocumentos(payload, token);
      alert('Revisión guardada exitosamente');
      setSelectedSolicitud(null);
      fetchSolicitudes(); // Recargar lista
    } catch (error) {
      console.error('Error al guardar revisión:', error);
      alert('Error al guardar la revisión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      
      {/* NAVBAR */}
      <header className="bg-[#2c3e50] text-white px-4 py-3 flex justify-between items-center shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined">admin_panel_settings</span>
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Panel de Operador</h1>
            <p className="text-[9px] opacity-70 uppercase tracking-wider">Licencias Durango.</p>
          </div>
        </div>
        <button onClick={onLogout} className="bg-red-500/20 hover:bg-red-600 hover:text-white text-red-200 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">logout</span> Salir
        </button>
      </header>

      {/* BUSCADOR */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar por nombre..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm focus:border-primary outline-none dark:bg-gray-800 dark:text-white text-sm" 
          />
          <span className="material-symbols-outlined absolute left-3 top-2 text-gray-400 text-base">search</span>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2 text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTENIDO */}
      <main className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredSolicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-60">
            <span className="material-symbols-outlined text-5xl mb-2">task_alt</span>
            <p className="text-sm">No hay solicitudes pendientes.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredSolicitudes.map(sol => (
              <div key={sol.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold uppercase">
                        {sol.licencia}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">ID: {sol.id}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {sol.nombres} {sol.apellidopaterno} {sol.apellidomaterno}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{sol.descripcion}</p>
                  </div>
                  <button 
                    onClick={() => {
                      const enProceso = solicitudesEnProceso.get(sol.id);
                      if (enProceso) {
                        handleOpenValidation(sol);
                      } else {
                        handleTakeSolicitud(sol);
                      }
                    }}
                    disabled={isTakingRequest}
                    className={`${
                      solicitudesEnProceso.get(sol.id)
                        ? 'bg-primary hover:bg-blue-700'
                        : 'bg-orange-500 hover:bg-orange-600'
                    } text-white px-3 py-2 rounded-lg text-xs font-bold shadow transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {solicitudesEnProceso.get(sol.id) ? 'rate_review' : 'hourglass_top'}
                    </span>
                    {solicitudesEnProceso.get(sol.id) ? 'Validar' : 'En Proceso'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL VALIDACIÓN */}
      {selectedSolicitud && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-900 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black text-gray-800 dark:text-white">Validación Documental</h2>
                <p className="text-sm text-gray-500 font-bold">
                  {selectedSolicitud.nombres} {selectedSolicitud.apellidopaterno}
                </p>
                <p className="text-xs text-gray-400">ID Solicitud: {selectedSolicitud.id}</p>
              </div>
              <button onClick={() => setSelectedSolicitud(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingDocs ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : documentos.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-sm">No hay documentos para validar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documentos.map((doc) => {
                    const status = docStatus[doc.id];
                    return (
                      <div key={doc.id} className={`p-3 rounded-lg border-2 transition-all ${
                        status === 'rejected' ? 'border-red-200 bg-red-50/50' : 
                        status === 'accepted' ? 'border-green-200 bg-green-50/50' : 
                        'border-gray-200 bg-white'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-50 p-1.5 rounded text-blue-600">
                              <span className="material-symbols-outlined text-base">description</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-gray-800">{doc.tipodocumento}</h4>
                              <button 
                                onClick={() => handleViewDocument(doc)} 
                                className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-xs">visibility</span> Ver Archivo
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleSetDocStatus(doc.id, 'rejected')} 
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                status === 'rejected' 
                                  ? 'bg-red-600 text-white shadow-lg scale-110' 
                                  : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                            <button 
                              onClick={() => handleSetDocStatus(doc.id, 'accepted')} 
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                status === 'accepted' 
                                  ? 'bg-green-600 text-white shadow-lg scale-110' 
                                  : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-500'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                            </button>
                          </div>
                        </div>
                        {status === 'rejected' && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="text-[9px] font-bold uppercase text-red-600 mb-1 block">
                              Motivo de Rechazo (Obligatorio)
                            </label>
                            <textarea 
                              value={docReasons[doc.id]} 
                              onChange={(e) => handleReasonChange(doc.id, e.target.value)} 
                              placeholder={`Explica por qué rechazas ${doc.tipodocumento}...`} 
                              className="w-full text-xs p-2 border border-red-200 rounded-lg focus:border-red-500 outline-none bg-white h-16 resize-none" 
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 dark:bg-gray-900 rounded-b-2xl flex justify-end gap-2">
              <button 
                onClick={() => setSelectedSolicitud(null)} 
                className="px-4 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-200 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmitReview} 
                disabled={isSubmitting}
                className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span> 
                    Guardar Dictamen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col animate-in fade-in">
          <div className="flex justify-between items-center p-4 text-white">
            <h3 className="font-bold text-base">{previewDoc.title}</h3>
            <button onClick={closePreview} className="bg-white/10 p-2 rounded-full hover:bg-white/20">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 bg-gray-800 flex items-center justify-center p-4 overflow-hidden relative">
            {previewDoc.contentType?.includes('pdf') || previewDoc.contentType === 'application/pdf' ? (
              <iframe src={previewDoc.url} className="w-full h-full rounded-lg bg-white" title="PDF" />
            ) : (
              <img src={previewDoc.url} alt="Doc" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            )}
            <a 
              href={previewDoc.url} 
              download={previewDoc.filename}
              className="absolute bottom-6 right-6 bg-primary text-white px-4 py-2 rounded-full font-bold shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform text-sm"
            >
              <span className="material-symbols-outlined text-sm">download</span> Descargar
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorDashboardScreen;