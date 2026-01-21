import React, { useState } from 'react';
import MD5 from 'crypto-js/md5';
import { jwtDecode } from "jwt-decode";
import { UserData } from '../types';
import { authService } from '../src/api/authService'; // <--- Importamos el servicio
import { userService } from '../src/api/userService';
import { documentService } from '../src/api/documentService';

// Definimos la estructura del token JWT
interface DecodedToken {
  username: string;
  rol: number;           // Ahora rol es un ID (número)
  aData: number;         // ID de Usuario
  perfil: string;        // "Incompleto" o "Completo"
  iat: number;
  exp: number;
}

interface WelcomeScreenProps {
  onStart: (data?: Partial<UserData>, nextScreen?: 'Dashboard' | 'DocumentUploadScreen' | 'OperatorDashboard') => void;
}


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Encriptar password a MD5
      const md5Password = MD5(password).toString();

      // 2. Usar el servicio de autenticación
      // El apiClient se encarga de lanzar excepciones si hay error (codes != 200)
      const data = await authService.login({
        username: email,
        password: md5Password
      });

      // 3. Procesar Token
      const tokenString = data.token || data.data?.token;

      if (!tokenString) {
        throw new Error("Login exitoso pero no se recibió token de sesión.");
      }

      // 4. Decodificar Token para obtener ID y Perfil
      try {
        const decoded = jwtDecode<DecodedToken>(tokenString);

        // Validar datos críticos del token
        if (!decoded.aData || !decoded.rol) {
          throw new Error("Token inválido: faltan datos de usuario o rol.");
        }

        // Validar que el ID de usuario sea un número positivo
        const idUsuario = Number(decoded.aData);
        if (isNaN(idUsuario) || idUsuario <= 0) {
          throw new Error("Token inválido: ID de usuario no válido.");
        }

        const rolId = Number(decoded.rol);

        // Datos base sanitizados (solo lo necesario para la sesión)
        const basePayload = {
          email: email.toLowerCase().trim(),
          idUsuario: idUsuario,
          token: tokenString
        };

        // === ROL 1: ADMINISTRADOR ===
        if (rolId === 1) {
          onStart(basePayload, 'AdminDashboard');
          return;
        }

        // === ROL 3: OPERADOR ===
        if (rolId === 3) {
          onStart(basePayload, 'OperatorDashboard');
          return;
        }

        // === ROL 2: USUARIO NORMAL ===
        if (rolId === 2) {

          // Obtener datos del usuario de forma segura
          let userFresh: any = null;
          try {
            const u = await userService.getUsuarioById(idUsuario, tokenString);
            userFresh = u?.data?.usuario ?? u?.data ?? null;
          } catch (e) {
            // Error al obtener perfil - continuar con datos básicos
          }

          // Construir payload con datos sanitizados
          const userPayload = {
            ...basePayload,
            perfil: userFresh?.perfil || 'Incompleto',
            firstName: userFresh?.nombres?.trim() || undefined,
            lastName: userFresh?.apellidopaterno
              ? `${userFresh.apellidopaterno} ${userFresh.apellidomaterno || ''}`.trim()
              : undefined,
            idNumber: userFresh?.curp?.trim() || undefined,
            phone: userFresh?.telefono?.trim() || undefined
          };

          onStart(userPayload, 'Dashboard');
          return;
        }

        // === ROL NO RECONOCIDO ===
        console.error('[SECURITY] Rol no reconocido:', rolId);
        throw new Error("Acceso denegado: rol de usuario no válido.");

      } catch (decodeError) {
        console.error("[SECURITY] Error al procesar token:", decodeError);
        throw new Error("Error al procesar la sesión del usuario.");
      }

    } catch (err: any) {
      console.error("Error Login:", err);
      // El mensaje de error ya viene procesado por el apiClient
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-dark relative">
      {/* Encabezado con Logo del Gobierno de Durango */}
      <div className="bg-white px-6 py-4 shadow-md flex items-center gap-4 border-b border-gray-200">
        <img
          src="/logo-durango.png"
          alt="Logo Gobierno de Durango"
          className="h-16 w-auto object-contain flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="flex-1 text-right">
          <p className="text-xl font-black text-gray-800">Licencias Durango</p>
        </div>
      </div>

      <div className="h-[25%] bg-primary relative overflow-hidden rounded-b-[3rem] shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>
        <div className="absolute bottom-8 left-0 right-0 text-center text-white px-6">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-lg">
            <span className="material-symbols-outlined text-4xl">badge</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1">Licencia Digital</h1>
          <p className="text-xs font-medium text-blue-100 uppercase tracking-widest">Durango Seguro</p>
        </div>
      </div>

      <main className="flex-1 px-8 pt-24 pb-4 overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bienvenido</h2>
            <p className="text-sm text-gray-500">Inicia sesión para gestionar tus trámites.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Correo Electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary outline-none transition-all text-sm font-medium"
                  required
                />
                <span className="material-symbols-outlined absolute left-4 top-4 text-gray-400">mail</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 pl-12 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary outline-none transition-all text-sm font-medium"
                  required
                />
                <span className="material-symbols-outlined absolute left-4 top-4 text-gray-400">lock</span>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            {error && (
              <div className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-1">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}
            <button type="submit" disabled={isLoading} className={`w-full h-14 bg-primary text-white rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}>
              {isLoading ? 'Entrando...' : 'Iniciar Sesión'}
              {!isLoading && <span className="material-symbols-outlined">login</span>}
            </button>
          </form>

          <div className="mt-4 text-center pb-8">
            <p className="text-sm text-gray-500 mb-4">¿Es tu primera vez?</p>
            <button onClick={() => onStart()} className="w-full h-14 border-2 border-primary text-primary rounded-2xl font-black text-lg hover:bg-primary/5 active:scale-95 transition-all">Crear Cuenta Nueva</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WelcomeScreen;