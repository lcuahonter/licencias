import React, { useState, useEffect } from 'react';
import { UserData } from '../types';

interface DocumentUploadScreenProps {
  onBack: () => void;
  onContinue: (data: Partial<UserData>) => void;
  // Si se proporciona, se usarán para subir documentos al endpoint
  idUsuario?: number;
  idSolicitud?: number;
  token?: string;
  onSessionExpired?: () => void;
}

// Tipos de identificación disponibles
type IdType = 'ine' | 'passport' | 'cedula';

const ID_OPTIONS: { id: IdType; label: string; icon: string }[] = [
  { id: 'ine', label: 'INE / IFE', icon: 'id_card' },
  { id: 'passport', label: 'Pasaporte', icon: 'book_2' },
  { id: 'cedula', label: 'Cédula Prof.', icon: 'badge' },
];

import { catalogService } from '../src/api/catalogService';

const DocumentUploadScreen: React.FC<DocumentUploadScreenProps> = ({ onBack, onContinue, idUsuario, idSolicitud, token }) => {
  
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Estado del tipo de ID
  const [selectedIdType, setSelectedIdType] = useState<IdType>('ine');
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
        if (mounted && Array.isArray(arr)) setDocsCatalog(arr);
      })
      .catch(err => console.error('Error cargando catálogo de documentos:', err))
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

  const renderDocumentUpload = (item: any) => {
    const fieldKey = keyForItem(item);
    const isError = errorField === fieldKey;
    const hasValue = !!docs[fieldKey];

    let borderClass = "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";
    if (isError) borderClass = "border-red-500 bg-red-50 dark:bg-red-900/20";
    else if (hasValue) borderClass = "border-green-500 bg-green-50 dark:bg-green-900/10";

    const label = item.nombre || item.nombreDocumento || item.descripcion || item.label || `Documento ${item.id}`;
    const isMandatory = isTypeMandatory(item.id);

    return (
      <div key={fieldKey} className="animate-in fade-in zoom-in duration-300"> 
        <div className="flex items-center justify-between mb-2">
          <label className={`text-xs font-bold uppercase ${isError ? 'text-red-500' : 'text-gray-400'}`}>{label}</label>
          <div className={`text-[10px] font-bold px-2 py-1 rounded ${isMandatory ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{isMandatory ? 'Obligatorio' : 'Opcional'}</div>
        </div>

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

            {/* Optional toggle for optional docs */}
            {!isMandatory && (
              <div className="absolute right-2 top-2">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={!!optionalEnabled[fieldKey]} onChange={(e) => setOptionalEnabled(prev => ({ ...prev, [fieldKey]: e.target.checked }))} />
                </label>
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
    const v = (item.obligatorio || item.requerido || item.required || item.mandatory || item.mandatorio || item.isRequired || item.requerido)?.toString().toLowerCase();
    if (!v) return false;
    return v === 'si' || v === 'true' || v === '1' || v === 'yes';
  };

  const isIdComplete = () => {
    // INE logic: if any of INE types are mandatory (8 or 9 or 5) require both
    const ineFrontMandatory = isTypeMandatory(FIELD_TO_TIPO.ineFront!);
    const ineBackMandatory = isTypeMandatory(FIELD_TO_TIPO.ineBack!);
    const ineMandatory = ineFrontMandatory || ineBackMandatory;

    if (selectedIdType === 'ine') {
      if (ineMandatory) return !!docs.ineFront && !!docs.ineBack;
      return true; // optional
    }

    // Passport
    const passportMandatory = isTypeMandatory(FIELD_TO_TIPO.passport!);
    if (selectedIdType === 'passport') {
      if (passportMandatory) return !!docs.passport;
      return true;
    }

    // Cedula
    const cedulaMandatory = isTypeMandatory(FIELD_TO_TIPO.cedulaFront!);
    if (selectedIdType === 'cedula') {
      if (cedulaMandatory) return !!docs.cedulaFront && !!docs.cedulaBack;
      return true;
    }

    return true;
  };

  const isComplete = () => {
    if (!docsCatalog || docsCatalog.length === 0) return true; // Si no hay catálogo, no bloqueamos

    // Para cada item obligatorio del catálogo requerimos que exista archivo
    for (const item of docsCatalog) {
      if (!isTypeMandatory(item.id)) continue;
      const k = keyForItem(item);
      if (!docs[k]) return false;
    }

    // También se valida la selección de ID (si el catálogo requiere algún ID específico se considera ya en lo anterior)
    if (!isIdComplete()) return false;

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



  // Prepara y envía los documentos al padre como arreglo con el id de tipo
  const submitDocuments = () => {
    const documentsArray: any[] = [];

    for (const item of docsCatalog) {
      const k = keyForItem(item);
      const base64 = docs[k];
      const meta = fileMeta[k];

      // Si es opcional y no está habilitado por el usuario, lo ignoramos
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

    // Envío al padre: ahora documents es un arreglo con objetos (más robusto)
    onContinue({ documents: documentsArray, fileMeta, hasDisability, selectedIdType, optionalEnabled, catalog: docsCatalog });
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
          
           {/* SELECTOR DE TIPO DE ID */}
           <div className="mb-8">
              <p className="text-xs font-bold uppercase text-gray-400 mb-3">Tipo de Identificación</p>
              <div className="grid grid-cols-3 gap-3">
                {ID_OPTIONS.map((opt) => {
                  const isSelected = selectedIdType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedIdType(opt.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200 ${
                        isSelected 
                          ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black shadow-lg scale-[1.02]' 
                          : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl mb-1">{opt.icon}</span>
                      <span className="text-[10px] font-bold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
           </div>

           <div className="space-y-6">
             
             {/* CAMPOS DINÁMICOS (Derivados del catálogo) */}

             {docsCatalog.length > 0 ? (
               <>
                 {/* Separamos por obligatorios y opcionales para mejor UX */}
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase text-gray-400 mb-3">Documentos Requeridos</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {docsCatalog.filter((it) => isTypeMandatory(it.id)).map(item => renderDocumentUpload(item))}
                   </div>
                 </div>

                 <hr className="border-gray-200 dark:border-gray-700 my-6" />

                 <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase text-gray-400 mb-3">Documentos Opcionales</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {docsCatalog.filter((it) => !isTypeMandatory(it.id)).map(item => renderDocumentUpload(item))}
                   </div>
                 </div>
               </>
             ) : (
               <div className="text-sm text-gray-500">No hay información del catálogo. Puedes continuar con los documentos básicos.</div>
             )}

             {/* DISCAPACIDAD */}
             <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all mt-4">
               <div className="flex items-center justify-between mb-4">
                 <div>
                   <h3 className="font-bold text-sm">¿Tienes alguna discapacidad?</h3>
                   <p className="text-xs text-gray-500">Habilita para adjuntar certificado.</p>
                 </div>
                 
                 <label className="relative inline-flex items-center cursor-pointer">
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
          disabled={!isComplete()}
          className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Guardar y Continuar
          <span className="material-symbols-outlined">save</span>
        </button>
      </div>
    </div>
  );
};

export default DocumentUploadScreen;