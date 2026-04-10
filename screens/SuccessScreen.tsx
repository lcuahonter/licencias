
import React, { useState } from 'react';
import { UserData } from '../types';
import { addToAppleWallet } from '../src/api/walletService';

interface SuccessScreenProps {
  userData: UserData;
  onBack: () => void;
  token?: string;
  idSolicitud?: number;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ userData, onBack, token, idSolicitud }) => {
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const handleAppleWallet = async () => {
    if (!token) {
      setWalletError('No hay sesión activa. Vuelve a iniciar sesión.');
      return;
    }
    setIsLoadingWallet(true);
    setWalletError(null);
    try {
      const today = new Date();
      const expiry = new Date(today);
      expiry.setFullYear(expiry.getFullYear() + 3);
      const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

      await addToAppleWallet(token, {
        folio: `LIC-MX-${userData.idNumber?.substring(0, 8) ?? 'XXXXX'}`,
        nombre: `${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim(),
        tipo_licencia: userData.licenseType ?? 'Automovilista',
        vigencia: fmt(expiry),
        expedicion: fmt(today),
        rfc: userData.idNumber,
        solicitudId: idSolicitud,
      });
    } catch (err: any) {
      setWalletError(err?.message || 'No se pudo generar el pase de Apple Wallet.');
    } finally {
      setIsLoadingWallet(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 pt-12 pb-32">
        <div className="flex flex-col items-center text-center space-y-4 mb-10">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/20 text-white animate-bounce-short">
            <span className="material-symbols-outlined text-4xl font-bold">check</span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">¡Felicidades!</h1>
            <p className="text-gray-500 dark:text-gray-400">Tu licencia digital ha sido emitida.</p>
          </div>
        </div>

        {/* Digital License Card */}
        <div className="relative group perspective-1000">
          <div className="relative w-full aspect-[1.58/1] bg-white text-gray-900 rounded-[1.5rem] shadow-2xl overflow-hidden border border-gray-200 transition-transform duration-700 hover:rotate-y-12">
            
            {/* Holographic Overlay Effect */}
            <div className="absolute inset-0 z-20 pointer-events-none hologram-overlay mix-blend-soft-light opacity-60"></div>
            
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 license-pattern opacity-10"></div>
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
            
            {/* Header */}
            <div className="relative z-10 h-1/5 bg-primary px-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-sm">security</span>
                <span className="text-white text-[9px] font-black uppercase tracking-widest">Digital MX</span>
              </div>
              <span className="text-white font-black text-xs">MÉXICO</span>
            </div>

            {/* Content Area */}
            <div className="relative z-10 h-4/5 p-4 flex gap-4">
              {/* Photo */}
              <div className="w-1/3 flex flex-col items-center gap-2">
                <div className="w-full aspect-[3/4] bg-gray-200 rounded-xl overflow-hidden border-2 border-white shadow-md relative">
                   <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.lastName}&backgroundColor=b6e3f4`}
                    alt="License portrait"
                    className="w-full h-full object-cover"
                   />
                </div>
                <p className="text-[7px] font-black text-primary uppercase text-center leading-none">Conductor Autorizado</p>
              </div>

              {/* Data */}
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[7px] text-gray-400 font-black uppercase leading-none mb-1">No. Licencia</p>
                      <p className="text-sm font-black font-mono tracking-tighter">LIC-MX-{userData.idNumber.substring(0,8)}</p>
                    </div>
                    <div className="bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                      <span className="text-[9px] font-black">{userData.licenseType.split(' ')[1]}</span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <p className="text-[7px] text-gray-400 font-black uppercase leading-none mb-1">Nombre</p>
                    <p className="text-[13px] font-black uppercase leading-tight">{userData.firstName} {userData.lastName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <div>
                    <p className="text-[7px] text-gray-400 font-black uppercase leading-none mb-0.5">Vigencia</p>
                    <p className="text-[10px] font-bold">12/2028</p>
                  </div>
                  <div>
                    <p className="text-[7px] text-gray-400 font-black uppercase leading-none mb-0.5">Sangre</p>
                    <p className="text-[10px] font-bold">{userData.bloodGroup}</p>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="absolute bottom-4 right-4 w-12 h-12 bg-white p-1 rounded-lg border border-gray-100 shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-900 text-3xl">qr_code_2</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center gap-4 shadow-sm">
             <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">wallet</span>
             </div>
             <div className="flex-1">
                <p className="text-sm font-bold">Seguridad Total</p>
                <p className="text-xs text-gray-500">Documento encriptado con validez nacional.</p>
             </div>
          </div>
          
          <div className="flex gap-3">
             <button className="flex-1 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 shadow-sm">
                <span className="material-symbols-outlined text-xl">share</span>
                Compartir
             </button>
             <button className="flex-1 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 shadow-sm">
                <span className="material-symbols-outlined text-xl">download</span>
                Guardar PDF
             </button>
          </div>
        </div>
      </div>

      <div className="p-6 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent pt-10">
        {walletError && (
          <p className="text-red-500 text-xs text-center mb-2">{walletError}</p>
        )}
        <button
          onClick={handleAppleWallet}
          disabled={isLoadingWallet}
          className="w-full h-16 bg-black text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoadingWallet ? (
            <>
              <span className="animate-spin material-symbols-outlined">progress_activity</span>
              Generando pase...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">add_circle</span>
              Agregar a Apple Wallet
            </>
          )}
        </button>
        <button 
          onClick={onBack}
          className="w-full h-12 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors mt-2"
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  );
};

export default SuccessScreen;
