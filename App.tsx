import React, { useState, useCallback, useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AppStep, UserData, LicenseRequest } from './types';
import './index.css';

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

const App: React.FC = () => {
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
        // No estamos en móvil
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

  // --- LOGICA DE NAVEGACION ---
  const nextStep = useCallback(() => {
    const steps = Object.values(AppStep);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) setCurrentStep(steps[currentIndex + 1]);
  }, [currentStep]);

  const updateUserData = (data: Partial<UserData>) => setUserData(prev => ({ ...prev, ...data }));

  const addRequest = (req: LicenseRequest) => {
      setUserData(prev => ({ ...prev, requests: [...(prev.requests || []), req] }));
  };
  const updateRequestData = (id: string, updates: Partial<LicenseRequest>) => {
      setUserData(prev => ({ ...prev, requests: prev.requests?.map(req => req.id === id ? { ...req, ...updates } : req) }));
  };

  (window as any).tempAddRequest = addRequest;
  (window as any).tempUpdateRequestData = updateRequestData;

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
                }

                // --- MOCKS PARA PRUEBAS (Si no vino nextScreen, usamos la lógica anterior) ---
                if (loginData.email === 'admin@gmail.com') {
                    setCurrentStep(AppStep.ADMIN_DASHBOARD);
                } else if (loginData.email === 'operador@gmail.com') {
                    setCurrentStep(AppStep.OPERATOR_DASHBOARD);
                } else if (loginData.email === 'existente@gmail.com') {
                  updateUserData({
                    ...loginData, firstName: 'Juan', lastName: 'Pérez García', idNumber: 'PEPJ880101HDFRXX05', birthDate: '1988-01-01', licenseType: 'Automovilista Particular', validityDuration: '3 Años', photo: 'photos/cara.jpeg', address: 'Calle Falsa 123', emergencyContact: 'Maria Perez',
                    requests: [{ id: '101', type: 'Automovilista', process: 'Refrendo', cost: 912, date: '26/12/2025', status: 'paid_pending_docs', folio: 'DGO-9988' }]
                  });
                  setCurrentStep(AppStep.DASHBOARD);
                } else {
                  // Flujo normal de registro nuevo
                  setCurrentStep(AppStep.REGISTRATION); // O Documents según tu flujo
                }
              } else {
                // Caso: Crear Cuenta Nueva
                setCurrentStep(AppStep.REGISTRATION);
              }
            }} 
        />;
            
      case AppStep.REGISTRATION: return <RegistrationScreen userData={userData} onBack={() => setCurrentStep(AppStep.WELCOME)} onContinue={(data) => { updateUserData(data); setCurrentStep(AppStep.DOCUMENTS); }} />;
      case AppStep.DOCUMENTS: return <DocumentUploadScreen idUsuario={userId} token={authToken || undefined} idSolicitud={0} onSessionExpired={() => { setAuthToken(null); setUserId(0); setUserData({ firstName: '', lastName: '', idNumber: '', email: '', birthDate: '', licenseType: 'Automovilista Particular', validityDuration: '3 Años', bloodGroup: 'O+', organDonor: true, requests: [] }); setCurrentStep(AppStep.WELCOME); }} onBack={() => setCurrentStep(AppStep.WELCOME)} onContinue={(data) => { updateUserData(data); setCurrentStep(AppStep.BIOMETRICS); }} />;
      case AppStep.BIOMETRICS: return <BiometricScreen onBack={() => setCurrentStep(AppStep.DOCUMENTS)} onComplete={(photoUrl) => { updateUserData({ photo: photoUrl }); setCurrentStep(AppStep.REVIEW); }} />;
      case AppStep.REVIEW: return <ReviewScreen userData={userData} onBack={() => setCurrentStep(AppStep.BIOMETRICS)} onSend={() => setCurrentStep(AppStep.DASHBOARD)} onEdit={updateUserData} />;
      
      case AppStep.DASHBOARD: 
        return <DashboardScreen 
            userData={userData} 
            idUsuario={userId}
            token={authToken || undefined}
            onGoToProfile={() => setCurrentStep(AppStep.COMPLETE_PROFILE)} 
            onGoToDocuments={() => setCurrentStep(AppStep.DOCUMENTS)}
            onContinueRequest={(req) => { updateUserData({ licenseType: req.type === 'Motociclista' ? 'Motociclista' : 'Automovilista Particular' }); setCurrentStep(AppStep.APPOINTMENT); }} 
            onLogout={() => { 
                setUserData({ firstName: '', lastName: '', idNumber: '', email: '', birthDate: '', licenseType: 'Automovilista Particular', validityDuration: '3 Años', bloodGroup: 'O+', organDonor: true, requests: [] }); 
                setUserId(0); // Limpiamos ID al salir
                setAuthToken(null); // Limpiamos token
                setCurrentStep(AppStep.WELCOME); 
            }} 
        />;
      
      case AppStep.COMPLETE_PROFILE: 
        return <CompleteProfileScreen 
            userData={userData} 
            idUsuario={userId} // <--- 2. PASAMOS EL ID AL COMPONENTE
            token={authToken || undefined}
            onSessionExpired={() => { setAuthToken(null); setUserId(0); setUserData({ firstName: '', lastName: '', idNumber: '', email: '', birthDate: '', licenseType: 'Automovilista Particular', validityDuration: '3 Años', bloodGroup: 'O+', organDonor: true, requests: [] }); setCurrentStep(AppStep.WELCOME); }}
            onBack={() => setCurrentStep(AppStep.DASHBOARD)} 
            onSave={(data) => { updateUserData(data); setCurrentStep(AppStep.DASHBOARD); }} 
        />;
      
      case AppStep.OPERATOR_DASHBOARD: return <OperatorDashboardScreen token={authToken || undefined} onLogout={() => { setAuthToken(null); setCurrentStep(AppStep.WELCOME); }} />;
      case AppStep.ADMIN_DASHBOARD: return <AdminDashboardScreen onLogout={() => { setAuthToken(null); setCurrentStep(AppStep.WELCOME); }} />;
      case AppStep.APPOINTMENT: return <AppointmentScreen userData={userData} onBack={() => setCurrentStep(AppStep.DASHBOARD)} onConfirm={(apptData) => { updateUserData({ appointment: apptData }); setCurrentStep(AppStep.PAYMENT); }} />;
      case AppStep.PAYMENT: return <PaymentScreen userData={userData} onBack={() => setCurrentStep(AppStep.APPOINTMENT)} onPaymentSuccess={(paymentData) => { updateUserData({ payment: paymentData }); setCurrentStep(AppStep.DASHBOARD); }} />;
      case AppStep.SUCCESS: return <SuccessScreen userData={userData} onBack={() => setCurrentStep(AppStep.WELCOME)} />;
      default: return <WelcomeScreen onStart={() => setCurrentStep(AppStep.REGISTRATION)} />;
    }
  };

  const isDashboard = [AppStep.DASHBOARD, AppStep.ADMIN_DASHBOARD, AppStep.OPERATOR_DASHBOARD].includes(currentStep);

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
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-2xl">
                        <span className="material-symbols-outlined text-5xl">verified_user</span>
                    </div>
                    <h1 className="text-5xl font-black mb-6 leading-tight">Tu Identidad Digital, <span className="text-primary-light text-blue-400">Segura.</span></h1>
                    <p className="text-lg text-gray-300 leading-relaxed">Bienvenido a la plataforma oficial de Licencias Digitales del Estado de Durango.</p>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col bg-white dark:bg-background-dark relative">
                <div className="flex-1 overflow-y-auto">
                    <div className="min-h-full flex items-center justify-center p-4 sm:p-12 lg:p-16">
                        <div className="w-full max-w-md animate-in slide-in-from-right-8 duration-500">
                            {renderScreen()}
                        </div>
                    </div>
                </div>
                {currentStep === AppStep.WELCOME && (
                    <div className="w-full p-4 text-center text-[10px] text-gray-400 lg:hidden bg-white dark:bg-background-dark pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                        Gobierno del Estado de Durango &copy; 2025
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default App;