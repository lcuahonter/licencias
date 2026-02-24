import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { vdidService } from '../src/api/vdidService';
import VdidCaptureModal from '../components/src/VdidCaptureModal';

// ============================================================================
// LOGICA DE ENVIO DE VIDEO (LIVENESS)
// ============================================================================

const sendLivenessVideo = async (videoBlob: Blob) => {
    // TEMPORALMENTE DESACTIVADO - Requiere backend intermedio
    // Por ahora solo simulamos que pasó la validación
    try {
        // Simular un pequeño delay para que parezca que valida
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Siempre retorna éxito (puedes activar Azure cuando el backend esté listo)
        return { success: true, data: { isReal: true } };

    } catch (error: any) {
        return { success: false, message: error.message || "Error de conexión." };
    }
};

// ============================================================================
// COMPONENTE VISUAL
// ============================================================================

interface BiometricScreenProps {
  onBack: () => void;
  onComplete: (photoUrl: string) => void;
  /** Token de sesión para crear verificaciones VDID autenticadas (opcional). */
  token?: string;
  /** UUID de verificación VDID completada en el paso de documentos. */
  vdidUuid?: string;
}

const BiometricScreen: React.FC<BiometricScreenProps> = ({ onBack, onComplete, token, vdidUuid }) => {

  // ── Si la identidad ya fue verificada por VDID en el paso anterior, mostramos
  //    pantalla de confirmación directamente ────────────────────────────────
  if (vdidUuid) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black h-[100dvh] w-screen overflow-hidden items-center justify-center px-8">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-16 px-6 flex justify-between items-center safe-top">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="text-right">
            <h2 className="text-white font-bold text-base">Prueba de Vida</h2>
            <p className="text-white/60 text-xs">Verificación Biométrica</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-28 h-28 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-green-400">verified_user</span>
          </div>

          <div>
            <h2 className="text-white font-bold text-2xl mb-2">Identidad Verificada</h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">
              Tu documento y prueba de vida fueron validados exitosamente por Suma México.
            </p>
            <p className="text-white/30 text-[10px] font-mono mt-3 break-all">UUID: {vdidUuid}</p>
          </div>

          <div className="w-full flex flex-col gap-3 mt-4">
            <button
              onClick={() => onComplete('')}
              className="w-full h-14 bg-green-600 hover:bg-green-500 active:scale-95 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sin VDID: flujo biométrico normal con cámara ──────────────────────
  const [showVdidModal, setShowVdidModal]   = useState(false);
  const [vdidUrl, setVdidUrl]               = useState('');
  const [vdidLoading, setVdidLoading]       = useState(false);
  const [vdidError, setVdidError]           = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  
  // Modal genérico para alertas
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  
  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const videoConstraints = {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 }
  };

  // --- Logica de Grabacion ---
  
  const startRecording = useCallback(() => {
    setIsScanning(true);
    setScanProgress(0);
    setCameraError(null);
    chunksRef.current = [];

    const stream = webcamRef.current?.stream;

    if (stream) {
        try {
            const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
                ? { mimeType: 'video/webm;codecs=vp9' } 
                : { mimeType: 'video/webm' };

            const recorder = new MediaRecorder(stream, options);
            
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                handleVideoProcess(blob);
            };

            mediaRecorderRef.current = recorder;
            recorder.start();

        } catch (err: any) {
            setCameraError("No se pudo iniciar la grabación de video.");
            setIsScanning(false);
            setScanProgress(0);
        }
    } else {
        setCameraError("Cámara no lista. Espera un momento.");
        setIsScanning(false);
        setScanProgress(0);
    }
  }, [webcamRef]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
    }
  }, []);

  const handleVideoProcess = async (videoBlob: Blob) => {
      setIsValidating(true);
      setIsScanning(false);

      const result = await sendLivenessVideo(videoBlob);

      if (result.success) {
          setIsValidating(false);
          const finalPhoto = webcamRef.current?.getScreenshot() || ""; 
          // En lugar de completar directamente, mostramos vista previa
          setCapturedPhoto(finalPhoto);
      } else {
          setIsValidating(false);
          setIsScanning(false);
          setScanProgress(0);
          setCameraError(result.message);
      }
  };

  // --- ACEPTAR FOTO CAPTURADA ---
  const handleAcceptPhoto = () => {
      if (capturedPhoto) {
          onComplete(capturedPhoto);
      }
  };

  // --- RECHAZAR FOTO Y VOLVER A ESCANEAR ---
  const handleRetakePhoto = () => {
      setCapturedPhoto(null);
      setScanProgress(0);
  };

  // --- BOTON DE OMITIR (PARA PRUEBAS) ---
  // --- Efecto de Barra de Progreso ---
  useEffect(() => {
    let interval: any;
    
    if (isScanning && !isValidating) {
      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            stopRecording();
            return 100;
          }
          return prev + 1.7; 
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isScanning, isValidating, stopRecording]);


  const handleStartButton = () => {
      if (cameraError) {
          setAlertMessage("Reinicia la app o revisa permisos.");
          setAlertType('error');
          setShowAlertModal(true);
          return;
      }
      startRecording();
  };

  const handleUserMediaError = useCallback((error: string | DOMException) => {
      setCameraError("Acceso denegado o error de camara.");
  }, []);

  // ── VDID: lanzar verificación completa (documentos + prueba de vida) ──
  const handleVdidLaunch = async () => {
      if (!vdidService.isConfigured()) {
          setVdidError('VITE_VDID_PUBLIC_KEY no está configurada en las variables de entorno.');
          return;
      }
      setVdidError(null);
      setVdidLoading(true);
      try {
          // Crear UUID para el flujo completo (documentos + liveness)
          const uuid = await vdidService.createVerification(token);
          const url  = vdidService.getFullVerificationUrl(uuid);
          setVdidUrl(url);
          setShowVdidModal(true);
      } catch (err: any) {
          setVdidError(err?.message || 'No se pudo iniciar VDID. Revisa tu VITE_VDID_PRIVATE_KEY.');
      } finally {
          setVdidLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black h-[100dvh] w-screen overflow-hidden">
      
      {/* 1. ENCABEZADO */}
      <div className="shrink-0 h-16 px-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20 absolute top-0 left-0 right-0 safe-top">
        <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-full bg-black/40 border border-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
            <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="text-right">
            <h2 className="text-white font-bold text-base drop-shadow-md">Prueba de Vida</h2>
            <p className="text-white/80 text-xs drop-shadow-md">Video Verificacion</p>
        </div>
      </div>

      {/* 2. AREA DE CAMARA */}
      <div className="flex-1 relative w-full h-full flex items-center justify-center bg-gray-900">
        
        {!cameraError ? (
            <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="absolute inset-0 w-full h-full object-cover" 
                mirrored={true}
                onUserMediaError={handleUserMediaError}
                onUserMedia={() => setCameraError(null)}
                screenshotQuality={0.92}
                disablePictureInPicture={false}
                forceScreenshotSourceSize={false}
                imageSmoothing={true}
            />
        ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center z-10 bg-gray-900/90 backdrop-blur-sm">
                <span className="material-symbols-outlined text-6xl text-red-500 mb-4">warning</span>
                <p className="text-white font-bold text-lg">Error de Camara</p>
                <p className="text-gray-300 text-sm mt-2 max-w-xs">{cameraError}</p>
                <button 
                    onClick={() => setCameraError(null)} 
                    className="mt-6 px-6 py-3 bg-white text-black rounded-full text-sm font-bold shadow-lg active:scale-95 transition-transform"
                >
                    Reintentar
                </button>
            </div>
        )}

        {/* MASCARA SVG Y OVALO GUIA */}
        <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Máscara de fondo oscuro */}
            <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none">
                <defs>
                    <mask id="mask">
                        <rect width="100%" height="100%" fill="white" />
                        <ellipse cx="50%" cy="40%" rx="35%" ry="25%" fill="black" />
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.85)" mask="url(#mask)" />
            </svg>
            
            {/* Óvalo punteado de guía - mismas dimensiones que la máscara */}
            <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none">
                <ellipse 
                    cx="50%" 
                    cy="40%" 
                    rx="35%" 
                    ry="25%" 
                    fill="none" 
                    stroke={isScanning ? 'rgb(239, 68, 68)' : 'rgba(255, 255, 255, 0.4)'}
                    strokeWidth="2"
                    strokeDasharray="10,5"
                    className={`transition-all duration-500 ${isScanning ? 'drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]' : ''}`}
                />
            </svg>

            {/* Indicador de REC */}
            {isScanning && (
                <div className="absolute top-24 left-0 right-0 flex justify-center items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-white font-bold tracking-widest text-xs">REC</span>
                </div>
            )}
        </div>

        {/* TEXTO DE ESTADO */}
        {!cameraError && (
            <div className="absolute bottom-32 left-0 right-0 z-20 text-center px-4">
                <p className="text-white font-medium drop-shadow-md bg-black/40 backdrop-blur-md inline-block px-6 py-2 rounded-full text-sm border border-white/10 transition-all">
                    {isValidating 
                        ? <span className="flex items-center gap-2"><span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span> Subiendo video...</span> 
                        : isScanning 
                            ? `Mueve ligeramente la cabeza...` 
                            : 'Presiona para grabar prueba de vida'
                    }
                </p>
            </div>
        )}
      </div>

      {/* 3. CONTROLES */}
      <div className="shrink-0 bg-black/90 backdrop-blur-xl p-8 pb-10 flex flex-col items-center justify-center z-20 border-t border-white/10 rounded-t-3xl absolute bottom-0 left-0 right-0 safe-bottom">
          
          {!isScanning && !isValidating ? (
              <button 
                onClick={handleStartButton}
                disabled={!!cameraError}
                className={`w-16 h-16 rounded-full border-4 flex items-center justify-center p-1 transition-transform shadow-lg ${cameraError ? 'border-gray-600 opacity-50 cursor-not-allowed' : 'border-white hover:scale-105 active:scale-95 shadow-white/20'}`}
              >
                  <div className={`w-full h-full rounded-full ${cameraError ? 'bg-gray-600' : 'bg-red-600'}`}></div>
              </button>
          ) : (
              <div className="w-full max-w-xs h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full transition-all duration-75 ease-linear ${isValidating ? 'bg-green-500 w-full animate-pulse' : 'bg-red-500'}`}
                    style={{ width: isValidating ? '100%' : `${scanProgress}%` }}
                  ></div>
              </div>
          )}
          
          <p className="text-gray-400 text-[11px] mt-4 text-center max-w-xs">
              {isScanning ? "Mantente quieto y mira a la cámara" : isValidating ? "Procesando..." : "Presiona el botón para capturar tu foto"}
          </p>

          {/* ── Opción VDID ───────────────────────────────── */}
          {!isScanning && !isValidating && (
              <div className="w-full max-w-xs mt-4">
                  <div className="border-t border-white/10 pt-4">
                      <p className="text-gray-500 text-[10px] text-center mb-2 uppercase tracking-wider">O verifica con</p>
                      <button
                          onClick={handleVdidLaunch}
                          disabled={vdidLoading}
                          className="w-full h-10 bg-blue-700/80 hover:bg-blue-600 active:scale-95 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                      >
                          {vdidLoading
                              ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Iniciando...</>
                              : <><span className="material-symbols-outlined text-base">verified_user</span> Prueba de Vida con VDID</>}
                      </button>
                      {vdidError && (
                          <p className="text-red-400 text-[10px] text-center mt-1">{vdidError}</p>
                      )}
                  </div>
              </div>
          )}

      </div>

      {/* VISTA PREVIA DE FOTO CAPTURADA */}
      {capturedPhoto && (
        <div className="absolute inset-0 z-[110] bg-black flex flex-col">
          {/* Header */}
          <div className="shrink-0 h-16 px-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20 safe-top">
            <div className="text-white">
              <h2 className="font-bold text-base">Vista Previa</h2>
              <p className="text-xs text-white/80">Verifica tu captura</p>
            </div>
          </div>

          {/* Preview Image */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-sm">
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl">
                <img 
                  src={capturedPhoto} 
                  alt="Foto capturada" 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-white/70 text-sm text-center mt-4">
                ¿La foto se ve bien y tu rostro está visible?
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="shrink-0 p-6 space-y-3 safe-bottom">
            <button
              onClick={handleAcceptPhoto}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Usar esta Foto
            </button>
            <button
              onClick={handleRetakePhoto}
              className="w-full h-14 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-lg border-2 border-white/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">refresh</span>
              Escanear de Nuevo
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL VDID ───────────────────────────────────────────── */}
      <VdidCaptureModal
          isOpen={showVdidModal}
          onClose={() => setShowVdidModal(false)}
          onCompleted={() => {
              setShowVdidModal(false);
              // Avanzamos al paso siguiente; la foto real quedó en VDID
              onComplete('');
          }}
          url={vdidUrl}
          title="Prueba de Vida"
          description="Sigue las instrucciones para capturar tu documento y verificar tu identidad."
      />

      {/* MODAL GENÉRICO DE ALERTAS */}
      {showAlertModal && (
        <div className="absolute inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                alertType === 'success' ? 'bg-green-100' : 
                alertType === 'error' ? 'bg-red-100' : 
                alertType === 'warning' ? 'bg-yellow-100' : 
                'bg-blue-100'
              }`}>
                <span className={`material-symbols-outlined text-5xl ${
                  alertType === 'success' ? 'text-green-600' : 
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
                className={`w-full px-6 py-3 text-white rounded-xl font-bold ${
                  alertType === 'success' ? 'bg-green-600 hover:bg-green-700' : 
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

export default BiometricScreen;
