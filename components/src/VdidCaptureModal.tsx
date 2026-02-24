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
    const [processFinished, setProcessFinished] = useState(false);
    const [vdidMessages, setVdidMessages] = useState<{ origin: string; data: any; ts: string }[]>([]);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Capturar y mostrar en pantalla todos los mensajes del iframe
    useEffect(() => {
        if (!isOpen) return;
        setProcessFinished(false);
        setVdidMessages([]);

        const handleMessage = (event: MessageEvent) => {
            if (!event.origin.includes('sumamexico.com') && !event.origin.includes('veridocid')) return;
            console.log('[VDID postMessage]', event.origin, event.data);
            setVdidMessages(prev => [
                ...prev,
                { origin: event.origin, data: event.data, ts: new Date().toLocaleTimeString() },
            ]);
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isOpen]);

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

            {/* ── DEBUG: mensajes del iframe ─────────────────────── */}
            {vdidMessages.length > 0 && (
                <div className="shrink-0 bg-black border-t border-yellow-500/30 px-3 py-2 max-h-40 overflow-y-auto">
                    <p className="text-yellow-400 text-[10px] font-bold mb-1 uppercase tracking-wider">📨 postMessage del iframe ({vdidMessages.length})</p>
                    {vdidMessages.map((m, i) => (
                        <div key={i} className="mb-2 border border-white/10 rounded p-2">
                            <p className="text-white/40 text-[9px] mb-1">{m.ts} · {m.origin}</p>
                            <pre className="text-green-300 text-[10px] whitespace-pre-wrap break-all">
                                {typeof m.data === 'string' ? m.data : JSON.stringify(m.data, null, 2)}
                            </pre>
                        </div>
                    ))}
                </div>
            )}

            {/* ── FOOTER ───────────────────────────────────────────── */}
            <div className="shrink-0 bg-gray-900 border-t border-white/10 px-4 py-4 flex flex-col gap-2 safe-bottom">
                <button
                    onClick={onCompleted}
                    className="w-full h-13 bg-green-600 hover:bg-green-500 active:scale-95 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg py-3"
                >
                    <span className="material-symbols-outlined">check_circle</span>
                    Ya terminé todos los pasos
                </button>
                <p className="text-white/30 text-[10px] text-center">
                    Completa el documento <span className="text-white/50 font-bold">y la selfie</span> antes de presionar este botón
                </p>
            </div>
        </div>
    );
};

export default VdidCaptureModal;
