/**
 * Servicio para integración con VDID SDK (VeriDocID / Suma México)
 *
 * Variables de entorno:
 *  - VITE_VDID_PUBLIC_KEY     → Clave pública del SDK (pk_test_...)
 *  - VITE_VDID_API_KEY        → x-api-key para /v3/createVerification (puede ser
 *                               la misma pk_test o una clave separada del panel Suma México)
 *  - VITE_VDID_CLIENT_ID      → client_id OAuth (opcional, respaldo)
 *  - VITE_VDID_CLIENT_SECRET  → client_secret OAuth (opcional, respaldo)
 *
 * Flujo principal:
 *  POST /api/id/v3/createVerification  →  UUID  →  sdk.getUrl({ uuid })
 *  El flujo completo incluye: documento + selfie + liveness
 *
 * Flujo de respaldo (si falla todo):
 *  getUrlToOnlyCaptureImages() → solo captura de documento, sin selfie
 *
 * SDK docs: https://www.npmjs.com/package/vdid-sdk-web
 */
import { WebVerification } from 'vdid-sdk-web';

const VDID_PUBLIC_KEY    = import.meta.env.VITE_VDID_PUBLIC_KEY    as string | undefined;
const VDID_API_KEY       = import.meta.env.VITE_VDID_API_KEY       as string | undefined;
const VDID_CLIENT_ID     = import.meta.env.VITE_VDID_CLIENT_ID     as string | undefined;
const VDID_CLIENT_SECRET = import.meta.env.VITE_VDID_CLIENT_SECRET as string | undefined;

