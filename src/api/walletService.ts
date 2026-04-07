import { Capacitor } from '@capacitor/core';
import { API_ENDPOINTS } from './endpoints';
import { buildApiUrl } from './urlBuilder';

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
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
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
