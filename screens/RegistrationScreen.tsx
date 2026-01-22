import React, { useState, useRef } from 'react';
import MD5 from 'crypto-js/md5';
import { UserData } from '../types';
import { fetchCurpData } from '../src/utils/curpHelpers';
import { userService } from '../src/api/userService'; // <--- SERVICIO CENTRALIZADO

// --- TEXTO DE TÉRMINOS Y CONDICIONES ---
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

interface RegistrationScreenProps {
  userData: UserData;
  onBack: () => void;
  onContinue: (data: Partial<UserData>) => void;
}

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ userData, onBack, onContinue }) => {
  const [form, setForm] = useState({
    email: userData.email || '',
    password: '',
    firstName: userData.firstName || '',
    paternalName: userData.paternalName || '',
    maternalName: userData.maternalName || '',
    idNumber: userData.idNumber || '',
    birthDate: userData.birthDate || '',
  });

  const [loadingCurp, setLoadingCurp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [lastFetchedCurp, setLastFetchedCurp] = useState('');

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal genérico para alertas
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // --- ESTADOS PARA TÉRMINOS Y CONDICIONES ---
  const [agreed, setAgreed] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [canAcceptTerms, setCanAcceptTerms] = useState(false);

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
        setTimeout(() => ref.current.focus(), 100);
      }
    }
  };

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

    if (!agreed) {
      setAlertMessage('Debes aceptar los términos y condiciones para continuar.');
      setAlertType('warning');
      setShowAlertModal(true);
      return false;
    }

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

  // Handler para detectar scroll al fondo del modal
  const handleScrollTerms = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 5) {
      setCanAcceptTerms(true);
    }
  };

  const handleAcceptTerms = () => {
    setAgreed(true);
    setShowTermsModal(false);
  };

  // --- LÓGICA PRINCIPAL ---
  const handleContinue = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const md5Password = MD5(form.password).toString();

      const payload = {
        tipoUsuario: 2,
        nombres: form.firstName,
        apellidopaterno: form.paternalName,
        apellidomaterno: form.maternalName,
        curp: form.idNumber,
        email: form.email,
        password: md5Password,
        fechanacimiento: form.birthDate
      };

      // --- LLAMADA AL SERVICIO ---
      const data = await userService.createUsuario(payload);

      setAlertMessage("¡Cuenta creada con éxito! Ahora puedes iniciar sesión.");
      setAlertType('success');
      setShowAlertModal(true);
      setTimeout(() => onBack(), 2000);

    } catch (error: any) {

      // El servicio ya nos devuelve el mensaje procesado
      setErrorMessage(error.message || 'Error desconocido.');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark relative">
      {/* Encabezado con Logo del Gobierno de Durango */}
      <div className="bg-white px-6 py-4 shadow-md flex items-center gap-4 border-b border-gray-200 relative z-20">
        <img
          src="/logo-durango.png"
          alt="Logo Gobierno de Durango"
          className="h-16 w-auto object-contain flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="flex-1 text-right">
          <p className="text-xl font-black text-gray-800">Licencias Durango</p>
        </div>
      </div>
      <header className="safe-top px-6 pt-8 pb-6 flex items-center justify-between bg-white dark:bg-surface-dark shadow-sm sticky top-0 z-10">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full w-32 overflow-hidden">
          <div className="h-full bg-primary w-1/4"></div>
        </div>
        <div className="w-10"></div>
      </header>

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
              <input ref={inputRefs.email} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ejemplo@correo.com" className={`w-full h-14 bg-white dark:bg-gray-800 border-2 rounded-2xl px-4 focus:border-primary outline-none transition-all ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-100 dark:border-gray-700'}`} />
              {errors.email && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Contraseña</label>
              <input ref={inputRefs.password} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className={`w-full h-14 bg-white dark:bg-gray-800 border-2 rounded-2xl px-4 focus:border-primary outline-none transition-all ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-100 dark:border-gray-700'}`} />
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

          {/* CHECKBOX DE TÉRMINOS Y CONDICIONES */}
          <div className="flex gap-4 p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/50 transition-all select-none items-start">
            <div className="pt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  if (e.target.checked) {
                    setShowTermsModal(true);
                  } else {
                    setAgreed(false);
                    setCanAcceptTerms(false);
                  }
                }}
                className="w-6 h-6 rounded-lg text-primary border-gray-300 bg-white dark:bg-gray-700 cursor-pointer focus:ring-primary"
              />
            </div>

            <span
              onClick={() => {
                if (!agreed) {
                  setShowTermsModal(true);
                } else {
                  setAgreed(false);
                  setCanAcceptTerms(false);
                }
              }}
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer"
            >
              Declaro bajo protesta de decir verdad que la información proporcionada es auténtica.
              <span className="text-[10px] font-bold text-primary block mt-1 underline decoration-dotted underline-offset-4">
                (Leer Términos y Condiciones)
              </span>
            </span>
          </div>
        </div>
      </main>

      <div className="p-6 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent pt-10 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] z-20">
        <button onClick={handleContinue} disabled={isSubmitting || !agreed} className={`w-full h-14 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${(isSubmitting || !agreed) ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-black dark:bg-white text-white dark:text-black'}`}>
          {isSubmitting ? (<span>Procesando...</span>) : (<>Registrar Cuenta <span className="material-symbols-outlined">person_add</span></>)}
        </button>
      </div>

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

      {/* MODAL TÉRMINOS Y CONDICIONES */}
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
              {TERMS_TEXT.split('\n').map((line, i) => (
                <p key={i} className="mb-3">{line}</p>
              ))}
              <div className="h-10"></div>
            </div>

            {/* Footer con Botón Aceptar */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 rounded-b-3xl">
              <button
                onClick={handleAcceptTerms}
                disabled={!canAcceptTerms}
                className={`w-full h-14 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${canAcceptTerms
                  ? 'bg-primary text-white shadow-lg hover:bg-blue-700 transform hover:scale-[1.02]'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed grayscale'
                  }`}
              >
                {canAcceptTerms ? (
                  <>Aceptar y Continuar <span className="material-symbols-outlined">check_circle</span></>
                ) : (
                  <span className="text-sm">Lee todo para continuar...</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENÉRICO DE ALERTAS */}
      {showAlertModal && (
        <div className="absolute inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${alertType === 'success' ? 'bg-green-100' :
                alertType === 'error' ? 'bg-red-100' :
                  alertType === 'warning' ? 'bg-yellow-100' :
                    'bg-blue-100'
                }`}>
                <span className={`material-symbols-outlined text-5xl ${alertType === 'success' ? 'text-green-600' :
                  alertType === 'error' ? 'text-red-600' :
                    alertType === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                  }`}>
                  {alertType === 'success' ? 'check_circle' :
                    alertType === 'error' ? 'error' :
                      alertType === 'warning' ? 'warning' :
                        'info'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {alertType === 'success' ? '¡Éxito!' :
                  alertType === 'error' ? 'Error' :
                    alertType === 'warning' ? 'Atención' :
                      'Información'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line">{alertMessage}</p>
              <button
                onClick={() => setShowAlertModal(false)}
                className={`w-full px-6 py-3 text-white rounded-xl font-bold ${alertType === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  alertType === 'error' ? 'bg-red-600 hover:bg-red-700' :
                    alertType === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RegistrationScreen;
