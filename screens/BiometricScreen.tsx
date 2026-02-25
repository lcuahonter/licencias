import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';

// ============================================================================
// LOGICA DE ENVIO DE VIDEO (LIVENESS)
// ============================================================================

const sendLivenessVideo = async (_videoBlob: Blob) => {
    // TEMPORALMENTE DESACTIVADO - Requiere backend intermedio
    // Por ahora solo simulamos que pasó la validación
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
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
}

const BiometricScreen: React.FC<BiometricScreenProps> = ({ onBack, onComplete }) => {
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

  const handleUserMediaError = useCallback((_error: string | DOMException) => {
      setCameraError("Acceso denegado o error de camara.");
  }, []);

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
            <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none">
                <defs>
                    <mask id="mask">
                        <rect width="100%" height="100%" fill="white" />
                        <ellipse cx="50%" cy="40%" rx="35%" ry="25%" fill="black" />
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.85)" mask="url(#mask)" />
            </svg>

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
      </div>

      {/* VISTA PREVIA DE FOTO CAPTURADA */}
      {capturedPhoto && (
        <div className="absolute inset-0 z-[110] bg-black flex flex-col">
          <div className="shrink-0 h-16 px-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20 safe-top">
            <div className="text-white">
              <h2 className="font-bold text-base">Vista Previa</h2>
              <p className="text-xs text-white/80">Verifica tu captura</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-sm">
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl">
                <img src={capturedPhoto} alt="Foto capturada" className="w-full h-full object-cover" />
              </div>
              <p className="text-white/70 text-sm text-center mt-4">
                ¿La foto se ve bien y tu rostro está visible?
              </p>
            </div>
          </div>
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

      {/* MODAL GENÉRICO DE ALERTAS */}
      {showAlertModal && (
        <div className="absolute inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                alertType === 'success' ? 'bg-green-100' :
                alertType === 'error' ? 'bg-red-100' :
                alertType === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
              }`}>
                <span className={`material-symbols-outlined text-5xl ${
                  alertType === 'success' ? 'text-green-600' :
                  alertType === 'error' ? 'text-red-600' :
                  alertType === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                  {alertType === 'success' ? 'check_circle' :
                   alertType === 'error' ? 'error' :
                   alertType === 'warning' ? 'warning' : 'info'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {alertType === 'success' ? '¡Éxito!' :
                 alertType === 'error' ? 'Error' :
                 alertType === 'warning' ? 'Atención' : 'Información'}
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
