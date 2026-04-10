import React, { useState, useCallback, useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AppStep, UserData, LicenseRequest } from './types';
import './index.css';
import { LoadingProvider, useLoading } from './src/contexts/LoadingContext';
import { setLoadingFunctions } from './src/api/apiClientWithLoading';
import { setFotoLoadingFunctions } from './src/api/fotoService';
import { vdidService } from './src/api/vdidService';

// Importamos todas las pantallas
import WelcomeScreen from './screens/WelcomeScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import DocumentUploadScreen from './screens/DocumentUploadScreen';
import BiometricScreen from './screens/BiometricScreen';
import ReviewScreen from './screens/ReviewScreen';
import DashboardScreen from './screens/DashboardScreen';
import OperatorDashboardScreen from './screens/OperatorDashboardScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AppointmentScreen from './screens/AppointmentScreen';
import PaymentScreen from './screens/PaymentScreen';
import SuccessScreen from './screens/SuccessScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import ValidacionLicenciaScreen from './screens/ValidacionLicenciaScreen';

const AppContent: React.FC = () => {
  const { setLoading, setLoadingMessage } = useLoading();
  
  // Configurar las funciones de loading para el apiClient y fotoService
  useEffect(() => {
    setLoadingFunctions({ setLoading, setLoadingMessage });
    setFotoLoadingFunctions(setLoadingMessage, () => setLoading(false));
  }, [setLoading, setLoadingMessage]);

  // Detectar si estamos en modo validación de licencia (QR scaneado)
  const [isValidationMode, setIsValidationMode] = useState<boolean>(false);
  
  useEffect(() => {
    // Verificar si hay datos de validación en el hash
    const hash = window.location.hash;
    if (hash.includes('#data=')) {
      setIsValidationMode(true);
    }
  }, []);

  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.WELCOME);

  // --- 1. NUEVO ESTADO: ID DE USUARIO ---
  // Aquí guardaremos el ID que recuperamos al hacer login
  const [userId, setUserId] = useState<number>(0);

  // --- CONFIGURACIÓN DE BARRA DE ESTADO ---
  useEffect(() => {
    const configStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (e) {
        // Silently fail on non-mobile platforms
      }
    };
    configStatusBar();
  }, []);

  const [userData, setUserData] = useState<UserData>({
    firstName: '', lastName: '', idNumber: '', email: '', birthDate: '',
    licenseType: 'Automovilista Particular', validityDuration: '3 Años',
    bloodGroup: 'O+', organDonor: true, requests: []
  });

  // Token de sesión que se usará para llamadas autenticadas
  const [authToken, setAuthToken] = useState<string | null>(null);

  // UUID de la verificación VDID (Suma México) — se genera en DocumentUploadScreen
  const [vdidUuid, setVdidUuid] = useState<string | null>(null);

  // --- LOGICA DE NAVEGACION ---
  const nextStep = useCallback(() => {
    const steps = Object.values(AppStep);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) setCurrentStep(steps[currentIndex + 1]);
  }, [currentStep]);

  const updateUserData = (data: Partial<UserData>) => setUserData(prev => ({ ...prev, ...data }));

  // Limpieza completa de sesión (app + VDID)
  const handleFullLogout = () => {
    setUserData({ firstName: '', lastName: '', idNumber: '', email: '', birthDate: '', licenseType: 'Automovilista Particular', validityDuration: '3 Años', bloodGroup: 'O+', organDonor: true, requests: [] });
    setUserId(0);
    setAuthToken(null);
    setVdidUuid(null);
    vdidService.clearToken();
    setCurrentStep(AppStep.WELCOME);
  };

  const addRequest = (req: LicenseRequest) => {
    setUserData(prev => ({ ...prev, requests: [...(prev.requests || []), req] }));
  };
  const updateRequestData = (id: string, updates: Partial<LicenseRequest>) => {
    setUserData(prev => ({ ...prev, requests: prev.requests?.map(req => req.id === id ? { ...req, ...updates } : req) }));
  };
  const clearRequests = () => {
    setUserData(prev => ({ ...prev, requests: [] }));
  };

  // --- RENDERIZADO DE PANTALLAS ---
  const renderScreen = () => {
    switch (currentStep) {
      case AppStep.WELCOME:
        return <WelcomeScreen
          // Ajustamos onStart para recibir: datos, pantallaDestino e ID
          onStart={(loginData, nextScreen) => {
            if (loginData) {

              // --- INTEGRACIÓN REAL ---

              // 1. Guardar el ID si viene del login real
              if (loginData.idUsuario) {
                setUserId(loginData.idUsuario);
              }

              // 2. Guardar datos básicos (email, etc)
              updateUserData(loginData);

              // 2.b Guardar token si viene
              if ((loginData as any).token) {
                setAuthToken((loginData as any).token as string);
              }

              // 3. Decidir navegación basada en el token (Prioridad Alta)
              if (nextScreen === 'Dashboard') {
                // Usuario con rol 2 va directo a Dashboard
                setCurrentStep(AppStep.DASHBOARD);
                return;
              } else if (nextScreen === 'OperatorDashboard') {
                // Revisor -> panel del operador
                setCurrentStep(AppStep.OPERATOR_DASHBOARD);
                return;
              } else if ((nextScreen as string) === 'AdminDashboard') {
                // Administrador -> panel admin
                setCurrentStep(AppStep.ADMIN_DASHBOARD);
                return;
              } else {
                // Flujo normal de registro nuevo si no hay nextScreen
                setCurrentStep(AppStep.REGISTRATION);
              }
            } else {
              // Caso: Crear Cuenta Nueva
              setCurrentStep(AppStep.REGISTRATION);
            }
          }}
        />;

      case AppStep.REGISTRATION: return <RegistrationScreen userData={userData} onBack={() => setCurrentStep(AppStep.WELCOME)} onContinue={(data) => { updateUserData(data); setCurrentStep(AppStep.DOCUMENTS); }} />;
      case AppStep.DOCUMENTS: return <DocumentUploadScreen idUsuario={userId} token={authToken || undefined} idSolicitud={0} onSessionExpired={handleFullLogout} onBack={() => setCurrentStep(AppStep.WELCOME)} onContinue={(data) => { updateUserData(data); if ((data as any).vdidUuid) setVdidUuid((data as any).vdidUuid); setCurrentStep(AppStep.BIOMETRICS); }} />;
      case AppStep.BIOMETRICS: return <BiometricScreen onBack={() => setCurrentStep(AppStep.DOCUMENTS)} onComplete={(photoUrl) => { updateUserData({ photo: photoUrl }); setCurrentStep(AppStep.REVIEW); }} {...{ token: authToken || undefined, vdidUuid: vdidUuid || undefined } as any} />;
      case AppStep.REVIEW: return <ReviewScreen userData={userData} onBack={() => setCurrentStep(AppStep.BIOMETRICS)} onSend={() => setCurrentStep(AppStep.DASHBOARD)} onEdit={updateUserData} />;

      case AppStep.DASHBOARD:
        return <DashboardScreen
          userData={userData}
          idUsuario={userId}
          token={authToken || undefined}
          onGoToProfile={() => setCurrentStep(AppStep.COMPLETE_PROFILE)}
          onGoToDocuments={() => setCurrentStep(AppStep.DOCUMENTS)}
          onContinueRequest={(req) => { updateUserData({ licenseType: req.type === 'Motociclista' ? 'Motociclista' : 'Automovilista Particular' }); setCurrentStep(AppStep.APPOINTMENT); }}
          onLogout={handleFullLogout}
        />;

      case AppStep.COMPLETE_PROFILE:
        return <CompleteProfileScreen
          userData={userData}
          idUsuario={userId} // <--- 2. PASAMOS EL ID AL COMPONENTE
          token={authToken || undefined}
          onSessionExpired={handleFullLogout}
          onBack={() => setCurrentStep(AppStep.DASHBOARD)}
          onSave={(data) => { updateUserData(data); setCurrentStep(AppStep.DASHBOARD); }}
        />;

      case AppStep.OPERATOR_DASHBOARD: return <OperatorDashboardScreen token={authToken || undefined} onLogout={handleFullLogout} />;
      case AppStep.ADMIN_DASHBOARD: return <AdminDashboardScreen token={authToken || undefined} onLogout={handleFullLogout} />;
      case AppStep.APPOINTMENT: return <AppointmentScreen userData={userData} onBack={() => setCurrentStep(AppStep.DASHBOARD)} onConfirm={(apptData) => { updateUserData({ appointment: apptData }); setCurrentStep(AppStep.PAYMENT); }} />;
      case AppStep.PAYMENT: return <PaymentScreen userData={userData} onBack={() => setCurrentStep(AppStep.APPOINTMENT)} onPaymentSuccess={(paymentData) => { updateUserData({ payment: paymentData }); setCurrentStep(AppStep.DASHBOARD); }} />;
      case AppStep.SUCCESS: return <SuccessScreen userData={userData} onBack={() => setCurrentStep(AppStep.WELCOME)} token={authToken || undefined} idSolicitud={userId ?? undefined} />;
      default: return <WelcomeScreen onStart={() => setCurrentStep(AppStep.REGISTRATION)} />;
    }
  };

  const isDashboard = [AppStep.DASHBOARD, AppStep.ADMIN_DASHBOARD, AppStep.OPERATOR_DASHBOARD].includes(currentStep);

  // Si estamos en modo validación, mostrar solo esa pantalla
  if (isValidationMode) {
    return <ValidacionLicenciaScreen />;
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-background-dark">
      {isDashboard ? (
        <div className="w-full h-screen overflow-hidden flex flex-col animate-in fade-in bg-white dark:bg-background-dark">
          <div className="flex-1 w-full h-full overflow-hidden flex flex-col safe-bottom">
            {renderScreen()}
          </div>
        </div>
      ) : (
        <div className="flex w-full h-screen">
          <div className="hidden lg:flex w-1/2 bg-gray-900 relative items-center justify-center overflow-hidden">
            <img src="https://images.unsplash.com/photo-1518134714589-940735760233?q=80&w=2000&auto=format&fit=crop" alt="Background" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
            <div className="relative z-10 p-16 text-white max-w-xl">
              <h2 className="text-4xl font-black mb-10 leading-tight">Obtén tu Licencia <br /><span className="text-blue-400">en 3 sencillos pasos:</span></h2>

              <div className="space-y-8">
                <div className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-400/30">
                    <span className="material-symbols-outlined text-blue-300">person_add</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">1. Regístrate</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Crea tu cuenta ingresando tu correo electrónico y validando tu CURP.</p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-400/30">
                    <span className="material-symbols-outlined text-blue-300">upload_file</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">2. Valida</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Sube tus documentos requeridos y realiza la validación biométrica.</p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-400/30">
                    <span className="material-symbols-outlined text-blue-300">badge</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">3. Descarga</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Obtén tu licencia digital oficial válida en todo el estado.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col bg-white dark:bg-background-dark relative">
            <div className="flex-1 overflow-y-auto">
              <div className={`min-h-full flex ${currentStep === AppStep.WELCOME ? 'flex-col items-stretch justify-start p-0' : 'items-center justify-center p-4 sm:p-12 lg:p-16'}`}>
                <div className={`w-full ${currentStep === AppStep.WELCOME ? 'h-full' : 'max-w-md'} animate-in slide-in-from-right-8 duration-500`}>
                  {renderScreen()}
                </div>
              </div>
            </div>
            {currentStep === AppStep.WELCOME && (
              <div className="w-full p-4 text-center text-[10px] text-gray-400 bg-white dark:bg-background-dark pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                Gobierno del Estado de Durango &copy; 2026
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LoadingProvider>
      <AppContent />
    </LoadingProvider>
  );
};

export default App;