// Proxy de Vite solo disponible en modo desarrollo (npm run dev)
// En producción (APK Android/iOS) siempre llamar directo
const VDID_REST_BASE = import.meta.env.DEV
    ? '/vdid-api'
    : 'https://veridocid.azure-api.net/api';

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
     * Intenta en orden:
     *  1. POST /v3/createVerification con x-api-key (VDID_API_KEY o PUBLIC_KEY)
     *     → incluye selfie + liveness
     *  2. POST /v2/createVerification con Bearer JWT (OAuth)
     *  3. Fallback: getUrlToOnlyCaptureImages (solo documento, sin selfie)
     *
     * @param userRef  Referencia interna (ej. "licencias-dgo-123")
     */
    async startTrackedVerification(userRef?: string): Promise<{ uuid: string | null; url: string }> {
        const sdk = getSdk();
        const ref = userRef ?? `licencias-dgo-${Date.now()}`;

        // ── Intento 1: /v3/createVerification con x-api-key ────────────────
        //    Usa VITE_VDID_API_KEY si está definida, si no prueba con PUBLIC_KEY
        const apiKey = VDID_API_KEY || VDID_PUBLIC_KEY;
        if (apiKey) {
            try {
                const v3Res = await fetch(`${VDID_REST_BASE}/id/v3/createVerification`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key':    apiKey,
                    },
                    body: JSON.stringify({
                        id: ref,
                        options: {
                            checks: {
                                selfie:       true,
                                verifyIp:     false,
                                onlyVerifyID: false,
                            },
                            language_sdk: 'es',
                        },
                    }),
                });

                if (v3Res.ok) {
                    const raw  = await v3Res.text();
                    const uuid = raw.replace(/^"|"$/g, '').trim();
                    if (uuid) {
                        console.log('[VDID] v3/createVerification OK, UUID:', uuid);
                        const url = sdk.getUrl({ uuid });
                        return { uuid, url };
                    }
                } else {
                    const errText = await v3Res.text().catch(() => '');
                    console.warn(`[VDID] v3/createVerification falló (${v3Res.status}):`, errText);
                }
            } catch (e) {
                console.warn('[VDID] v3/createVerification error de red:', e);
            }
        }

        // ── Intento 2: /v2/createVerification con Bearer JWT (OAuth) ────────
        try {
            const jwt = await getAuthToken();
            const v2Res = await fetch(`${VDID_REST_BASE}/id/v2/createVerification`, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${jwt}`,
                },
                body: JSON.stringify({
                    id:      ref,
                    options: { selfie: true, verifyIp: false },
                }),
            });

            if (v2Res.ok) {
                const raw  = await v2Res.text();
                const uuid = raw.replace(/^"|"$/g, '').trim();
                if (uuid) {
                    console.log('[VDID] v2/createVerification OK, UUID:', uuid);
                    const url = sdk.getUrl({ uuid });
                    return { uuid, url };
                }
            } else {
                console.warn(`[VDID] v2/createVerification falló (${v2Res.status})`);
            }
        } catch (e) {
            console.warn('[VDID] v2/createVerification error:', e);
        }

        // ── Fallback: solo captura de documento (sin selfie) ─────────────────
        // Nota: getUrl({uuid:''}) rompe el iframe — usar onlyCapture como respaldo seguro
        console.warn('[VDID] Usando fallback onlyCapture (sin selfie) — activa sk_test_ para selfie');
        const url = sdk.getUrlToOnlyCaptureImages({ typeId: 'first' });
        return { uuid: null, url };
    },

    /**
     * Consulta si la verificación ya fue procesada por Suma México.
     * POST /api/id/v2/status  { uuid }
     * Retorna true cuando está lista (ya no dice "isn't ready").
     */
    async getStatus(uuid: string): Promise<boolean> {
        const jwt = await getAuthToken();
        const res = await fetch(`${VDID_REST_BASE}/id/v2/status`, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${jwt}`,
            },
            body: JSON.stringify({ uuid }),
        });
        if (!res.ok) return false;
        const text = await res.text();
        // Cuando NO está lista dice: "...isn't ready"
        return !text.toLowerCase().includes("isn't ready") && !text.toLowerCase().includes('not ready');
    },

    /**
     * Obtiene los resultados de la verificación incluyendo imágenes en base64.
     * POST /api/id/v2/results  { uuid, includeImages: true }
     * Retorna selfie y datos del documento.
     */
    async getResults(uuid: string): Promise<{
        status: string;
        selfieBase64: string | null;
        frontBase64: string | null;
        backBase64: string | null;
        data: any;
    }> {
        const jwt = await getAuthToken();
        const res = await fetch(`${VDID_REST_BASE}/id/v2/results`, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${jwt}`,
            },
            body: JSON.stringify({ uuid, includeImages: true }),
        });
        if (!res.ok) {
            const msg = await res.text().catch(() => '');
            throw new Error(`Error al obtener resultados VDID (HTTP ${res.status}): ${msg}`);
        }
        const data = await res.json();
        return {
            status:       data.status       || data.verificationStatus || 'unknown',
            selfieBase64: data.images?.selfie || data.selfie            || null,
            frontBase64:  data.images?.front  || data.front             || null,
            backBase64:   data.images?.back   || data.back              || null,
            data,
        };
    },

    /**
     * Polling de /id/v2/status hasta que esté listo o se agote el tiempo.
     * @param uuid        UUID de la verificación
     * @param maxWaitMs   Tiempo máximo a esperar (default 60s)
     * @param intervalMs  Intervalo entre intentos (default 3s)
     */
    async waitForResults(uuid: string, maxWaitMs = 60_000, intervalMs = 3_000): Promise<boolean> {
        const deadline = Date.now() + maxWaitMs;
        while (Date.now() < deadline) {
            try {
                const ready = await this.getStatus(uuid);
                if (ready) return true;
            } catch {
                // continuar intentando
            }
            await new Promise(r => setTimeout(r, intervalMs));
        }
        return false; // timeout
    },

    /**
     * Valida una CURP contra el RENAPO via VeriDocID.
     * Usa Bearer JWT (mismo flujo que documentos e imágenes).
     * POST /api/gov/curp  { id: '01', curp: '...' }
     */
    async validateCurp(curp: string): Promise<{
        nombre: string;
        apellidoPaterno: string;
        apellidoMaterno: string;
        fechaNacimiento: string; // formato YYYY-MM-DD
    }> {
        const jwt = await getAuthToken();
        const res = await fetch(`${VDID_REST_BASE}/gov/curp`, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${jwt}`,
            },
            body: JSON.stringify({ id: '01', curp }),
        });
        if (!res.ok) {
            const msg = await res.text().catch(() => '');
            throw new Error(`Error al validar CURP (HTTP ${res.status}): ${msg}`);
        }
        const data = await res.json();
        if (data.estatus !== 'OK') throw new Error('CURP no encontrada en el RENAPO');
        // Convertir DD/MM/YYYY → YYYY-MM-DD
        const parts = (data.fechaNacimiento || '').split('/');
        const fechaIso = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';
        return {
            nombre:          (data.nombre          || '').trim(),
            apellidoPaterno: (data.apellidoPaterno  || '').trim(),
            apellidoMaterno: (data.apellidoMaterno  || '').trim(),
            fechaNacimiento: fechaIso,
        };
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
     * URL de captura completa (documento + selfie) sin UUID.
     */
    getCaptureUrl(): string {
        const sdk = getSdk();
        return sdk.getUrlToOnlyCaptureImages({ typeId: 'first' });
    },
};
