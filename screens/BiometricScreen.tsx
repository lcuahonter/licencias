import React, { useState } from 'react';
import { vdidService } from '../src/api/vdidService';
import VdidCaptureModal from '../components/src/VdidCaptureModal';

interface BiometricScreenProps {
  onBack: () => void;
  onComplete: (photoUrl: string) => void;
  token?: string;
  vdidUuid?: string;
}

const BiometricScreen: React.FC<BiometricScreenProps> = ({ onBack, onComplete, vdidUuid }) => {

  const [showVdidModal, setShowVdidModal] = useState(false);
  const [vdidUrl, setVdidUrl]             = useState('');
  const [vdidLoading, setVdidLoading]     = useState(false);
  const [vdidError, setVdidError]         = useState<string | null>(null);

  const alreadyVerified = Boolean(vdidUuid);

  const handleVdidLaunch = async () => {
    if (!vdidService.isConfigured()) {
      setVdidError('VITE_VDID_PUBLIC_KEY no está configurada.');
      return;
    }
    setVdidError(null);
    setVdidLoading(true);
    try {
      const { url } = await vdidService.startTrackedVerification();
      setVdidUrl(url);
      setShowVdidModal(true);
    } catch (err: any) {
      setVdidError(err?.message || 'No se pudo iniciar la verificación.');
    } finally {
      setVdidLoading(false);
    }
  };

  if (alreadyVerified) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black h-[100dvh] w-screen overflow-hidden items-center justify-center px-8">
        <div className="absolute top-0 left-0 right-0 h-16 px-6 flex justify-between items-center safe-top">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="text-right">
            <h2 className="text-white font-bold text-base">Prueba de Vida</h2>
            <p className="text-white/60 text-xs">Verificación Biométrica</p>
          </div>
        </div>
        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-28 h-28 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-green-400">verified_user</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-2xl mb-2">Identidad Verificada</h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">
              Tu documento e identidad fueron validados exitosamente por Suma México.
            </p>
            <p className="text-white/25 text-[10px] font-mono mt-3 break-all">UUID: {vdidUuid}</p>
          </div>
          <button onClick={() => onComplete('')} className="w-full h-14 bg-green-600 hover:bg-green-500 active:scale-95 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">check_circle</span>
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 h-[100dvh] w-screen overflow-hidden">

      {/* HEADER */}
      <div className="shrink-0 h-16 px-6 flex justify-between items-center border-b border-white/10 safe-top">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="text-right">
          <h2 className="text-white font-bold text-base">Prueba de Vida</h2>
          <p className="text-white/60 text-xs">Verificación Biométrica</p>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        <div className="relative">
          <div className="w-36 h-36 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-7xl text-blue-400">face</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gray-900 border-2 border-blue-500/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg text-blue-400">badge</span>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-white font-bold text-2xl mb-3">Prueba de Vida</h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Verifica tu identidad con tu documento oficial y una selfie en tiempo real.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          {[
            { icon: 'badge',          text: 'Escanea tu documento (INE o Pasaporte)' },
            { icon: 'face',           text: 'Tómate una selfie para comparar tu rostro' },
            { icon: 'verified_user',  text: 'Confirmación de identidad en segundos' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm text-blue-400">{step.icon}</span>
              </div>
              <p className="text-white/70 text-xs leading-tight">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div className="shrink-0 px-6 py-6 flex flex-col gap-3 safe-bottom">
        {vdidError && (
          <p className="text-red-400 text-xs text-center">{vdidError}</p>
        )}
        <button
          onClick={handleVdidLaunch}
          disabled={vdidLoading}
          className="w-full h-14 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white rounded-2xl font-bold text-base shadow-xl transition-all flex items-center justify-center gap-3"
        >
          {vdidLoading
            ? <><span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> Iniciando...</>
            : <><span className="material-symbols-outlined text-xl">face</span> Iniciar Verificación</>}
        </button>
        <p className="text-white/25 text-[10px] text-center">
          Powered by Suma México  Proceso seguro y cifrado
        </p>
      </div>

      {/* MODAL VDID */}
      <VdidCaptureModal
        isOpen={showVdidModal}
        onClose={() => setShowVdidModal(false)}
        onCompleted={() => {
          setShowVdidModal(false);
          onComplete('');
        }}
        url={vdidUrl}
        title="Prueba de Vida"
        description="Escanea tu documento y tómate una selfie"
      />
    </div>
  );
};

export default BiometricScreen;
