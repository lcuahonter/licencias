import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { vdidService } from '../src/api/vdidService';
import VdidCaptureModal from '../components/src/VdidCaptureModal';

interface DocumentUploadScreenProps {
  onBack: () => void;
  onContinue: (data: Partial<UserData>) => void;
  // Si se proporciona, se usarán para subir documentos al endpoint
  idUsuario?: number;
  idSolicitud?: number;
  token?: string;
  onSessionExpired?: () => void;
  isSubmittingRequest?: boolean;
}

import { catalogService } from '../src/api/catalogService';

const DocumentUploadScreen: React.FC<DocumentUploadScreenProps> = ({ onBack, onContinue, idUsuario, idSolicitud, token, isSubmittingRequest }) => {
  
  // ── VDID states ──────────────────────────────────────────
  const [showVdidModal, setShowVdidModal] = useState(false);
  const [vdidUrl, setVdidUrl]             = useState('');
  const [vdidLoading, setVdidLoading]     = useState(false);
  const [vdidError, setVdidError]         = useState<string | null>(null);
  /** null = aún no verificado, 'passed' = aprobado, 'failed' = rechazado */
  const [vdidResult, setVdidResult]       = useState<null | 'passed' | 'failed'>(null);
  const [vdidFailReason, setVdidFailReason] = useState<string | null>(null);
  const [vdidUuid, setVdidUuid]           = useState<string | null>(null);
  const [vdidPolling, setVdidPolling]     = useState<false | 'scanning' | 'waiting'>(false);  // esperando resultados de Suma México
  const [vdidSelfie, setVdidSelfie]       = useState<string | null>(null); // base64 selfie

  /**
   * Callback al completar el flujo VDID en el iframe.
   * Cierra el modal y hace polling a /id/v2/results cada 5 s hasta obtener
   * un resultado definitivo (Passed / Failed) o agotar 2 minutos.
   * Si la respuesta dice "isn't ready" muestra "En espera" y reintenta.
   */
  const handleVdidCompleted = async () => {
      setShowVdidModal(false);
      // NO marcamos como verificado aún — esperamos el resultado real de Suma México

      const currentUuid = vdidUuid;
      if (!currentUuid || currentUuid.startsWith('local-')) {
          setVdidResult('failed');
          setVdidFailReason('No se pudo obtener un identificador de verificación. Intenta de nuevo.');
          return;
      }

      setVdidPolling('scanning');
      setVdidResult(null);
      setVdidFailReason(null);

      const POLL_INTERVAL = 5_000;   // 5 segundos
      const MAX_WAIT      = 600_000; // 10 minutos (el experto de Suma México puede tardar ~5 min)
      const deadline      = Date.now() + MAX_WAIT;

      while (Date.now() < deadline) {
          try {
              const results = await vdidService.getResults(currentUuid);
              console.log('[VDID] status:', results.status, 'globalResult:', results.globalResult);

              // Suma México aún no terminó de procesar — seguir esperando
              if (results.status === 'not_ready' || results.globalResult === 'not_ready') {
                  setVdidPolling('waiting');
                  await new Promise(r => setTimeout(r, POLL_INTERVAL));
                  continue;
              }

              // Resultado definitivo
              const gr     = results.globalResult?.toLowerCase() ?? '';
              const passed = gr === 'passed' || gr === 'ok';

              if (passed) {
                  setVdidResult('passed');
                  if (results.selfieBase64) {
                      const selfie = results.selfieBase64.startsWith('data:')
                          ? results.selfieBase64
                          : `data:image/jpeg;base64,${results.selfieBase64}`;
                      setVdidSelfie(selfie);
                  }
              } else {
                  setVdidResult('failed');
                  setVdidFailReason(
                      results.globalResultDescription ||
                      'Tu identificación no pudo ser verificada.'
                  );
              }
              setVdidPolling(false);
              return;

          } catch (e: any) {
              console.warn('[VDID] Error consultando resultados, reintentando en 5s:', e);
              setVdidPolling('waiting');
              await new Promise(r => setTimeout(r, POLL_INTERVAL));
          }
      }

      // Timeout: 10 minutos sin respuesta definitiva
      setVdidResult('failed');
      setVdidFailReason('El tiempo de espera se agotó (10 min). Vuelve a escanear tu identificación.');
      setVdidPolling(false);
  };

  /**
   * Inicia la verificación de identidad con Suma México.
   * - Si hay CLIENT_ID + CLIENT_SECRET: flujo rastreado con UUID real.
   * - Si solo hay PUBLIC_KEY: flujo de captura sin registro (respaldo).
   */
  const handleVdidDocumentScan = async () => {
      if (!vdidService.isConfigured()) {
          setVdidError('VITE_VDID_PUBLIC_KEY no está configurada en las variables de entorno.');
          return;
      }
      setVdidError(null);
      setVdidLoading(true);
      try {
          // startTrackedVerification intenta flujo con UUID real;
          // si el endpoint no está habilitado en el plan, cae automáticamente
          // a captura sin UUID (uuid === null).
          const { uuid, url } = await vdidService.startTrackedVerification(
              `licencias-dgo-${idUsuario ?? 'u0'}-${idSolicitud ?? Date.now()}`
          );
          setVdidUuid(uuid ?? `local-${idUsuario ?? 'u0'}-${idSolicitud ?? Date.now()}`);
          setVdidUrl(url);
          setShowVdidModal(true);
      } catch (err: any) {
          setVdidError(err?.message || 'No se pudo iniciar la verificación con Suma México.');
      } finally {
          setVdidLoading(false);
      }
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const [hasDisability, setHasDisability] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);

  // Estado dinámico de documentos (clave dinámica por catálogo) y metadatos
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [fileMeta, setFileMeta] = useState<Record<string, { name: string; size: number; type: string }>>({});

  // Helper: genera una key estable para un item del catálogo
  const keyForItem = (item: any) => `cat_${item.id}`;

  // Catálogo de documentos y controles para opcionales
  const [docsCatalog, setDocsCatalog] = useState<any[]>([]);
  const [optionalEnabled, setOptionalEnabled] = useState<Record<string, boolean>>({});
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoadingCatalog(true);
    catalogService.getDocumentos()
      .then(resp => {
        // El servicio puede devolver varias formas: { data: { catDocumentos: [...] } } o { data: [...] }
        const arr = resp?.data?.catDocumentos ?? resp?.data ?? resp?.catDocumentos ?? resp;
        if (mounted && Array.isArray(arr)) {
          setDocsCatalog(arr);
        }
      })
      .finally(() => mounted && setIsLoadingCatalog(false));

    return () => { mounted = false; };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (errorField === field) setErrorField(null);
    const file = e.target.files?.[0];

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setErrorField(field);
        e.target.value = ''; 
        return;
      }

      // Guardamos metadatos para enviarlos luego
      setFileMeta(prev => ({ ...prev, [field]: { name: file.name, size: file.size, type: file.type } }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setDocs(prev => ({ ...prev, [field]: reader.result as string }));
        setErrorField(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderThumbnail = (base64: string, isError: boolean) => {
    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center text-red-500 animate-in zoom-in duration-200 p-2 text-center">
           <span className="material-symbols-outlined text-4xl mb-1">error</span>
           <span className="text-xs font-bold uppercase">Archivo muy pesado</span>
        </div>
      );
    }
    if (!base64) return <span className="material-symbols-outlined text-4xl text-gray-300">cloud_upload</span>;
    if (base64.startsWith('data:application/pdf')) {
      return (
        <div className="flex flex-col items-center justify-center text-red-500">
           <span className="material-symbols-outlined text-4xl">picture_as_pdf</span>
           <span className="text-[10px] font-bold uppercase">PDF Listo</span>
        </div>
      );
    }
    return <img src={base64} alt="Preview" className="w-full h-full object-cover" />;
  };

  const renderDocumentUpload = (item: any, showHeader: boolean = true) => {
    const fieldKey = keyForItem(item);
    const isError = errorField === fieldKey;
    const hasValue = !!docs[fieldKey];

    let borderClass = "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";
    if (isError) borderClass = "border-red-500 bg-red-50 dark:bg-red-900/20";
    else if (hasValue) borderClass = "border-green-500 bg-green-50 dark:bg-green-900/10";

    const titulo = item.nombre || item.documento || item.titulo || item.nombreDocumento || item.descripcion || `Documento ${item.id}`;
    const descripcion = item.descripcion || item.label || '';
    const isMandatory = isTypeMandatory(item.id);

    return (
      <div key={fieldKey} className="animate-in fade-in zoom-in duration-300"> 
        {/* Título y descripción - solo si showHeader es true */}
        {showHeader && (
          <div className="mb-2 flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={`text-xs font-bold uppercase ${isError ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                {titulo}
                {isMandatory && <span className="text-red-500 ml-1">*</span>}
              </h4>
            </div>
            {/* Icono de ayuda con tooltip para descripción */}
            {descripcion && (
              <div className="group relative flex-shrink-0">
                <span className="material-symbols-outlined text-sm text-gray-400 cursor-help">help</span>
                <div className="invisible group-hover:visible absolute right-0 top-6 z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                  {descripcion}
                  <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload box siempre visible (obligatorio u opcional) */}
        <label className={`h-36 border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer transition-all overflow-hidden relative ${borderClass}`}>
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              className="hidden" 
              onChange={(e) => handleFileChange(e, fieldKey)}
            />
            {renderThumbnail(docs[fieldKey], isError)}

            {/* Meta info */}
            {fileMeta[fieldKey] && (
              <div className="absolute left-2 top-2 text-[10px] text-gray-500 bg-white/80 px-2 py-1 rounded">
                {fileMeta[fieldKey].name} • {(fileMeta[fieldKey].size / 1024).toFixed(0)} KB
              </div>
            )}

            {/* Error message under thumbnail */}
            {isError && (
              <div className="absolute left-2 bottom-2 right-2 text-[11px] text-red-600 bg-red-50 px-2 py-1 rounded">
                Archivo inválido o demasiado grande
              </div>
            )}
        </label>
      </div>
    );
  };

  // Lógica de validación corregida para Cédula (Frente + Reverso)
  const isTypeMandatory = (tipoId: number) => {
    const item = docsCatalog.find(d => Number(d.id) === Number(tipoId));
    if (!item) return false;
    
    // Primero intenta con campos booleanos/string tradicionales
    const v = (item.obligatorio || item.requerido || item.required || item.mandatory || item.mandatorio || item.isRequired)?.toString().toLowerCase();
    if (v === 'si' || v === 'true' || v === '1' || v === 'yes') return true;
    
    // Luego intenta con el campo "estatus" que viene del endpoint
    const estatus = (item.estatus || item.status || '')?.toString().toLowerCase();
    if (estatus === 'obligatorio' || estatus === 'required' || estatus === 'mandatory') return true;
    
    // También verifica idestatus si existe (8 podría significar Obligatorio)
    const idestatus = item.idestatus;
    if (idestatus === 8 || idestatus === '8') return true;
    
    return false;
  };

  // Verifica si un documento debe ser mostrado (solo idestatus 8 y 9)
  const isDocumentActive = (item: any): boolean => {
    const idestatus = item.idestatus;
    return idestatus === 8 || idestatus === 9 || idestatus === '8' || idestatus === '9';
  };

  const isComplete = () => {
    // Requiere verificación VDID aprobada por Suma México
    if (vdidResult !== 'passed') return false;

    if (!docsCatalog || docsCatalog.length === 0) return true;

    // Solo valida docs visibles en pantalla: activos (idestatus 8/9) + no de identidad VDID.
    // Evita que documentos ocultos del catálogo bloqueen el botón.
    const visibleMandatory = docsCatalog.filter(
      (it) =>
        ![8, 9, 11, 12].includes(Number(it.id)) &&
        isDocumentActive(it) &&
        isTypeMandatory(it.id)
    );

    for (const item of visibleMandatory) {
      const k = keyForItem(item);
      if (!docs[k]) return false;
    }

    // Validar documentos opcionales habilitados
    for (const key of Object.keys(optionalEnabled)) {
      if (optionalEnabled[key] && !docs[key]) return false;
    }

    return !errorField;
  };

  // Identificador de tipo de documento por campo (confirma mapeos si hace falta)
  const FIELD_TO_TIPO: Record<string, number | null> = {
    ineFront: 8,
    ineBack: 9,
    passport: 11,
    cedulaFront: 12,
    cedulaBack: 12,
    addressProof: 1,
    birthCertificate: 10,
    disabilityProof: 3 // Asumo 3 (Reconocimiento médico) por defecto
  };

  // Prepara y envía los documentos al padre
  const submitDocuments = () => {
    const documentsArray: any[] = [];

    for (const item of docsCatalog) {
      // Los documentos de ID (INE/Pasaporte) los valida VDID — no se suben manualmente
      if ([8, 9, 11, 12].includes(Number(item.id))) continue;

      const k = keyForItem(item);
      const base64 = docs[k];
      const meta = fileMeta[k];

      if (!isTypeMandatory(item.id) && optionalEnabled[k] === false) continue;

      if (base64) {
        const formato = (meta?.type || '').includes('pdf') ? 'pdf' : ((meta?.type || '').split('/')?.[1] || 'bin');
        documentsArray.push({
          idtipodocumento: item.id,
          formato,
          nombreoriginal: meta?.name || `documento_${item.id}`,
          tamanio: meta?.size || 0,
          archivoBase64: base64.split(',')[1],
          label: item.nombre || item.descripcion || ''
        });
      }
    }

    onContinue({
      documents: documentsArray,
      fileMeta,
      hasDisability,
      optionalEnabled,
      catalog: docsCatalog,
      vdidUuid,                          // UUID de la verificación Suma México
      vdidVerified: vdidResult === 'passed', // flag: identidad verificada
      vdidSelfie,                            // base64 selfie obtenida de /id/v2/results
    });
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark relative">
      
      {/* HEADER */}
      <header className="flex items-center p-4 justify-between sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md z-10 border-b border-gray-100 dark:border-gray-800">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-lg font-bold">Documentación</h2>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-32 pt-4">
          {isLoadingCatalog && (
            <div className="text-sm text-gray-500 mb-4">Cargando catálogo de documentos…</div>
          )}
          
           <div className="space-y-6">
             
             {/* ── Documento de Identificación: siempre vía VDID ── */}
             <div className="space-y-4">
               <h3 className="text-xs font-bold uppercase text-gray-400 mb-3">Verificación de Identidad</h3>

               {/* ── Estado: validando (polling activo) ── */}
               {vdidPolling ? (
                 <div className={`border-2 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-colors duration-500 ${
                   vdidPolling === 'waiting'
                     ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
                     : 'bg-amber-50 dark:bg-amber-900/20 border-amber-400'
                 }`}>
                   <span className={`animate-spin h-10 w-10 border-4 border-t-transparent rounded-full ${
                     vdidPolling === 'waiting' ? 'border-blue-400' : 'border-amber-400'
                   }`} />
                   <div>
                     {vdidPolling === 'waiting' ? (
                       <>
                         <p className="font-bold text-blue-700 dark:text-blue-300 text-base">En espera de resultados…</p>
                         <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                           El servidor todavía está procesando tu verificación.
                           Reintentando automáticamente cada 5 segundos.
                         </p>
                       </>
                     ) : (
                       <>
                         <p className="font-bold text-amber-700 dark:text-amber-300 text-base">Validando identidad…</p>
                         <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                           Suma México está revisando tu identificación. Espera un momento.
                         </p>
                       </>
                     )}
                     {vdidUuid && (
                       <p className={`text-[10px] font-mono break-all mt-2 select-all ${
                         vdidPolling === 'waiting' ? 'text-blue-500 dark:text-blue-400' : 'text-amber-600 dark:text-amber-500'
                       }`}>UUID: {vdidUuid}</p>
                     )}
                   </div>
                 </div>
               ) : vdidResult === 'passed' ? (
                 /* Estado: verificación aprobada */
                 <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
                   {vdidSelfie ? (
                     <img src={vdidSelfie} alt="Selfie verificada" className="w-20 h-20 rounded-full object-cover border-4 border-green-400 shadow-md" />
                   ) : (
                     <span className="material-symbols-outlined text-5xl text-green-500">verified_user</span>
                   )}
                   <div>
                     <p className="font-bold text-green-700 dark:text-green-400 text-base">Identidad Verificada</p>
                     <p className="text-green-600 dark:text-green-500 text-xs mt-1">
                       {vdidSelfie ? 'Selfie y documento obtenidos correctamente.' : 'Tu documento fue validado correctamente por Suma México.'}
                     </p>
                     {vdidUuid && (
                       <p className="text-gray-400 text-[10px] mt-2 font-mono break-all">UUID: {vdidUuid}</p>
                     )}
                   </div>
                   <button
                     onClick={() => { setVdidResult(null); setVdidUuid(null); setVdidSelfie(null); setVdidFailReason(null); }}
                     className="text-[11px] text-gray-500 underline"
                   >Volver a verificar</button>
                 </div>
               ) : vdidResult === 'failed' ? (
                 /* Estado: verificación rechazada */
                 <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
                   <span className="material-symbols-outlined text-5xl text-red-500">gpp_bad</span>
                   <div>
                     <p className="font-bold text-red-700 dark:text-red-400 text-base">Verificación Rechazada</p>
                     <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                       {vdidFailReason || 'Tu identificación no pudo ser verificada por Suma México.'}
                     </p>
                     <p className="text-gray-500 text-xs mt-2">Debes volver a escanear tu identificación oficial.</p>
                     {vdidUuid && (
                       <p className="text-red-400 dark:text-red-500 text-[10px] font-mono break-all mt-2 select-all">UUID: {vdidUuid}</p>
                     )}
                   </div>
                   <button
                     onClick={() => { setVdidResult(null); setVdidUuid(null); setVdidSelfie(null); setVdidFailReason(null); handleVdidDocumentScan(); }}
                     className="w-full max-w-xs h-11 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
                   >
                     <span className="material-symbols-outlined text-lg">refresh</span>
                     Volver a Escanear
                   </button>
                 </div>
               ) : (
                 /* Estado: pendiente de verificación */
                 <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
                   <span className="material-symbols-outlined text-5xl text-gray-400">badge</span>
                   <div>
                     <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">Verificación de Identidad</p>
                     <p className="text-gray-500 text-xs mt-1">
                       Escanea tu identificación oficial con Suma México para validar tu identidad.
                     </p>
                     <p className="text-gray-400 text-[10px] mt-1">Incluye reconocimiento facial y prueba de vida.</p>
                   </div>
                   <button
                     onClick={handleVdidDocumentScan}
                     disabled={vdidLoading}
                     className="w-full max-w-xs h-12 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md"
                   >
                     {vdidLoading
                       ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Iniciando...</>
                       : <><span className="material-symbols-outlined text-lg">document_scanner</span> Iniciar Verificación</>}
                   </button>
                   {vdidError && (
                     <p className="text-red-500 text-xs">{vdidError}</p>
                   )}
                 </div>
               )}
             </div>

             {/* ── Documentos adicionales del catálogo (NO son de identidad) ── */}
             {docsCatalog.length > 0 && (
               <>

                 {/* Documentos Requeridos Adicionales (no son de identificación) */}
                 {docsCatalog.filter((it) => ![8, 9, 11, 12].includes(Number(it.id)) && isTypeMandatory(it.id)).length > 0 && (
                   <div className="space-y-4">
                     <hr className="border-gray-200 dark:border-gray-700 mb-6" />
                     <h3 className="text-xs font-bold uppercase text-gray-400 mb-3">Documentos Requeridos</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {docsCatalog.filter((it) => ![8, 9, 11, 12].includes(Number(it.id)) && isDocumentActive(it) && isTypeMandatory(it.id)).map(item => renderDocumentUpload(item))}
                     </div>
                   </div>
                 )}

                 {/* Documentos Opcionales */}
                 {docsCatalog.filter((it) => ![8, 9, 11, 12].includes(Number(it.id)) && isDocumentActive(it) && !isTypeMandatory(it.id)).length > 0 && (
                   <div className="space-y-4">
                     <h3 className="text-xs font-bold uppercase text-gray-400 mb-3">Documentos Opcionales</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {docsCatalog.filter((it) => ![8, 9, 11, 12].includes(Number(it.id)) && isDocumentActive(it) && !isTypeMandatory(it.id)).map(item => {
                         const fieldKey = keyForItem(item);
                         const isEnabled = optionalEnabled[fieldKey] ?? false;
                         const titulo = item.nombre || item.documento || item.descripcion || `Documento ${item.id}`;
                         const descripcion = item.descripcion || item.label || 'Habilita para adjuntar.';
                         
                         return (
                           <div key={fieldKey} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all flex flex-col h-full">
                             <div className="flex items-start gap-3 flex-1">
                               <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-sm">{titulo}</h4>
                               </div>
                               
                               {/* Icono de ayuda con tooltip para descripción */}
                               {descripcion && (
                                 <div className="group relative flex-shrink-0">
                                   <span className="material-symbols-outlined text-sm text-gray-400 cursor-help">help</span>
                                   <div className="invisible group-hover:visible absolute right-0 top-6 z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                                     {descripcion}
                                     <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                   </div>
                                 </div>
                               )}
                               
                               <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={isEnabled}
                                    onChange={(e) => setOptionalEnabled(prev => ({ ...prev, [fieldKey]: e.target.checked }))}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black dark:peer-checked:bg-white/90"></div>
                               </label>
                             </div>

                             {isEnabled && (
                               <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-4">
                                 {renderDocumentUpload(item, false)}
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 )}
               </>
             )}

             {/* DISCAPACIDAD */}
             <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all mt-4">
               <div className="flex items-start gap-3 mb-4">
                 <div className="flex-1">
                   <h3 className="font-bold text-sm">¿Tienes alguna discapacidad?</h3>
                 </div>
                 
                 {/* Icono de ayuda con tooltip */}
                 <div className="group relative flex-shrink-0">
                   <span className="material-symbols-outlined text-sm text-gray-400 cursor-help">help</span>
                   <div className="invisible group-hover:visible absolute right-0 top-6 z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                     Habilita para adjuntar certificado médico de discapacidad.
                     <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                   </div>
                 </div>
                 
                 <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={hasDisability}
                      onChange={(e) => setHasDisability(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black dark:peer-checked:bg-white/90"></div>
                 </label>
               </div>

               {hasDisability && (
                 <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                   {/* Si el catálogo trae un item para discapacidad lo mostrará arriba; esto es de respaldo */}
                   {renderDocumentUpload({ id: FIELD_TO_TIPO.disabilityProof, nombre: 'Certificado Médico' })}
                 </div>
               )}
             </div>

           </div>
      </main>

      <div className="p-6 absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-20 safe-bottom">
        <button 
          onClick={submitDocuments}
          disabled={!isComplete() || isSubmittingRequest}
          className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmittingRequest ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white dark:border-black"></div>
              Enviando...
            </>
          ) : (
            <>
              Guardar y Continuar
              <span className="material-symbols-outlined">save</span>
            </>
          )}
        </button>
      </div>

      {/* ── MODAL VDID ────────────────────────────────────────────────── */}
      <VdidCaptureModal
          isOpen={showVdidModal}
          onClose={() => setShowVdidModal(false)}
          onCompleted={handleVdidCompleted}
          url={vdidUrl}
          title={'Verificar Identidad'}
          description={'Captura tu documento y realiza la prueba de vida. Al terminar presiona "Listo".'}
      />
    </div>
  );
};

export default DocumentUploadScreen;
