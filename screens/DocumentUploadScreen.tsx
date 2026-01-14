import React, { useState } from 'react';
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

import { documentService } from '../src/api/documentService';

const DocumentUploadScreen: React.FC<DocumentUploadScreenProps> = ({ onBack, onContinue, idUsuario, idSolicitud, token }) => {
  
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Estado del tipo de ID
  const [selectedIdType, setSelectedIdType] = useState<IdType>('ine');
  const [hasDisability, setHasDisability] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);

  // Estado de documentos (base64) y metadatos del archivo (original)
  const [docs, setDocs] = useState<Record<string, string>>({
    ineFront: '',
    ineBack: '',
    passport: '',
    cedulaFront: '', // Frente
    cedulaBack: '',  // Reverso
    addressProof: '',
    birthCertificate: '',
    disabilityProof: ''
  });

  const [fileMeta, setFileMeta] = useState<Record<string, { name: string; size: number; type: string }>>({});

  // Estados para subir uno-a-uno y mostrar resultado por campo
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

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

  const renderDocumentUpload = (label: string, fieldKey: string) => {
    const isError = errorField === fieldKey;
    const hasValue = !!docs[fieldKey];
    const status = uploadStatus[fieldKey] || 'idle';
    const errorMsg = uploadErrors[fieldKey];

    let borderClass = "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";
    if (isError) borderClass = "border-red-500 bg-red-50 dark:bg-red-900/20";
    else if (hasValue) borderClass = "border-green-500 bg-green-50 dark:bg-green-900/10";

    return (
      <div className="animate-in fade-in zoom-in duration-300"> 
        <label className={`text-xs font-bold uppercase mb-2 block ${isError ? 'text-red-500' : 'text-gray-400'}`}>
          {label}
        </label>
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

            {/* Upload status indicator */}
            <div className="absolute right-2 top-2 flex items-center gap-2">
              {status === 'uploading' && <span className="material-symbols-outlined animate-spin text-gray-500">autorenew</span>}
              {status === 'success' && <span className="material-symbols-outlined text-green-600">check_circle</span>}
              {status === 'error' && (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-red-500">error</span>
                  <button onClick={(e) => { e.stopPropagation(); uploadSingle(fieldKey); }} className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded">Reintentar</button>
                </div>
              )}
            </div>

            {/* Error message under thumbnail */}
            {errorMsg && (
              <div className="absolute left-2 bottom-2 right-2 text-[11px] text-red-600 bg-red-50 px-2 py-1 rounded">
                {errorMsg}
              </div>
            )}
        </label>
      </div>
    );
  };

  // Lógica de validación corregida para Cédula (Frente + Reverso)
  const isIdComplete = () => {
    switch (selectedIdType) {
      case 'ine': 
        return docs.ineFront && docs.ineBack;
      case 'passport': 
        return docs.passport;
      case 'cedula': 
        return docs.cedulaFront && docs.cedulaBack; // Ahora requiere ambos
      default: 
        return false;
    }
  };

  const isComplete = 
    isIdComplete() && 
    docs.addressProof && 
    docs.birthCertificate &&
    (!hasDisability || docs.disabilityProof) &&
    !errorField; // listo para enviar localmente o al backend

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

  // Sube un archivo individualmente y maneja estados por campo
  const uploadSingle = async (fieldKey: string) => {
    const base64 = docs[fieldKey];
    if (!base64) return { success: false, message: 'No file' };

    const meta = fileMeta[fieldKey] || { name: 'unknown', size: 0, type: 'application/octet-stream' };
    const tipo = FIELD_TO_TIPO[fieldKey] ?? null;

    if (!tipo) {
      console.warn(`Skipping upload for ${fieldKey}: no tipo asignado`);
      return { success: false, message: 'Tipo no asignado' };
    }

    const formato = meta.type.includes('pdf') ? 'pdf' : (meta.type.split('/')[1] || 'bin');

    const payload = {
      idusuario: idUsuario,
      idsolicitud: idSolicitud || 1, // por pruebas usar 1 si no existe
      idtipodocumento: tipo,
      formato,
      nombreoriginal: meta.name,
      tamanio: meta.size,
      archivoBase64: base64.split(',')[1]
    };

    try {
      setUploadStatus(prev => ({ ...prev, [fieldKey]: 'uploading' }));
      setUploadErrors(prev => ({ ...prev, [fieldKey]: null }));

      await documentService.createDocumento(payload, token);

      setUploadStatus(prev => ({ ...prev, [fieldKey]: 'success' }));
      setUploadedCount(prev => prev + 1);
      return { success: true };
    } catch (err: any) {
      console.error(`Error subiendo ${fieldKey}:`, err);

      // Si es error de autenticación, notificar y forzar expiración de sesión
    

      setUploadStatus(prev => ({ ...prev, [fieldKey]: 'error' }));
//Esto es prueba
      // Intentamos extraer información útil del error (internalCode, data.error, message)
      const internal = err.internalCode || err.code || null;
      const backendDetail = err.data?.error || err.data?.message || err.message || 'Error al subir';
      const composed = internal ? `${internal} - ${backendDetail}` : backendDetail;

      setUploadErrors(prev => ({ ...prev, [fieldKey]: composed }));
      return { success: false, message: composed };
    }
  };

  // Sube archivos uno por uno para poder mostrar resultados individuales
  const uploadDocuments = async () => {
    if (!idUsuario || !token) {
      onContinue({ documents: docs, hasDisability, selectedIdType });
      return;
    }

    setIsUploading(true);
    setUploadedCount(0);

    const fields = Object.keys(docs);

    for (let i = 0; i < fields.length; i++) {
      const fieldKey = fields[i];
      if (!docs[fieldKey]) continue; // saltar sin archivo

      // Reset status if starting
      setUploadStatus(prev => ({ ...prev, [fieldKey]: 'idle' }));

      // Esperamos al resultado del upload individual
      await uploadSingle(fieldKey);
    }

    setIsUploading(false);

    // Verificamos si hubo errores
    const failedFields = Object.keys(docs).filter(k => uploadStatus[k] === 'error');

    if (failedFields.length > 0) {
      alert(`${failedFields.length} archivo(s) fallaron al subir. Revisa los errores y reintenta.`);
      return; // no avanzamos automáticamente
    }

    // Si todo salió bien, notificamos al padre
    onContinue({ documents: docs, hasDisability, selectedIdType });
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
             
             {/* CAMPOS DINÁMICOS */}
             {selectedIdType === 'ine' && (
               <>
                 {renderDocumentUpload('INE (Frente)', 'ineFront')}
                 {renderDocumentUpload('INE (Reverso)', 'ineBack')}
               </>
             )}

             {selectedIdType === 'passport' && (
               renderDocumentUpload('Foto de Pasaporte', 'passport')
             )}

             {/* Cédula ahora muestra Frente y Reverso */}
             {selectedIdType === 'cedula' && (
               <>
                  {renderDocumentUpload('Cédula Prof. (Frente)', 'cedulaFront')}
                  {renderDocumentUpload('Cédula Prof. (Reverso)', 'cedulaBack')}
               </>
             )}

             <hr className="border-gray-200 dark:border-gray-700 my-6" />

             {/* DOCUMENTOS COMUNES */}
             {renderDocumentUpload('Comprobante de Domicilio', 'addressProof')}
             {renderDocumentUpload('Acta de Nacimiento', 'birthCertificate')}

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
                   {renderDocumentUpload('Certificado Médico', 'disabilityProof')}
                 </div>
               )}
             </div>

           </div>
      </main>

      <div className="p-6 absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-20 safe-bottom">
        <button 
          onClick={uploadDocuments}
          disabled={!isComplete || isUploading}
          className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? `Subiendo (${uploadedCount}/${Object.keys(docs).filter(k => docs[k]).length})...` : 'Guardar y Continuar'}
          <span className="material-symbols-outlined">save</span>
        </button>
      </div>
    </div>
  );
};

export default DocumentUploadScreen;