import { Capacitor } from '@capacitor/core';
import { API_ENDPOINTS } from './endpoints';
import { buildApiUrl } from './urlBuilder';

export interface AppleWalletPassData {
    folio: string;
    nombre: string;
    tipo_licencia: string;
    vigencia: string;
    expedicion: string;
    rfc?: string;
    solicitudId?: number;
}

export interface GoogleWalletPassData {
    folio: string;
    nombre: string;
    tipo_licencia: string;
    vigencia: string;
    expedicion: string;
    rfc?: string;
    solicitudId: number;
}

/**
 * Detecta la plataforma actual.
 * Usa Capacitor para apps nativas; cae en userAgent para navegadores móviles.
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
    const nativePlatform = Capacitor.getPlatform();
    if (nativePlatform === 'ios') return 'ios';
    if (nativePlatform === 'android') return 'android';

    // Fallback para navegadores web en dispositivos móviles
    if (typeof navigator !== 'undefined') {
        const ua = navigator.userAgent || '';
        if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
        if (/Android/.test(ua)) return 'android';
    }
    return 'web';
};

/**
 * Envía los datos al backend NestJS (POST /wallet/google/create),
 * obtiene la URL firmada y abre el diálogo de Google Wallet.
 */
export const addToWallet = async (
    _solicitudId: number,
    token: string,
    passData: GoogleWalletPassData,
): Promise<void> => {
    const url = buildApiUrl(API_ENDPOINTS.WALLET.GOOGLE_JWT);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passData),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Error al generar el pase: ${response.status}`);
    }

    const { saveUrl } = await response.json();
    if (!saveUrl) throw new Error('No se recibió URL de Google Wallet');

    // Android nativo abre en el navegador del sistema; web/iOS en nueva pestaña
    const platform = getPlatform();
    window.open(saveUrl, platform === 'android' ? '_system' : '_blank');
};

/**
 * Llama al backend para generar el .pkpass y lo descarga.
 * Asegura no sacar al usuario de la aplicación.
 */
export const addToAppleWallet = async (
    token: string,
    passData: AppleWalletPassData,
): Promise<void> => {
    const url = buildApiUrl(API_ENDPOINTS.WALLET.PKPASS);
    const platform = getPlatform();

    if (platform === 'ios') {
        // Formulario HTML oculto con POST — Safari navega a la respuesta del servidor.
        // El token se pasa como query param en la URL porque los formularios
        // HTML no pueden enviar headers Authorization personalizados.
        const urlWithToken = `${url}?token=${encodeURIComponent(token)}`;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = urlWithToken;
        form.style.display = 'none';

        const addField = (name: string, value: string) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.appendChild(input);
        };

        addField('folio', passData.folio);
        addField('nombre', passData.nombre);
        addField('tipo_licencia', passData.tipo_licencia);
        addField('vigencia', passData.vigencia);
        addField('expedicion', passData.expedicion);
        if (passData.rfc) addField('rfc', passData.rfc);
        if (passData.solicitudId !== undefined) addField('solicitudId', String(passData.solicitudId));

        document.body.appendChild(form);
        form.submit();
        setTimeout(() => document.body.removeChild(form), 3000);
        return;
    }

    // Otros dispositivos: fetch normal + descarga del .pkpass
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passData),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Error al generar el pase Apple Wallet: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const filename = `licencia_${passData.folio.replace(/[^a-zA-Z0-9]/g, '_')}.pkpass`;
    const pkpassBlob = new Blob([arrayBuffer], { type: 'application/vnd.apple.pkpass' });
    const objectUrl = URL.createObjectURL(pkpassBlob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    }, 2000);
};
