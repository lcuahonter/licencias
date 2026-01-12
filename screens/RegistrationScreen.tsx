import React, { useState, useRef } from 'react';
import MD5 from 'crypto-js/md5'; // <--- CAMBIO: Importamos MD5
import { UserData } from '../types';
import { fetchCurpData } from '../src/utils/curpHelpers';

interface RegistrationScreenProps {
  userData: UserData;
  onBack: () => void;
  onContinue: (data: Partial<UserData>) => void;
}

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ userData, onBack, onContinue }) => {
  // Estado del formulario
  const [form, setForm] = useState({
    email: userData.email || '',
    password: '',
    firstName: userData.firstName || '',
    paternalName: userData.paternalName || '',
    maternalName: userData.maternalName || '',
    idNumber: userData.idNumber || '',
    birthDate: userData.birthDate || '',
  });

  // Estados de control visual
  const [loadingCurp, setLoadingCurp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [lastFetchedCurp, setLastFetchedCurp] = useState('');

  // --- ESTADOS PARA EL MODAL DE ERROR ---
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Referencias para Auto-Focus
  const inputRefs = {
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    idNumber: useRef<HTMLInputElement>(null),
    firstName: useRef<HTMLInputElement>(null),
    paternalName: useRef<HTMLInputElement>(null),
    maternalName: useRef<HTMLInputElement>(null),
    birthDate: useRef<HTMLInputElement>(null),
  };

  const CURP_REGEX = /^[A-Z]{4}\d{6}[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/;
  const NAME_REGEX = /^[A-ZÑ\s]*$/;

  // --- FUNCIÓN HELPER: HACER FOCUS AL PRIMER ERROR ---
  const focusOnError = (errorList: { [key: string]: string }) => {
      const errorKeys = Object.keys(errorList);
      if (errorKeys.length === 0) return;

      const fieldOrder = ['email', 'password', 'idNumber', 'firstName', 'paternalName', 'maternalName', 'birthDate'];
      const firstErrorField = fieldOrder.find(field => errorKeys.includes(field));

      if (firstErrorField) {
          // @ts-ignore
          const ref = inputRefs[firstErrorField];
          if (ref && ref.current) {
              ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
              ref.current.focus();
          }
      }
  };

  // --- HANDLERS DE INPUTS ---
  const handleNameInput = (field: 'firstName' | 'paternalName' | 'maternalName', value: string) => {
    const upperValue = value.toUpperCase();
    if (NAME_REGEX.test(upperValue)) {
      setForm(prev => ({ ...prev, [field]: upperValue }));
      if (errors[field]) setErrors(prev => {
          const newErr = { ...prev };
          delete newErr[field];
          return newErr;
      });
    }
  };

  const handleCurpInput = (value: string) => {
    const upperValue = value.toUpperCase();
    if (/^[A-Z0-9Ñ]*$/.test(upperValue) && upperValue.length <= 18) {
      setForm(prev => ({ ...prev, idNumber: upperValue }));
      if (errors.idNumber) {
          setErrors(prev => {
              const newErr = { ...prev };
              delete newErr.idNumber;
              return newErr;
          });
      }
    }
  };

  // --- VALIDACIÓN FRONTEND ---
  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!form.email || !form.email.includes('@')) newErrors.email = 'Correo inválido';
    if (!form.password || form.password.length < 4) newErrors.password = 'Mínimo 4 caracteres';
    
    if (!form.idNumber) {
        newErrors.idNumber = 'La CURP es requerida';
    } else if (form.idNumber.length !== 18) {
        newErrors.idNumber = 'Debe tener 18 caracteres exactos';
    } else if (!CURP_REGEX.test(form.idNumber)) {
       newErrors.idNumber = 'Formato de CURP inválido.';
    }

    if (!form.firstName.trim()) newErrors.firstName = 'Nombre requerido';
    if (!form.paternalName.trim()) newErrors.paternalName = 'Apellido P. requerido';
    
    if (!form.birthDate) newErrors.birthDate = 'Fecha requerida';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
        focusOnError(newErrors);
        return false;
    }
    return true;
  };

  const handleCurpBlur = async () => {
    if (CURP_REGEX.test(form.idNumber) && form.idNumber !== lastFetchedCurp) {
      setLoadingCurp(true);
      const result = await fetchCurpData(form.idNumber);
      setLoadingCurp(false);

      if (result.success && result.data) {
        setLastFetchedCurp(form.idNumber);
        setForm(prev => ({
          ...prev,
          firstName: result.data.firstName || prev.firstName, 
          paternalName: result.data.paternalName || prev.paternalName,
          maternalName: result.data.maternalName || prev.maternalName,
          birthDate: result.data.birthDate || prev.birthDate
        }));
        setErrors({});
      }
    }
  };

  // =========================================================
  //  LOGICA PRINCIPAL (MODIFICADA PARA MD5)
  // =========================================================
  const handleContinue = async () => {
    // 1. Validación local (Frontend)
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
        // --- CAMBIO: ENCRIPTADO MD5 ---
        // Generamos el hash MD5 de la contraseña
        const md5Password = MD5(form.password).toString();

        const payload = {
            tipoUsuario: 3,                 
            nombres: form.firstName,
            apellidopaterno: form.paternalName,
            apellidomaterno: form.maternalName,
            curp: form.idNumber,
            email: form.email,
            password: md5Password, // Enviamos el hash MD5
            fechanacimiento: form.birthDate 
        };

        console.log("Enviando datos...", payload);
        
        const response = await fetch('http://localhost:3001/api/usuarios/createUsuario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // --- MANEJO DE RESPUESTA ---
        if (!response.ok || (data.code && data.code !== "200")) {
            
            // ERROR 550 (Validación Backend)
            if (data.code === "550" && data.data && data.data.errores) {
                const backendErrors = data.data.errores;

                // A. Modal de Error Crítico
                if (backendErrors.necesarios) {
                    setErrorMessage(backendErrors.necesarios); 
                    setShowErrorModal(true); 
                    setIsSubmitting(false); 
                    return; 
                }

                // B. Mapeo de errores de campos
                const mappedErrors: { [key: string]: string } = {};
                if (backendErrors.email) mappedErrors.email = backendErrors.email;
                if (backendErrors.password) mappedErrors.password = backendErrors.password;
                if (backendErrors.curp) mappedErrors.idNumber = backendErrors.curp;
                if (backendErrors.nombres) mappedErrors.firstName = backendErrors.nombres;
                if (backendErrors.apellidopaterno) mappedErrors.paternalName = backendErrors.apellidopaterno;
                if (backendErrors.apellidomaterno) mappedErrors.maternalName = backendErrors.apellidomaterno;
                if (backendErrors.fechanacimiento) mappedErrors.birthDate = backendErrors.fechanacimiento;

                setErrors(mappedErrors);
                focusOnError(mappedErrors);

                return; 
            }

            throw new Error(data.message || 'Error desconocido.');
        }

        // --- ÉXITO ---
        console.log("✅ Registrado:", data.id_usuario);
        alert("¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
        onBack(); 

    } catch (error: any) {
        console.error("❌ Error:", error);
        alert(`Ocurrió un error inesperado: ${error.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark relative">
      
      {/* HEADER */}
      <header className="safe-top px-6 pt-8 pb-6 flex items-center justify-between bg-white dark:bg-surface-dark shadow-sm sticky top-0 z-10">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full w-32 overflow-hidden">
          <div className="h-full bg-primary w-1/4"></div>
        </div>
        <div className="w-10"></div>
      </header>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto px-6 pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <div className="py-4">
          <h1 className="text-2xl font-black mb-1 text-gray-900 dark:text-white">Crear Perfil</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Ingresa tus datos de acceso y personales.</p>
        </div>

        <div className="space-y-6">
            <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Credenciales</h3>
                
                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Correo Electrónico</label>
                    <input ref={inputRefs.email} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="ejemplo@correo.com" className={`w-full h-14 bg-white dark:bg-gray-800 border-2 rounded-2xl px-4 focus:border-primary outline-none transition-all ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-100 dark:border-gray-700'}`} />
                    {errors.email && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Contraseña</label>
                    <input ref={inputRefs.password} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" className={`w-full h-14 bg-white dark:bg-gray-800 border-2 rounded-2xl px-4 focus:border-primary outline-none transition-all ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-100 dark:border-gray-700'}`} />
                    {errors.password && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{errors.password}</p>}
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Datos Personales</h3>
                
                <div className="space-y-1.5 relative">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">CURP</label>
                    <input ref={inputRefs.idNumber} value={form.idNumber} onChange={e => handleCurpInput(e.target.value)} onBlur={handleCurpBlur} maxLength={18} placeholder="ABCD990101H..." className={`w-full h-14 bg-white dark:bg-gray-800 border-2 rounded-2xl px-4 focus:border-primary outline-none transition-all uppercase font-mono ${errors.idNumber ? 'border-red-400 bg-red-50' : 'border-gray-100 dark:border-gray-700'}`} />
                    {loadingCurp && <div className="absolute right-4 top-9 animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>}
                    {!errors.idNumber && CURP_REGEX.test(form.idNumber) && !loadingCurp && (<div className="absolute right-4 top-9 text-green-500"><span className="material-symbols-outlined">check_circle</span></div>)}
                    {errors.idNumber && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{errors.idNumber}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Nombre(s)</label>
                    <input ref={inputRefs.firstName} value={form.firstName} onChange={e => handleNameInput('firstName', e.target.value)} placeholder="Ej. Juan Carlos" className={`w-full h-14 bg-white dark:bg-gray-800 border-2 rounded-2xl px-4 focus:border-primary outline-none transition-all ${errors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-100 dark:border-gray-700'}`} />
                    {errors.firstName && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{errors.firstName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Apellido Paterno</label>
                        <input ref={inputRefs.paternalName} value={form.paternalName} onChange={e => handleNameInput('paternalName', e.target.value)} placeholder="Ej. Pérez" className={`w-full h-14 bg-white dark:bg-gray-800 border-2 rounded-2xl px-4 focus:border-primary outline-none transition-all ${errors.paternalName ? 'border-red-400 bg-red-50' : 'border-gray-100 dark:border-gray-700'}`} />
                        {errors.paternalName && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{errors.paternalName}</p>}
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Apellido Materno <span className="text-[9px] text-gray-300 normal-case">(Opcional)</span></label>
                        <input ref={inputRefs.maternalName} value={form.maternalName} onChange={e => handleNameInput('maternalName', e.target.value)} placeholder="Ej. García" className={`w-full h-14 bg-white dark:bg-gray-800 border-2 rounded-2xl px-4 focus:border-primary outline-none transition-all ${errors.maternalName ? 'border-red-400 bg-red-50' : 'border-gray-100 dark:border-gray-700'}`} />
                        {errors.maternalName && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{errors.maternalName}</p>}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Fecha de Nacimiento</label>
                    <div className="relative">
                        <input ref={inputRefs.birthDate} type="date" value={form.birthDate} disabled readOnly className={`w-full h-14 bg-gray-100 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl px-4 outline-none text-gray-500 font-bold cursor-not-allowed ${errors.birthDate ? 'border-red-400' : ''}`} />
                        <span className="material-symbols-outlined absolute right-4 top-4 text-gray-400 text-lg">lock</span>
                    </div>
                    {errors.birthDate ? <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{errors.birthDate}</p> : <p className="text-[10px] text-gray-400 pl-1">Se calcula automáticamente de tu CURP</p>}
                </div>
            </section>
        </div>
      </main>

      {/* FOOTER */}
      <div className="p-6 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent pt-10 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] z-20">
        <button onClick={handleContinue} disabled={isSubmitting} className={`w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}>
          {isSubmitting ? (<span>Procesando...</span>) : (<>Continuar <span className="material-symbols-outlined">arrow_forward</span></>)}
        </button>
      </div>

      {/* --- MODAL DE ERROR --- */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl w-full max-w-sm text-center transform transition-all animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <span className="material-symbols-outlined text-3xl">priority_high</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Atención</h3>
              <p className="text-gray-500 dark:text-gray-300 text-sm font-medium mb-6 leading-relaxed">{errorMessage}</p>
              <button onClick={() => setShowErrorModal(false)} className="w-full h-12 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-transform">Entendido</button>
           </div>
        </div>
      )}

    </div>
  );
};

export default RegistrationScreen;