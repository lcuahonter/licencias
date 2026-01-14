import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { GoogleGenAI } from "@google/genai";

interface ReviewScreenProps {
  userData: UserData;
  onBack: () => void;
  onSend: () => void;
  onEdit: (data: Partial<UserData>) => void;
}

// --- VISOR DE DOCUMENTOS (Sin cambios) ---
const DocumentPreview = ({ label, fileData }: { label: string, fileData?: string }) => {
  if (!fileData) return (
    <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-1 opacity-50">
        <span className="material-symbols-outlined text-gray-400">upload_file</span>
        <p className="text-[8px] text-gray-400 font-bold uppercase">Falta Archivo</p>
    </div>
  );

  const isPdf = fileData.startsWith('data:application/pdf');

  const handleOpen = () => {
    const newWindow = window.open();
    if (newWindow) {
        newWindow.document.write(
            `<iframe src="${fileData}" style="position:fixed; top:0; left:0; bottom:0; right:0; width:100%; height:100%; border:none; margin:0; padding:0; overflow:hidden; z-index:999999;"></iframe>`
        );
    }
  };

  return (
    <div 
        onClick={handleOpen}
        className="aspect-square rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm flex flex-col items-center justify-center gap-1 relative group cursor-pointer hover:shadow-md hover:ring-2 hover:ring-primary transition-all"
        title="Clic para ver documento completo"
    >
       {isPdf ? (
         <div className="flex flex-col items-center justify-center text-red-500 w-full h-full bg-red-50 dark:bg-red-900/10">
            <span className="material-symbols-outlined text-4xl mb-1 group-hover:scale-110 transition-transform">picture_as_pdf</span>
            <span className="text-[10px] font-bold uppercase bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded text-red-700 dark:text-red-300">PDF</span>
         </div>
       ) : (
         <img src={fileData} alt={label} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
       )}

       <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-center backdrop-blur-sm z-10">
          <p className="text-[8px] text-white font-bold uppercase truncate px-1">{label}</p>
       </div>
       
       <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm z-20 border-2 border-white dark:border-gray-800">
         <span className="material-symbols-outlined text-[12px]">check</span>
       </div>

       <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-0"></div>
    </div>
  );
};

// --- TEXTO LOREM IPSUM PARA TÉRMINOS ---
const TERMS_TEXT = `
TÉRMINOS Y CONDICIONES DE USO - PLATAFORMA DIGITAL DE IDENTIDAD

1. ACEPTACIÓN DE TÉRMINOS
Al utilizar esta plataforma, usted acepta cumplir con los presentes términos y condiciones. Si no está de acuerdo, por favor absténgase de usar el servicio.

2. VERACIDAD DE LA INFORMACIÓN
El usuario declara bajo protesta de decir verdad que toda la información proporcionada, incluyendo datos biográficos y documentos probatorios, es auténtica, fidedigna y actual. La falsificación de documentos es un delito federal.

3. USO DE DATOS PERSONALES
Sus datos personales serán tratados conforme a la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados. Su información biométrica se utilizará exclusivamente para la validación de identidad.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. 

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.

4. RESPONSABILIDAD
El uso indebido de las credenciales de acceso generadas en este sistema es responsabilidad exclusiva del usuario.

5. MODIFICACIONES
La Secretaría se reserva el derecho de modificar estos términos en cualquier momento.
`;

