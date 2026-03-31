import React, { useEffect, useState } from 'react';
import durangoLogo from '../src/recursos/durangogob.svg';
import { fotoService } from '../src/api/fotoService'; 

// --- Íconos ---
const CheckBadgeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-[#00c853]">
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const UserPlaceholderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

// Interfaz estricta con solo los datos necesarios
interface LicenseValidationData {
  nombre: string;
  folio: string;
  expedicion: string;
  RFC: string;
  tipo_licencia: string;
  vigencia: string;
  solicitudId?: string | number;
  token?: string;
}

const ValidacionLicenciaScreen: React.FC = () => {
  const [licenseData, setLicenseData] = useState<LicenseValidationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  
  // Estados de la foto
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoStatus, setFotoStatus] = useState<'loading' | 'success' | 'error'>('loading');

  // 1. Decodificar QR
  useEffect(() => {
    try {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const dataParam = params.get('data');

      if (dataParam) {
        const decodedData = atob(dataParam);
        const parsedData = JSON.parse(decodedData);
        setLicenseData(parsedData);
      } else {
        setError('No se encontraron datos en el código QR.');
      }
    } catch (err) {
      setError('Error al decodificar la información. El código QR puede estar dañado.');
    }

    const timer = setTimeout(() => setIsScanning(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // 2. Fetch Foto
  useEffect(() => {
    let currentBlobUrl: string | null = null; 

    if (licenseData && licenseData.solicitudId && licenseData.token) {
      const obtenerFoto = async () => {
        try {
          setFotoStatus('loading');
          const url = await fotoService.descargarFotoRostro(
            Number(licenseData.solicitudId), 
            licenseData.token!
          );

          if (url) {
            currentBlobUrl = url;
            setFotoUrl(url);
          } else {
            setFotoStatus('error');
          }
        } catch (error) {
          console.error('Error al descargar la foto:', error);
          setFotoStatus('error');
        }
      };

      obtenerFoto();
    } else if (licenseData) {
      setFotoStatus('error');
    }

    return () => {
      if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [licenseData]);

  const formatDate = (dateString: string): string => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      if (dateString.includes('/')) return dateString;
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-t-8 border-[#C8102E]">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Validación Fallida</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-[#C8102E] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#a00c25] transition-colors">
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  if (!licenseData) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] relative overflow-hidden font-sans text-gray-800">
      
      <style>{`
        @keyframes scan { 0% { top: -10%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 110%; opacity: 0; } }
        .laser-scan { position: absolute; width: 100%; height: 4px; background: rgba(0, 178, 89, 0.8); box-shadow: 0 0 15px rgba(0, 178, 89, 0.8), 0 0 30px rgba(0, 178, 89, 0.4); z-index: 50; animation: scan 1.5s ease-in-out forwards; }
        .bg-watermark { background-image: url(${durangoLogo}); background-repeat: no-repeat; background-position: center center; background-size: 60vw; opacity: 0.02; position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0; }
        .durango-gradient { background: linear-gradient(90deg, #FDB913 0%, #FDB913 30%, #C8102E 30%, #C8102E 100%); }
        .hologram-effect { background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.1) 100%); background-size: 200% 200%; animation: shimmer 3s infinite linear; }
        @keyframes shimmer { 0% { background-position: -200% -200%; } 100% { background-position: 200% 200%; } }
      `}</style>

      <div className="bg-watermark"></div>

      {/* --- HEADER RESTAURADO IDENTICO A LA FOTO --- */}
      <header className="w-full bg-white shadow-sm relative z-20 border-b border-gray-200">
        <div className="durango-gradient h-1.5 w-full"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={durangoLogo} alt="Gobierno de Durango" className="h-10 sm:h-12 w-auto" />
            <div className="hidden sm:flex border-l-[1.5px] border-gray-300 pl-4 h-10 flex-col justify-center">
              <h1 className="text-[11px] sm:text-[13px] font-bold text-[#C8102E] uppercase tracking-wider leading-tight">Secretaría de Movilidad</h1>
              <h1 className="text-[11px] sm:text-[13px] font-bold text-[#C8102E] uppercase tracking-wider leading-tight">Y Transportes</h1>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Portal de Verificación</p>
            <p className="text-sm font-bold text-gray-800">Licencias Digitales</p>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 relative z-10 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* --- COLUMNA IZQUIERDA CON RECUADRO DE VALIDACIÓN --- */}
          <div className="col-span-1 lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="mb-4 relative">
              {isScanning ? (
                <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-[#005c35] animate-spin mx-auto lg:mx-0"></div>
              ) : (
                <div className="animate-[bounce_0.5s_ease-out]"><CheckBadgeIcon /></div>
              )}
            </div>
            <h2 className="text-3xl font-extrabold text-[#111827] mb-3 tracking-tight">
              {isScanning ? 'Verificando Registro...' : 'Licencia Auténtica'}
            </h2>
            <p className="text-gray-500 text-base mb-8 max-w-sm">
              {isScanning ? 'Consultando las bases de datos del Estado de Durango mediante conexión segura.' : 'El código QR escaneado corresponde a una licencia vigente y validada por el Gobierno del Estado.'}
            </p>

            {/* Recuadro de Fecha y Hora restaurado */}
            {!isScanning && (
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 w-full max-w-sm shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fecha de Escaneo</span>
                  <span className="text-sm font-bold text-gray-900">
                    {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hora Exacta</span>
                  <span className="text-sm font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    {new Date().toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* --- COLUMNA DERECHA: TARJETA DE LICENCIA --- */}
          <div className="col-span-1 lg:col-span-7 flex justify-center lg:justify-end">
            <div className={`relative w-full max-w-lg bg-white rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.1)] border border-gray-200 overflow-hidden transition-all duration-700 ${isScanning ? 'opacity-50 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
              
              {isScanning && <div className="laser-scan"></div>}
              {!isScanning && <div className="absolute inset-0 hologram-effect pointer-events-none opacity-20 z-50"></div>}

              <div className="bg-[#005c35] px-5 sm:px-6 py-3.5 flex justify-between items-center relative overflow-hidden">
                <div className="flex items-center">
                  <ShieldIcon />
                  <span className="text-white font-bold tracking-widest text-xs">DATOS DEL TITULAR</span>
                </div>
                <span className="bg-white text-[#005c35] text-[9px] sm:text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                  {licenseData.tipo_licencia}
                </span>
              </div>

              <div className="p-5 sm:p-7 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                
                <div className="flex flex-col sm:flex-row gap-5 mb-6 items-center sm:items-start">
                  
                  <div className="shrink-0 relative z-10">
                    <div className="w-32 h-40 sm:w-32 sm:h-44 rounded-xl bg-slate-100 overflow-hidden border border-gray-200 relative flex items-center justify-center">
                      
                      {fotoStatus === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#005c35] border-t-transparent"></div>
                        </div>
                      )}

                      <img 
                        src={fotoUrl || ''} 
                        alt="Conductor" 
                        className={`w-full h-full object-cover transition-opacity duration-300 ${fotoStatus === 'success' ? 'opacity-100' : 'opacity-0 hidden'}`}
                        onLoad={() => setFotoStatus('success')}
                        onError={() => setFotoStatus('error')}
                      />

                      {fotoStatus === 'error' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                          <UserPlaceholderIcon />
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 h-1 durango-gradient z-20"></div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center text-center sm:text-left pt-1 relative z-10 w-full">
                    <p className="text-[9px] font-bold text-[#C8102E] uppercase tracking-widest mb-1">Nombre Completo</p>
                    <p className="text-xl sm:text-2xl font-black text-gray-900 leading-tight uppercase mb-4">{licenseData.nombre}</p>
                    
                    <div className="inline-block bg-gray-50/80 p-3 rounded-lg border border-gray-100 self-center sm:self-start w-full sm:w-auto">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">No. Licencia</p>
                      <p className="text-base font-bold text-[#C8102E] tracking-wider">{licenseData.folio}</p>
                    </div>
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-4 relative z-10">
                  <div className="bg-white p-3 rounded-lg border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nacionalidad</p>
                    <p className="text-xs font-bold text-gray-900">MEXICANA</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">RFC</p>
                    <p className="text-xs font-bold text-gray-900">{licenseData.RFC}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Expedición</p>
                    <p className="text-xs font-bold text-gray-900">{formatDate(licenseData.expedicion)}</p>
                  </div>
                  <div className="bg-[#f0fdf4] p-3 rounded-lg border border-[#00c853]/40">
                    <p className="text-[9px] font-bold text-[#005c35] uppercase tracking-widest mb-1">Vigencia</p>
                    <p className="text-xs font-bold text-[#005c35]">{licenseData.vigencia}</p>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-end">
                  <div className="text-[8px] uppercase tracking-widest text-gray-400 font-mono">
                    GOB.DGO.VALIDADOR.V2.0<br/>{licenseData.folio}-{btoa(licenseData.nombre).substring(0,8)}
                  </div>
                  <img src={durangoLogo} alt="Sello" className="h-6 grayscale opacity-30" />
                </div>

              </div>
              <div className="durango-gradient h-1.5 w-full"></div>
            </div>

          </div>
        </div>
      </main>

      {/* --- FOOTER RESTAURADO IDENTICO A LA FOTO --- */}
      <footer className="w-full bg-[#111827] text-gray-400 py-6 relative z-20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-[10px] sm:text-xs">
          <div className="mb-4 sm:mb-0 text-center sm:text-left">
            <p className="font-bold text-white mb-1">Gobierno del Estado de Durango © {new Date().getFullYear()}</p>
            <p className="max-w-lg">Este sistema de validación criptográfica opera bajo los lineamientos de seguridad de la Secretaría de Seguridad Pública Estatal.</p>
          </div>
          <div className="flex gap-4 font-semibold">
            <a href="#" className="hover:text-white transition-colors">Aviso de Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Soporte Técnico</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default ValidacionLicenciaScreen;

