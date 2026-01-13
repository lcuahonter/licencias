import React, { useState } from 'react';
import { UserData } from '../types';

interface DocumentUploadScreenProps {
  onBack: () => void;
  onContinue: (data: Partial<UserData>) => void;
}

// Tipos de identificación disponibles
type IdType = 'ine' | 'passport' | 'cedula';

const ID_OPTIONS: { id: IdType; label: string; icon: string }[] = [
  { id: 'ine', label: 'INE / IFE', icon: 'id_card' },
  { id: 'passport', label: 'Pasaporte', icon: 'book_2' },
  { id: 'cedula', label: 'Cédula Prof.', icon: 'badge' },
];

const DocumentUploadScreen: React.FC<DocumentUploadScreenProps> = ({ onBack, onContinue }) => {
  
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Estado del tipo de ID
  const [selectedIdType, setSelectedIdType] = useState<IdType>('ine');
  const [hasDisability, setHasDisability] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);

  // Estado de documentos actualizado
  const [docs, setDocs] = useState<Record<string, string>>({
    ineFront: '',
    ineBack: '',
    passport: '',
    cedulaFront: '', // Actualizado: Frente
    cedulaBack: '',  // Nuevo: Reverso
    addressProof: '',
    birthCertificate: '',
    disabilityProof: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (errorField === field) setErrorField(null);
    const file = e.target.files?.[0];

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setErrorField(field);
        e.target.value = ''; 
        return;
      }
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
    !errorField;

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
          onClick={() => onContinue({ 
            documents: docs, 
            hasDisability,
            selectedIdType 
          })}
          disabled={!isComplete}
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