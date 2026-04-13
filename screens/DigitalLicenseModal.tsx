import React, { useEffect, useState } from 'react';
import { UserData, LicenseRequest } from '../types';
import durangoLogo from '../src/recursos/durangogob.svg';
import marcaWatermark from '../src/recursos/marca.jpg';
import { fotoService } from '../src/api/fotoService';
import { addToWallet, addToAppleWallet, getPlatform, GoogleWalletPassData, AppleWalletPassData } from '../src/api/walletService';
import { API_ENDPOINTS } from '../src/api/endpoints';
import { buildApiUrl } from '../src/api/urlBuilder';


interface DigitalLicenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    license: LicenseRequest | null;
    userData: UserData; // This should be the fresh user data
    token?: string;
}


const DigitalLicenseModal: React.FC<DigitalLicenseModalProps> = ({
    isOpen,
    onClose,
    license,
    userData,
    token
}) => {
    const [isFlipped, setIsFlipped] = React.useState(false);
    const [fotoRostroUrl, setFotoRostroUrl] = useState<string | null>(null);
    const [isAddingToWallet, setIsAddingToWallet] = useState(false);
    const [walletError, setWalletError] = useState<string | null>(null);


    // Detectar plataforma
    const platform = getPlatform();
    const showGoogleWallet = platform === 'android' || platform === 'web';
    const showAppleWallet = platform === 'ios' || platform === 'web';

    // Detectar Windows en navegadores de escritorio para mapear al botón de Google Wallet
    const isWindows = typeof navigator !== 'undefined' && /(Win|Windows)/i.test(navigator.userAgent || navigator.platform || '');
    const walletButtonLabel = platform === 'ios'
        ? 'Agregar a Apple Wallet'
        : (platform === 'android' || isWindows)
            ? 'Agregar a Google Wallet'
            : 'Descargar Pase (.pkpass)';


    // Cargar foto de rostro cuando se abre el modal
    useEffect(() => {
        const loadFotoRostro = async () => {
            if (isOpen && license?.id) {
                const solicitudId = Number(license.id);
                if (solicitudId && token) {
                    const url = await fotoService.descargarFotoRostro(solicitudId, token);
                    setFotoRostroUrl(url);
                }
            }
        };


        loadFotoRostro();


        // Limpiar blob URL al cerrar
        return () => {
            if (fotoRostroUrl && fotoRostroUrl.startsWith('blob:')) {
                URL.revokeObjectURL(fotoRostroUrl);
            }
        };
    }, [isOpen, license?.id, token]);


    if (!isOpen || !license) return null;


    const user = userData as any;
    const fullName = user.nombres
        ? `${user.nombres} ${user.apellidopaterno || ''} ${user.apellidomaterno || ''}`.trim()
        : `${user.firstName || ''} ${user.lastName || ''}`.trim();


    const licenseNo = license.folio || license.rawData?.numerolicencia || 'N/A';


    // Format validity date to dd/mm/yyyy
    const getFormattedDate = () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear() + 3;
        return `${day}/${month}/${year}`;
    };
    const validity = license.rawData?.vigencia?.includes('/') ? license.rawData.vigencia : getFormattedDate();


    const birthDate = user.fechanacimiento || user.birthDate || 'N/A';
    const bloodType = user.tiposangre || user.bloodGroup || 'N/A';
    const donor = user.donador === 'Si' || user.donadororg || user.organDonor ? 'SI' : 'NO';
    const rfc = user.rfc || 'N/A';
    const sexo = user.sexo || 'N/A';
    const nacionalidad = user.nacionalidad || 'MEXICANA';
    const emergencyPhone = user.conocido_telefono || user.telefono || '911';
    const address = user.direccion
        ? `${user.direccion}, ${user.colonia || ''}, ${user.municipio || ''}`
        : user.address || 'Durango, Dgo.';


    // QR Data - URL to validation page (frontend) with encoded license data
    // When someone scans the QR, they'll see a formatted web page with license info
    const validationData = {
        nombre: fullName,
        folio: licenseNo,
        expedicion: license.rawData?.expedicion
            ? new Date(license.rawData.expedicion).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : 'N/A',
        RFC: rfc || 'N/A',
        tipo_licencia: license.type,
        vigencia: validity,
        solicitudId: license.id,
    };
    const encodedData = btoa(JSON.stringify(validationData));
    const validationUrl = `${window.location.origin}/#data=${encodedData}`;
    // QR pointing to the transito photo endpoint for this solicitud
    const photoEndpoint = buildApiUrl(`${API_ENDPOINTS.FOTOS_ROSTRO.TRANSITO}/${license.id}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(validationUrl)}`;


    // Nota: usamos la función `addToWallet` importada para Google/Apple según plataforma.
    // La construcción del objeto `passData` se realiza inline en el handler del botón.


    return (
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto cursor-pointer" onClick={onClose} onTouchStart={onClose}>
            {/* Botón de cerrar fijo en la esquina del viewport */}
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="fixed top-4 md:top-6 right-4 md:right-6 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white/80 hover:text-white transition-all p-2 z-[140] rounded-full flex items-center justify-center shadow-2xl"
                aria-label="Cerrar"
            >
                <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="min-h-full flex items-center justify-center p-4">
                <div className="relative w-full max-w-[400px] flex flex-col items-center py-8" onClick={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>


                    {/* Card Container with Perspective */}
                    <div className="w-full aspect-[9/16] perspective-1000 [-webkit-perspective:1000px] mb-4">
                        {/* Card Inner Container - Handles the Flip */}
                        <div
                            className={`w-full h-full relative transition-all duration-700 [-webkit-transform-style:preserve-3d] [transform-style:preserve-3d] ${isFlipped ? '[-webkit-transform:rotateY(180deg)] [transform:rotateY(180deg)]' : ''}`}
                        >
                            {/* FRONT FACE */}
                            <div className="absolute inset-0 w-full h-full [-webkit-backface-visibility:hidden] [backface-visibility:hidden] [-webkit-transform:translateZ(0)] [transform:translateZ(0)] bg-gray-100 rounded-3xl shadow-2xl overflow-hidden border border-gray-300 flex flex-col">
                                {/* Background Pattern */}
                                <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>


                                {/* Watermark */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10 translate-y-16">
                                    <img src={marcaWatermark} alt="Watermark" className="w-2/3 object-contain" />
                                </div>


                                {/* Header */}
                                <div className="h-20 bg-gray-200 flex items-center justify-center px-6 shadow-md z-10 shrink-0 relative">
                                    <img src={durangoLogo} alt="Gobierno del Estado de Durango" className="h-12 object-contain" />
                                </div>
                                <div className="h-1.5 bg-gradient-to-r from-yellow-500 via-red-700 to-yellow-500 shrink-0 relative z-10"></div>


                                {/* Content */}
                                <div className="flex-1 flex flex-col p-5 relative z-10">
                                    {/* Photo & Name */}
                                    <div className="flex flex-col items-center mb-4">
                                        <div className="w-32 h-40 rounded-xl bg-gray-200 overflow-hidden border-2 border-gray-300 shadow-lg relative mb-3">
                                            {fotoRostroUrl ? (
                                                <img src={fotoRostroUrl} alt="Conductor" className="w-full h-full object-cover" />
                                            ) : user.photo ? (
                                                <img src={user.photo} alt="Conductor" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                                                    <span className="material-symbols-outlined text-6xl">person</span>
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-yellow-500 via-red-700 to-yellow-500 text-center py-1">
                                                <span className="text-[10px] text-white font-bold tracking-wider"></span>
                                            </div>
                                        </div>
                                        <div className="text-center w-full">
                                            <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block mb-0.5">Nombre</label>
                                            <p className="text-lg font-bold leading-tight text-black break-words">{fullName}</p>
                                        </div>
                                    </div>


                                    {/* Details */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block">Tipo de Licencia</label>
                                            <p className="text-sm font-bold text-black uppercase">{license.rawData?.licencia || license.type}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block">No. Licencia</label>
                                            <p className="text-sm font-mono font-bold text-red-700">{licenseNo}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block">Expedición</label>
                                            <p className="text-sm font-bold text-black">{license.rawData?.expedicion ? new Date(license.rawData.expedicion).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block">Vigencia</label>
                                            <p className="text-sm font-bold text-black">{validity}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block">Nacionalidad</label>
                                            <p className="text-sm font-bold text-black">{nacionalidad}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block">Tipo Sangre</label>
                                            <p className="text-sm font-bold text-black">{bloodType}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block">Sexo</label>
                                            <p className="text-sm font-bold text-black">{sexo}</p>
                                        </div>
                                    </div>


                                    {/* Driver Signature */}
                                    <div className="mt-auto text-center">
                                        <div className="h-12 border-b border-gray-400 mb-1 flex items-end justify-center">
                                            <span className="font-cursive text-xl text-black italic" style={{ fontFamily: 'cursive' }}>{fullName.split(' ')[0]} {fullName.split(' ').pop()}</span>
                                        </div>
                                        <label className="text-[8px] uppercase text-gray-500 font-bold tracking-wider">Firma</label>
                                    </div>
                                </div>
                            </div>


                            {/* BACK FACE */}
                            <div className="absolute inset-0 w-full h-full [-webkit-backface-visibility:hidden] [backface-visibility:hidden] [-webkit-transform:rotateY(180deg)] [transform:rotateY(180deg)] bg-gray-100 rounded-3xl shadow-2xl overflow-hidden border border-gray-300 flex flex-col">
                                {/* Background Pattern */}
                                <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>


                                {/* Watermark */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10 translate-y-16">
                                    <img src={marcaWatermark} alt="Watermark" className="w-2/3 object-contain" />
                                </div>


                                {/* Header */}
                                <div className="h-20 bg-gray-200 flex items-center justify-center px-6 shadow-md z-10 shrink-0">
                                    <img src={durangoLogo} alt="Gobierno del Estado de Durango" className="h-12 object-contain" />
                                </div>
                                <div className="h-1.5 bg-gradient-to-r from-yellow-500 via-red-700 to-yellow-500 shrink-0"></div>


                                {/* Content */}
                                <div className="flex-1 flex flex-col p-6 items-center justify-center relative">


                                    {/* QR Code */}
                                    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6 w-48 h-48 flex items-center justify-center">
                                        <img src={qrUrl} alt="QR" className="w-full h-full object-contain" />
                                    </div>


                                    {/* Additional Info */}
                                    <div className="w-full mb-6">
                                        <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block mb-1">RFC</label>
                                        <p className="text-xs font-medium text-gray-700 leading-tight">{rfc}</p>
                                    </div>


                                    <div className="w-full grid grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block">Donador</label>
                                            <p className="text-sm font-bold text-black">{donor}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase text-[#005c35] font-bold tracking-wider block">Emergencia</label>
                                            <p className="text-sm font-bold text-black">{emergencyPhone}</p>
                                        </div>
                                    </div>


                                    {/* Secretary Signature */}
                                    <div className="mt-auto text-center w-full -translate-y-4">
                                        <div className="h-16 flex items-end justify-center mb-2">
                                            {/* Placeholder Signature */}
                                            <svg viewBox="0 0 200 60" className="w-40 h-12 text-black opacity-80">
                                                <path d="M10,50 Q50,10 90,50 T180,30" fill="none" stroke="currentColor" strokeWidth="2" />
                                            </svg>
                                        </div>
                                        <div className="border-t border-gray-400 pt-1 w-3/4 mx-auto">
                                            <p className="text-xs font-bold text-black">Ing. Héctor Eduardo Vela Valenzuela</p>
                                            <label className="text-[8px] uppercase text-gray-500 font-bold tracking-wider block">Secretario General de Gobierno</label>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Flip Button (Bottom) */}
                    <button
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full shadow-lg hover:bg-white/20 transition-all flex items-center gap-2 group"
                    >
                        <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500">360</span>
                        <span className="font-bold tracking-wider uppercase text-sm">Girar Licencia</span>
                    </button>


                    {/* Wallet Button */}
                    {token && (
                        <div className="mt-3 flex flex-col items-center gap-1">
                            <button
                                onClick={async () => {
                                    setWalletError(null);
                                    setIsAddingToWallet(true);
                                    try {
                                        const expedicion = license!.rawData?.expedicion
                                            ? new Date(license!.rawData.expedicion).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                            : 'N/A';

                                        if (platform === 'ios') {
                                            const passData: AppleWalletPassData = {
                                                folio: licenseNo,
                                                nombre: fullName,
                                                tipo_licencia: license!.rawData?.licencia || license!.type,
                                                vigencia: validity,
                                                expedicion,
                                                rfc: rfc !== 'N/A' ? rfc : undefined,
                                                solicitudId: Number(license!.id),
                                            };
                                            await addToAppleWallet(token, passData);
                                        } else {
                                            const passData: GoogleWalletPassData = {
                                                folio: licenseNo,
                                                nombre: fullName,
                                                tipo_licencia: license!.rawData?.licencia || license!.type,
                                                vigencia: validity,
                                                expedicion,
                                                rfc: rfc !== 'N/A' ? rfc : undefined,
                                                solicitudId: Number(license!.id),
                                            };
                                            await addToWallet(Number(license!.id), token, passData);
                                        }
                                    } catch (err: any) {
                                        setWalletError(err?.message || 'No se pudo agregar al wallet');
                                    } finally {
                                        setIsAddingToWallet(false);
                                    }
                                }}
                                disabled={isAddingToWallet}
                                className="disabled:opacity-50 active:scale-95 transition-transform"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: platform === 'ios' ? '10px' : '12px',
                                    background: '#000',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: platform === 'ios' ? '10px 20px' : '10px 24px',
                                    borderRadius: platform === 'ios' ? '10px' : '50px',
                                    minWidth: '220px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                                }}
                            >
                                {isAddingToWallet ? (
                                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 28 }}>progress_activity</span>
                                ) : platform === 'ios' ? (
                                    /* Apple Wallet icon */
                                    <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="36" height="28" rx="4" fill="none" />
                                        <rect x="4" y="13" width="28" height="12" rx="2" fill="#c8b89a" />
                                        <rect x="4" y="10" width="28" height="4" rx="1" fill="#e5d4b3" />
                                        <rect x="4" y="7" width="28" height="4" rx="1" fill="#f3e8d0" />
                                        <rect x="10" y="17" width="8" height="4" rx="1" fill="#f87171" />
                                        <rect x="20" y="17" width="5" height="4" rx="1" fill="#4ade80" />
                                        <rect x="27" y="17" width="3" height="4" rx="1" fill="#60a5fa" />
                                    </svg>
                                ) : (
                                    /* Google Wallet icon */
                                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="32" height="32" rx="6" fill="none" />
                                        <path d="M16 6 L26 11 L26 21 L16 26 L6 21 L6 11 Z" fill="none" />
                                        <rect x="5" y="10" width="22" height="14" rx="3" fill="#4285F4" />
                                        <rect x="5" y="10" width="22" height="5" rx="3" fill="#34A853" />
                                        <rect x="5" y="13" width="22" height="2" fill="#FBBC05" />
                                        <rect x="5" y="18" width="22" height="6" rx="3" fill="#EA4335" />
                                        <rect x="5" y="18" width="22" height="3" fill="#4285F4" />
                                        <circle cx="10" cy="21" r="2" fill="#fff" opacity="0.9" />
                                    </svg>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                                    <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85 }}>
                                        {platform === 'ios' ? 'Agregar a' : 'Agregar a'}
                                    </span>
                                    <span style={{ fontSize: '19px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                                        {platform === 'ios' ? 'Apple Wallet' : 'Google Wallet'}
                                    </span>
                                </div>
                            </button>
                            {walletError && (
                                <p className="text-red-400 text-xs text-center mt-1">{walletError}</p>
                            )}
                        </div>
                    )}

                    <div className="mt-4 text-center">
                        <p className="text-white/60 text-xs">Toca fuera de la tarjeta para cerrar</p>
                    </div>


                </div>
            </div>
        </div>
    );
};


export default DigitalLicenseModal;