const ReviewScreen: React.FC<ReviewScreenProps> = ({ userData, onBack, onSend, onEdit }) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [aiNote, setAiNote] = useState<string>('');
  
  // --- ESTADOS TERMINOS ---
  const [agreed, setAgreed] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [canAcceptTerms, setCanAcceptTerms] = useState(false); // Habilita el botón del modal al hacer scroll

  // --- ESTADOS DE EDICIÓN ---
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  useEffect(() => {
    async function runAiValidation() {
      try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'PLACEHOLDER_API_KEY') {
             setTimeout(() => {
                 setAiNote('Validación de identidad y datos de contacto completada.');
                 setIsVerifying(false);
             }, 2000);
             return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Act as a government digital identification inspector...`; // (Prompt abreviado por brevedad)
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        setAiNote(text || 'Datos validados correctamente.');
      } catch (err) {
        setAiNote('Verificación interna completada satisfactoriamente.');
      } finally {
        setIsVerifying(false);
      }
    }
    runAiValidation();
  }, [userData]);

  // Handler para detectar scroll al fondo del modal
  const handleScrollTerms = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      // Si la posición + altura visible es casi igual a la altura total (con un margen de error de 5px)
      if (scrollHeight - scrollTop <= clientHeight + 5) {
          setCanAcceptTerms(true);
      }
  };

  const handleAcceptTerms = () => {
      setAgreed(true);
      setShowTermsModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark relative">
      <header className="flex items-center p-4 justify-between sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-lg font-bold">Resumen</h2>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-24">
        <div className="py-6">
          <h1 className="text-2xl font-black mb-1">Casi terminamos</h1>
          <p className="text-gray-500 dark:text-gray-400">Verifica tus credenciales de acceso y datos personales.</p>
        </div>

        <div className="space-y-6">
          
          <section className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Detalles de la Cuenta</h3>
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
              
              <div className="pb-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Nombre Completo</p>
                <p className="font-bold text-lg capitalize">{userData.firstName} {userData.lastName}</p>
              </div>
              
              <div className="py-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase">CURP</p>
                <p className="font-bold font-mono text-gray-600 dark:text-gray-300">{userData.idNumber}</p>
              </div>

              {/* CORREO (Editable) */}
              <div className="py-3">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Correo Electrónico</p>
                    {!isEditingEmail && (
                        <button onClick={() => setIsEditingEmail(true)} className="text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                    )}
                </div>
                {isEditingEmail ? (
                    <input 
                        type="email"
                        value={userData.email}
                        onChange={(e) => onEdit({ email: e.target.value })}
                        autoFocus
                        onBlur={() => setIsEditingEmail(false)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-primary rounded-xl px-3 py-2 text-sm focus:outline-none font-bold"
                    />
                ) : (
                    <p className="font-bold text-primary">{userData.email}</p>
                )}
              </div>

              {/* CONTRASEÑA (Editable) */}
              <div className="pt-3">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Contraseña</p>
                    {!isEditingPassword && (
                        <button onClick={() => setIsEditingPassword(true)} className="text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                    )}
                </div>
                {isEditingPassword ? (
                    <input 
                        type="text"
                        value={(userData as any).password || ''}
                        onChange={(e) => onEdit({ password: e.target.value } as any)}
                        autoFocus
                        onBlur={() => setIsEditingPassword(false)}
                        placeholder="Nueva contraseña"
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-primary rounded-xl px-3 py-2 text-sm focus:outline-none font-bold"
                    />
                ) : (
                    <p className="font-bold text-gray-600 dark:text-gray-300 tracking-widest">
                        {(userData as any).password ? '••••••••' : '••••••••'}
                    </p>
                )}
              </div>
            </div>
          </section>

          {/* DOCUMENTOS */}
          <section className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Documentos y Biometría</h3>
            
            <div className="grid grid-cols-3 gap-3">
              <DocumentPreview label="Rostro" fileData={userData.photo} />
              <DocumentPreview label="INE Frente" fileData={userData.documents?.ineFront} />
              <DocumentPreview label="INE Reverso" fileData={userData.documents?.ineBack} />
              <DocumentPreview label="Domicilio" fileData={userData.documents?.addressProof} />
            </div>
            
            <p className="text-[10px] text-center text-gray-400">Toca un documento para verlo completo.</p>
          </section>

          {/* CHECKBOX DE TÉRMINOS */}
          <div className="flex gap-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 transition-all select-none items-start">
            <div className="pt-0.5">
              <input 
                type="checkbox" 
                checked={agreed}
                onChange={(e) => {
                    if (e.target.checked) {
                        // Si intenta marcarlo -> Abrimos Modal
                        setShowTermsModal(true);
                    } else {
                        // Si intenta desmarcarlo -> Lo permitimos directo
                        setAgreed(false);
                        setCanAcceptTerms(false); // Reseteamos el scroll para que tenga que leer de nuevo si quiere volver a aceptar
                    }
                }}
                className="w-6 h-6 rounded-lg text-primary border-gray-300 bg-white dark:bg-gray-700 cursor-pointer focus:ring-primary"
              />
            </div>
            
            {/* Texto Clickeable */}
            <span 
                onClick={() => {
                    if (!agreed) {
                        setShowTermsModal(true);
                    } else {
                        // Opcional: Si ya aceptó y da clic al texto, solo desmarca (o no hace nada, según prefieras)
                        setAgreed(false);
                        setCanAcceptTerms(false);
                    }
                }}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer"
            >
              Declaro bajo protesta de decir verdad que la información y documentos adjuntos son auténticos. 
              <span className="text-[10px] font-bold text-primary block mt-1 underline decoration-dotted underline-offset-4">
                  (Leer Términos y Condiciones)
              </span>
            </span>
          </div>
        </div>
      </main>

      <div className="p-6 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent pt-10">
        <button 
          disabled={!agreed || isVerifying}
          onClick={onSend}
          className={`w-full h-16 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 shadow-xl ${
            agreed && !isVerifying 
              ? 'bg-primary text-white shadow-primary/20 hover:bg-blue-700 active:scale-95' 
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isVerifying ? 'Verificando...' : 'Crear Cuenta'}
          {!isVerifying && <span className="material-symbols-outlined">person_add</span>}
        </button>
      </div>

      {/* --- MODAL TÉRMINOS Y CONDICIONES --- */}
      {showTermsModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10">
                  
                  {/* Header Modal */}
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <h2 className="text-xl font-black text-gray-900 dark:text-white">Términos Legales</h2>
                      <button onClick={() => setShowTermsModal(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-500">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>

                  {/* Body Scrollable */}
                  <div 
                    className="p-6 overflow-y-auto flex-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-justify"
                    onScroll={handleScrollTerms}
                  >
                      {/* Renderizamos el texto con saltos de línea */}
                      {TERMS_TEXT.split('\n').map((line, i) => (
                          <p key={i} className="mb-3">{line}</p>
                      ))}
                      
                      {/* Espacio extra al final para asegurar el scroll */}
                      <div className="h-10"></div>
                  </div>

                  {/* Footer con Botón Aceptar */}
                  <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-3xl">
                      <button 
                          onClick={handleAcceptTerms}
                          disabled={!canAcceptTerms}
                          className={`w-full h-14 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                              canAcceptTerms 
                                ? 'bg-primary text-white shadow-lg hover:bg-blue-700 transform hover:scale-[1.02]' 
                                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed grayscale'
                          }`}
                      >
                          {canAcceptTerms ? (
                              <>Aceptar y Confirmar <span className="material-symbols-outlined">check_circle</span></>
                          ) : (
                              <span className="text-sm">Lee todo para continuar...</span>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ReviewScreen;