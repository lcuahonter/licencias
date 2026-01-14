import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';

// ============================================================================
// LOGICA DE ENVIO DE VIDEO (LIVENESS)
// ============================================================================

const sendLivenessVideo = async (videoBlob: Blob) => {
    try {
        console.log("1. Preparando envio de video...");
      
        // NOTA: Idealmente esto va a tu Backend intermedio, no directo a Azure desde el cliente
        const BACKEND_URL = "https://dgofacerecognition.cognitiveservices.azure.com/face/v1.0/liveness/detect"; 
        
        const formData = new FormData();
        formData.append('video', videoBlob, 'liveness_check.webm'); 

        console.log(`Tamano del video: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: formData
        });

        console.log("2. Estatus HTTP:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error Backend:", errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        // Adaptar esto segun la respuesta de tu servicio
        if (data.isReal === false) {
             return { success: false, message: "Prueba de vida fallida. Intenta de nuevo." };
        }

        return { success: true, data: data };

    } catch (error: any) {
        console.error("Catch Error:", error);
        return { success: false, message: error.message || "Error de conexion." };
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
            console.log("Grabando...");

        } catch (err: any) {
            console.error("Error iniciando grabadora:", err);
            setCameraError("No se pudo iniciar la grabacion de video.");
            setIsScanning(false);
        }
    } else {
        setCameraError("Camara no lista.");
    }
  }, [webcamRef]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        console.log("Grabacion detenida");
    }
  }, []);

  const handleVideoProcess = async (videoBlob: Blob) => {
      setIsValidating(true);
      setIsScanning(false);

      const result = await sendLivenessVideo(videoBlob);

      if (result.success) {
          setIsValidating(false);
          const finalPhoto = webcamRef.current?.getScreenshot() || ""; 
          onComplete(finalPhoto); 
      } else {
          setIsValidating(false);
          setCameraError(result.message);
      }
  };

  // --- BOTON DE OMITIR (PARA PRUEBAS) ---
  const handleSkip = () => {
      // Detener cualquier proceso activo
      if (isScanning) stopRecording();
      
      // Simular exito enviando una imagen dummy
      console.log("Omitiendo prueba de vida...");
      onComplete("https://via.placeholder.com/400x400?text=Prueba+Omitida");
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
          alert("Reinicia la app o revisa permisos.");
          return;
      }
      startRecording();
  };

  const handleUserMediaError = useCallback((error: string | DOMException) => {
      console.error("Error de camara:", error);
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

        {/* MASCARA SVG */}
        <div className="absolute inset-0 z-10 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none">
                <defs>
                    <mask id="mask">
                        <rect width="100%" height="100%" fill="white" />
                        <ellipse cx="50%" cy="45%" rx="28%" ry="22%" fill="black" />
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.85)" mask="url(#mask)" />
            </svg>
            
            <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '10%' }}>
                {/* Borde cambia a ROJO mientras graba */}
                <div className={`w-[56%] aspect-[3/4] max-h-[44%] rounded-[50%] border-2 border-dashed transition-all duration-500 ${isScanning ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.6)]' : 'border-white/40'}`}></div>
            </div>

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
              {isScanning ? "Manten el rostro en el ovalo" : "Grabaremos un video corto de 3 segundos."}
          </p>

          {/* BOTON DE OMITIR PARA PRUEBAS */}
          <button 
            onClick={handleSkip}
            className="mt-6 text-[10px] uppercase font-bold text-gray-600 hover:text-white border border-gray-700 hover:border-white px-3 py-1 rounded transition-colors"
          >
            Omitir (Modo Pruebas)
          </button>

      </div>
    </div>
  );
};

export default BiometricScreen;