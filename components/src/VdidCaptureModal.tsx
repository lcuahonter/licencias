/**
 * VdidCaptureModal
 *
 * Modal reutilizable que muestra el flujo de VDID dentro de un <iframe>.
 * Se usa tanto para captura de documentos (INE / Pasaporte)
 * como para el flujo completo con prueba de vida (cuando se tiene UUID).
 *
 * Props:
 *  - isOpen        Controla visibilidad del modal.
 *  - onClose       Callback al cerrar.
 *  - onCompleted   Callback cuando el usuario declara que terminó el proceso.
 *  - url           URL del iframe (obtenida desde vdidService).
 *  - title         Título que se muestra en la barra superior.
 *  - description   Texto descriptivo opcional.
 */
import React, { useEffect, useRef, useState } from 'react';

interface VdidCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCompleted: () => void;
    url: string;
    title?: string;
    description?: string;
}

const VdidCaptureModal: React.FC<VdidCaptureModalProps> = ({
    isOpen,
    onClose,
    onCompleted,
    url,
    title = 'Verificación de Identidad',
    description = 'Completa el proceso en la ventana y luego presiona "Listo".',
}) => {
    // true cuando Suma México notifica que el proceso terminó (postMessage)
    const [processFinished, setProcessFinished] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Escuchar mensajes del iframe de capturas.sumamexico.com
    useEffect(() => {
        if (!isOpen) return;
        setProcessFinished(false); // reset al abrir

        const handleMessage = (event: MessageEvent) => {
            // Aceptar solo mensajes del dominio de Suma México
            if (!event.origin.includes('sumamexico.com') && !event.origin.includes('veridocid')) return;
            // Cualquier mensaje del iframe se interpreta como finalización
            setProcessFinished(true);
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isOpen]);

    // Auto-continuar 1.5 s después de recibir el mensaje de finalización
    useEffect(() => {
        if (!processFinished) return;
        const timer = setTimeout(() => onCompleted(), 1500);
        return () => clearTimeout(timer);
    }, [processFinished, onCompleted]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex flex-col bg-black/90 backdrop-blur-sm"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {/* ── HEADER ───────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-white/10 safe-top">
                <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                    aria-label="Cerrar"
                >
                    <span className="material-symbols-outlined text-xl">close</span>
                </button>

                <div className="text-center flex-1 px-3">
                    <h2 className="text-white font-bold text-sm leading-tight">{title}</h2>
                    {description && (
                        <p className="text-white/60 text-[11px] leading-tight mt-0.5">{description}</p>
                    )}
                </div>

                {/* Spacer para centrar el título */}
                <div className="w-9" />
            </div>

            {/* ── IFRAME ───────────────────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden">
                {url ? (
                    <iframe
                        ref={iframeRef}
                        src={url}
                        className="absolute inset-0 w-full h-full border-none"
                        allow="camera; microphone; geolocation"
                        allowFullScreen
                        title={title}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm px-8 text-center">
                        <div>
                            <span className="material-symbols-outlined text-5xl block mb-3 opacity-40">link_off</span>
                            URL de verificación no disponible.<br />
                            Verifica la configuración de VITE_VDID_PUBLIC_KEY.
                        </div>
                    </div>
                )}
            </div>

            {/* ── FOOTER ───────────────────────────────────────────── */}
            <div className="shrink-0 bg-gray-900 border-t border-white/10 px-4 py-3 flex items-center justify-center safe-bottom">
                {processFinished ? (
                    <div className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full" />
                        <span className="text-green-400 text-xs font-medium">Cerrando...</span>
                    </div>
                ) : (
                    <p className="text-white/30 text-[11px]">Sigue las instrucciones en pantalla</p>
                )}
            </div>
        </div>
    );
};

export default VdidCaptureModal;
