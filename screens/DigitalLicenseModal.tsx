import React, { useEffect, useState } from 'react';
import { UserData, LicenseRequest } from '../types';
import durangoLogo from '../src/recursos/durangogob.svg';
import marcaWatermark from '../src/recursos/marca.jpg';
import { fotoService } from '../src/api/fotoService';
import { WalletService } from '../src/api/walletService';
import { PlatformDetector } from '../src/utils/platformDetector';

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
    const platform = PlatformDetector.getPlatform();
    const showGoogleWallet = platform === 'android' || platform === 'web';
    const showAppleWallet = platform === 'ios' || platform === 'web';

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
    token: token
    };
    const encodedData = btoa(JSON.stringify(validationData));
    const validationUrl = `${window.location.origin}/#data=${encodedData}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(validationUrl)}`;

    // Funciones para agregar a Wallet
    const handleAddToGoogleWallet = async () => {
        try {
            setIsAddingToWallet(true);
            setWalletError(null);
            const licenseData = WalletService.prepareLicenseData(license, user);
            await WalletService.addToGoogleWallet(licenseData, token);
        } catch (error: any) {
            setWalletError(error.message || 'Error al agregar a Google Wallet');
            console.error('Error al agregar a Google Wallet:', error);
        } finally {
            setIsAddingToWallet(false);
        }
    };

    const handleAddToAppleWallet = async () => {
        try {
            setIsAddingToWallet(true);
            setWalletError(null);
            const licenseData = WalletService.prepareLicenseData(license, user);
            await WalletService.addToAppleWallet(licenseData, token);
        } catch (error: any) {
            setWalletError(error.message || 'Error al agregar a Apple Wallet');
            console.error('Error al agregar a Apple Wallet:', error);
        } finally {
            setIsAddingToWallet(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="relative w-full max-w-[360px] flex flex-col items-center" onClick={e => e.stopPropagation()}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors p-2 z-50"
                >
                    <span className="material-symbols-outlined text-3xl">close</span>
                </button>

                {/* Card Container with Perspective */}
                <div className="w-full aspect-[9/16] perspective-1000 mb-6">
                    {/* Card Inner Container - Handles the Flip */}
                    <div
                        className={`w-full h-full relative transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
                    >
                        {/* FRONT FACE */}
                        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-gray-100 rounded-3xl shadow-2xl overflow-hidden border border-gray-300 flex flex-col">
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
                        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gray-100 rounded-3xl shadow-2xl overflow-hidden border border-gray-300 flex flex-col">
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

                {/* Wallet Buttons */}
                <div className="mt-4 w-full max-w-sm space-y-3">
                    {/* Google Wallet Button */}
                    {showGoogleWallet && (
                        <button
                            onClick={handleAddToGoogleWallet}
                            disabled={isAddingToWallet}
                            className="w-full bg-white hover:bg-gray-100 text-black px-6 py-3 rounded-full shadow-lg transition-all flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAddingToWallet ? (
                                <>
                                    <span className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></span>
                                    <span>Agregando...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M21.9 8.89l-1.05-4.37c-.22-.9-.93-1.52-1.85-1.52H5c-.92 0-1.63.62-1.85 1.52L2.1 8.89c-.12.5.05 1.01.45 1.39.4.38.95.59 1.52.59.92 0 1.7-.59 2.01-1.43l.01-.03c.3-.84 1.03-1.41 1.91-1.41s1.61.57 1.91 1.41l.01.03c.3.84 1.08 1.43 2 1.43.92 0 1.7-.59 2-1.43l.01-.03c.3-.84 1.03-1.41 1.91-1.41.88 0 1.61.57 1.91 1.41l.01.03c.31.84 1.09 1.43 2.01 1.43.57 0 1.12-.21 1.52-.59.4-.38.57-.89.45-1.39z"/>
                                        <path d="M21.9 17.89l-1.05 4.37c-.22.9-.93 1.52-1.85 1.52H5c-.92 0-1.63-.62-1.85-1.52L2.1 17.89c-.12-.5.05-1.01.45-1.39.4-.38.95-.59 1.52-.59.92 0 1.7.59 2.01 1.43l.01.03c.3.84 1.03 1.41 1.91 1.41s1.61-.57 1.91-1.41l.01-.03c.3-.84 1.08-1.43 2-1.43.92 0 1.7.59 2 1.43l.01.03c.3.84 1.03 1.41 1.91 1.41.88 0 1.61-.57 1.91-1.41l.01-.03c.31-.84 1.09-1.43 2.01-1.43.57 0 1.12.21 1.52.59.4.38.57.89.45 1.39z"/>
                                        <path d="M21 10H3v7h18v-7z"/>
                                    </svg>
                                    <span className="tracking-wider">Agregar a Google Wallet</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Apple Wallet Button - Modo prueba */}
                    {showAppleWallet && (
                        <button
                            onClick={handleAddToAppleWallet}
                            disabled={isAddingToWallet}
                            className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg transition-all flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAddingToWallet ? (
                                <>
                                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                                    <span>Generando...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                                    </svg>
                                    <span className="tracking-wider">Apple Wallet (Prueba)</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Mensaje informativo solo para Apple Wallet */}
                    {showAppleWallet && !showGoogleWallet && (
                        <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/30 text-blue-100 px-4 py-2 rounded-lg text-xs text-center">
                            Apple Wallet: Se descargará un archivo JSON de prueba
                        </div>
                    )}

                    {/* Error Message */}
                    {walletError && (
                        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-100 px-4 py-2 rounded-lg text-xs text-center">
                            {walletError}
                        </div>
                    )}
                </div>

                <div className="mt-4 text-center">
                    <p className="text-white/60 text-xs">Toca fuera de la tarjeta para cerrar</p>
                </div>

            </div>
        </div>
    );
};

export default DigitalLicenseModal;
