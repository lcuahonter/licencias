/**
 * Servicio para integración con VDID SDK (VeriDocID / Suma México)
 *
 * Variables de entorno (SOLO públicas — se incluyen en el bundle JS):
 *  - VITE_VDID_PUBLIC_KEY  → Clave pública del SDK para inicializar WebVerification
 *
 * Las credenciales secretas (VDID_API_KEY, VDID_CLIENT_ID, VDID_CLIENT_SECRET)
 * viven ÚNICAMENTE en el backend (licencias_bk/.env). El frontend nunca las ve.
 *
 * Flujo:
 *  1. Frontend llama POST /api/vdid/createVerification al backend propio
 *  2. El backend llama a VeriDocID con sus credenciales y retorna { uuid }
 *  3. El frontend usa el uuid con sdk.getUrl({ uuid })
 *
 * SDK docs: https://www.npmjs.com/package/vdid-sdk-web
 */
import { WebVerification } from 'vdid-sdk-web';
import { buildApiUrl } from './urlBuilder';

const VDID_PUBLIC_KEY = import.meta.env.VITE_VDID_PUBLIC_KEY as string | undefined;

// Singleton del SDK
let _sdk: WebVerification | null = null;

function getSdk(): WebVerification {
    if (!_sdk) {
        if (!VDID_PUBLIC_KEY) {
            throw new Error('VITE_VDID_PUBLIC_KEY no está configurada en .env');
        }
        _sdk = new WebVerification(VDID_PUBLIC_KEY);
    }
    return _sdk;
}

/**
 * Llama al endpoint del backend propio para obtener un UUID de VeriDocID.
 * El backend se encarga de las credenciales secretas (API key, OAuth).
 */
async function createVerificationViaBackend(idsolicitud: number, token?: string): Promise<string> {
    const url = buildApiUrl('/api/vdid/createVerification');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ idsolicitud }),
    });

    if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(`Error al crear verificación VDID (HTTP ${res.status}): ${msg}`);
    }

    const data = await res.json();
    const uuid = data?.uuid || data?.data?.uuid;
    if (!uuid) throw new Error('El backend no retornó un UUID de VeriDocID');
    return uuid as string;
}

export const vdidService = {

    /** Devuelve true si la clave pública está disponible. */
    isConfigured(): boolean {
        return Boolean(VDID_PUBLIC_KEY);
    },

    /**
     * Flujo principal:
     *  1. Solicita UUID al backend propio (que llama a VeriDocID con sus credenciales secretas)
     *  2. Usa el UUID para obtener la URL del SDK
     *  3. Fallback: getUrlToOnlyCaptureImages si el backend no está disponible
     *
     * @param idsolicitud  ID de la solicitud en la BD local
     * @param token        JWT del usuario para autenticar la petición al backend
     */
    async startTrackedVerification(idsolicitud: number, token?: string): Promise<{ uuid: string | null; url: string }> {
        const sdk = getSdk();

        try {
            const uuid = await createVerificationViaBackend(idsolicitud, token);
            const url  = sdk.getUrl({ uuid });
            return { uuid, url };
        } catch (e) {
            // Fallback: solo captura de documento sin selfie rastreada
            const url = sdk.getUrlToOnlyCaptureImages({ typeId: 'first' });
            return { uuid: null, url };
        }
    },

    /**
     * Consulta si la verificación ya fue procesada.
     * Delega al backend para evitar exponer credenciales.
     * POST /api/vdid/status  { uuid }
     */
    async getStatus(uuid: string, token?: string): Promise<boolean> {
        const url = buildApiUrl('/api/vdid/status');
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ uuid }),
            });
            if (!res.ok) return false;
            const data = await res.json();
            return data?.ready === true;
        } catch {
            return false;
        }
    },

    /**
     * Obtiene los resultados de la verificación.
     * Delega al backend para evitar exponer credenciales.
     * POST /api/vdid/results  { uuid }
     */
    async getResults(uuid: string, token?: string): Promise<{
        status: string;
        globalResult: string;
        globalResultDescription: string;
        selfieBase64: string | null;
        frontBase64: string | null;
        backBase64: string | null;
        data: any;
    }> {
        const url = buildApiUrl('/api/vdid/results');
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ uuid, includeImages: true }),
        });

        const text = await res.text().catch(() => '');

        if (
            text.toLowerCase().includes("isn't ready") ||
            text.toLowerCase().includes('not ready')
        ) {
            return {
                status:                  'not_ready',
                globalResult:            'not_ready',
                globalResultDescription: '',
                selfieBase64: null,
                frontBase64:  null,
                backBase64:   null,
                data:         {},
            };
        }

        if (!res.ok) {
            throw new Error(`Error al obtener resultados VDID (HTTP ${res.status}): ${text}`);
        }

        let data: any = {};
        try { data = JSON.parse(text); } catch {
            throw new Error(`Respuesta inesperada de VDID: ${text.slice(0, 200)}`);
        }

        return {
            status:                  data.status                  || data.verificationStatus || 'unknown',
            globalResult:            data.globalResult            || 'unknown',
            globalResultDescription: data.globalResultDescription || data.expertComments || '',
            selfieBase64: data.images?.selfie || data.selfie || null,
            frontBase64:  data.images?.front  || data.front  || null,
            backBase64:   data.images?.back   || data.back   || null,
            data,
        };
    },

    /**
     * Polling hasta que la verificación esté lista o se agote el tiempo.
     */
    async waitForResults(uuid: string, token?: string, maxWaitMs = 60_000, intervalMs = 3_000): Promise<boolean> {
        const deadline = Date.now() + maxWaitMs;
        while (Date.now() < deadline) {
            try {
                const ready = await this.getStatus(uuid, token);
                if (ready) return true;
            } catch {
                // continuar
            }
            await new Promise(r => setTimeout(r, intervalMs));
        }
        return false;
    },

    /** Limpia el singleton del SDK (útil en tests). */
    resetSdk(): void {
        _sdk = null;
    },

    /**
     * URL de captura sin UUID (solo documento, sin selfie rastreada).
     * Solo usar como fallback de emergencia.
     */
    getCaptureUrl(): string {
        const sdk = getSdk();
        return sdk.getUrlToOnlyCaptureImages({ typeId: 'first' });
    },
};
