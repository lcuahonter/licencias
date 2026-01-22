// Archivo: src/components/FileUploader.tsx

import React, { useState } from 'react';

interface FileUploaderProps {
  documentName: string;
  onBack: () => void;
  onUploadComplete: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ documentName, onBack, onUploadComplete }) => {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  const handleUpload = () => {
    setStatus('uploading');
    
    // Simulamos una carga de 2 segundos
    setTimeout(() => {
      setStatus('success');
      
      // Esperamos 1.5 segundos mostrando el éxito antes de volver
      setTimeout(() => {
        onUploadComplete();
      }, 1500);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-dark">
      {/* Header simple */}
      <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <span className="material-symbols-outlined text-gray-900 dark:text-white">close</span>
        </button>
        <h3 className="font-bold text-lg ml-2 text-gray-900 dark:text-white">Subir Documento</h3>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        
        {status === 'idle' && (
          <div className="w-full max-w-sm animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl">upload_file</span>
            </div>
            <h2 className="text-2xl font-black mb-2 text-gray-900 dark:text-white">Cargar PDF</h2>
            <p className="text-gray-500 mb-8">
              Sube tu <strong className="text-primary">{documentName}</strong>. Asegúrate que sea legible y no pese más de 5MB.
            </p>

            <div 
              onClick={handleUpload}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-primary cursor-pointer transition-all group"
            >
              <span className="material-symbols-outlined text-4xl text-gray-300 group-hover:text-primary mb-2 transition-colors">cloud_upload</span>
              <p className="font-bold text-gray-600 dark:text-gray-300">Toca para seleccionar archivo</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG o PNG</p>
            </div>
          </div>
        )}

        {status === 'uploading' && (
          <div className="w-full max-w-xs text-center">
             <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Subiendo archivo...</h3>
             <p className="text-sm text-gray-400">Por favor no cierres la aplicación.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="w-full max-w-xs text-center animate-bounce-short">
             <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                <span className="material-symbols-outlined text-5xl">check</span>
             </div>
             <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">¡Carga Exitosa!</h3>
             <p className="text-sm text-gray-500">Documento procesado correctamente.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default FileUploader;
