/**
 * Servicio para integración con VDID SDK (VeriDocID / Suma México)
 *
 * Variables de entorno:
 *  - VITE_VDID_PUBLIC_KEY     → Clave pública del SDK (pk_test_...)
 *  - VITE_VDID_CLIENT_ID      → client_id  asignado por Suma México (OAuth)
 *  - VITE_VDID_CLIENT_SECRET  → client_secret asignado por Suma México (OAuth)
 *
 * Flujo completo (cuando CLIENT_ID y CLIENT_SECRET están configurados):
 *  1. login()          → POST /api/auth/token → JWT Bearer
 *  2. createVerification(jwt, ref) → POST /api/id/v3/verify → UUID real
 *  3. sdk.getUrl({ uuid }) → URL con flujo completo rastreado
 *
 * Flujo de respaldo (solo con PUBLIC_KEY):
 *  getUrlToOnlyCaptureImages() → captura sin UUID, no queda registrada.
 *
 * SDK docs: https://www.npmjs.com/package/vdid-sdk-web
 */
import { WebVerification } from 'vdid-sdk-web';

const VDID_PUBLIC_KEY    = import.meta.env.VITE_VDID_PUBLIC_KEY    as string | undefined;
const VDID_CLIENT_ID     = import.meta.env.VITE_VDID_CLIENT_ID     as string | undefined;
const VDID_CLIENT_SECRET = import.meta.env.VITE_VDID_CLIENT_SECRET as string | undefined;
const VDID_REST_BASE     = 'https://veridocid.azure-api.net/api';

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

// Cache del JWT para no hacer login en cada verificación
let _cachedToken: string | null = null;
let _tokenExpiry: number = 0;

/** Obtiene un JWT Bearer válido usando client_credentials OAuth */
async function getAuthToken(): Promise<string> {
    if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

    const body = new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     VDID_CLIENT_ID!,
        client_secret: VDID_CLIENT_SECRET!,
        audience:      'veridocid',
    });

    const res = await fetch(`${VDID_REST_BASE}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(`Error al obtener token VDID (HTTP ${res.status}): ${msg}`);
    }

    const data = await res.json();
    _cachedToken = data.access_token as string;
    // expires_in viene en segundos; guardamos con 60s de margen
    _tokenExpiry = Date.now() + ((data.expires_in ?? 86400) - 60) * 1000;
    return _cachedToken!;
}

export const vdidService = {

    /** Devuelve true si la clave pública está disponible. */
    isConfigured(): boolean {
        return Boolean(VDID_PUBLIC_KEY);
    },

    /** Devuelve true si las credenciales OAuth están configuradas. */
    hasOAuthCredentials(): boolean {
        return Boolean(VDID_CLIENT_ID && VDID_CLIENT_SECRET);
    },

    /**
     * Flujo principal: hace login OAuth, crea la verificación en Suma México
     * y devuelve la URL del flujo completo con UUID real rastreado.
     *
     * Usa POST /api/id/v2/createVerification → devuelve UUID para el SDK.
     * Si el endpoint no está habilitado en el plan actual, cae automáticamente
     * al flujo de respaldo (getUrlToOnlyCaptureImages).
     *
     * @param userRef  Referencia interna (ej. "licencias-dgo-123")
     */
    async startTrackedVerification(userRef?: string): Promise<{ uuid: string | null; url: string }> {
        const sdk = getSdk();

        try {
            // 1. Obtener JWT
            const jwt = await getAuthToken();

            // 2. Crear verificación → obtener UUID real
            //    Endpoint correcto para el SDK: /id/v2/createVerification
            const ref = userRef ?? `licencias-dgo-${Date.now()}`;
            const verifyRes = await fetch(`${VDID_REST_BASE}/id/v2/createVerification`, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    id:      1,
                    options: { selfie: true, verifyIp: false },
                }),
            });

            if (!verifyRes.ok) {
                // 401 = cuenta sin acceso al endpoint → usar respaldo
                throw new Error(`HTTP ${verifyRes.status}`);
            }

            const raw  = await verifyRes.text();
            const uuid = raw.replace(/^"|"$/g, '').trim();
            if (!uuid) throw new Error('UUID vacío');

            // 3. Generar URL del flujo completo con el UUID real
            const url = sdk.getUrl({ uuid, initAt: 'select-document' });
            return { uuid, url };

        } catch {
            // Fallback: captura sin UUID (funciona siempre con solo la public key)
            const url = sdk.getUrlToOnlyCaptureImages({ typeId: 'first' });
            return { uuid: null, url };
        }
    },

    /**
     * Pre-carga el JWT de Suma México en segundo plano al hacer login.
     * Se llama desde App.tsx justo después de que el usuario inicia sesión.
     * Si falla no lanza error — simplemente el token se obtendrá cuando se necesite.
     */
    async warmupToken(): Promise<void> {
        if (!VDID_CLIENT_ID || !VDID_CLIENT_SECRET) return;
        try {
            await getAuthToken();
        } catch {
            // Silencioso — no afecta el login del usuario
        }
    },

    /** Limpia el token cacheado al hacer logout. */
    clearToken(): void {
        _cachedToken = null;
        _tokenExpiry = 0;
    },

    /**
     * Flujo de respaldo (sin credenciales OAuth).
     * Abre captura de documento + prueba de vida, pero NO queda registrada
     * con UUID en los servidores de Suma México.
     */
    getCaptureUrl(): string {
        const sdk = getSdk();
        return sdk.getUrlToOnlyCaptureImages({ typeId: 'first' });
    },
};
