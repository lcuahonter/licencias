import React, { useState } from 'react';
import MD5 from 'crypto-js/md5'; 
import { jwtDecode } from "jwt-decode"; // <--- 1. IMPORTANTE: Para leer el token
import { UserData } from '../types';

// Definimos qué tiene el token por dentro
interface DecodedToken {
  username: string;
  rol: string;
  aData: number;       // <--- Este es tu ID de Usuario (el 7, 9, etc)
  perfil: string;      // <--- "Incompleto" o "Completo"
  iat: number;
  exp: number;
}

interface WelcomeScreenProps {
  // Actualizamos onStart para enviar datos, la siguiente pantalla y el ID real
  onStart: (data?: Partial<UserData>, nextScreen?: 'Dashboard' | 'Documents') => void;
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

      const payload = {
        username: email,
        password: md5Password 
      };

      console.log("Enviando credenciales (MD5)...", payload);

      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log("Respuesta Backend:", data);

      // --- VALIDACIÓN DE ERRORES ---
      
      // Caso A: Error específico de lógica (330)
      if (data.code === "330") {
         const mensajeDetalle = data.data?.status || data.message; 
         throw new Error(mensajeDetalle);
      }

      // Caso B: Cualquier otro error HTTP o del API
      if (data.code && data.code !== "200") {
         throw new Error(data.message || 'Error desconocido del servidor');
      }

      // --- LOGIN EXITOSO: PROCESAR TOKEN ---

      // 2. Buscamos el token en la respuesta
      const tokenString = data.token || data.data?.token; 

      if (!tokenString) {
          throw new Error("Login exitoso pero no se recibió token.");
      }

      // 3. Decodificamos el token para sacar el ID y el Perfil
      try {
          const decoded = jwtDecode<DecodedToken>(tokenString);
          console.log("🔓 Token decodificado:", decoded);

          // 4. Decidimos a dónde ir basado en el perfil del token
          const destino = decoded.perfil === "Incompleto" ? 'Documents' : 'Dashboard';
          
          console.log(`✅ Redirigiendo a: ${destino} (ID Usuario: ${decoded.aData})`);

          // 5. Enviamos todo al padre (App.tsx)
          onStart({ 
            email: email,
            idUsuario: decoded.aData, // <--- ¡AQUÍ VA EL ID REAL!
            // token: tokenString 
          }, destino);

      } catch (decodeError) {
          console.error("Error al leer el token", decodeError);
          throw new Error("Error al procesar la sesión del usuario.");
      }

    } catch (err: any) {
      console.error("❌ Error Login:", err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-dark relative">
      <div className="h-[35%] bg-primary relative overflow-hidden rounded-b-[3rem] shadow-xl">
        <div className="absolute inset-0 bg-[url('https://www.durango.gob.mx/wp-content/themes/durango/assets/img/logo-white.png')] bg-center bg-no-repeat bg-contain opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>
        <div className="absolute bottom-10 left-0 right-0 text-center text-white px-6">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-lg">
             <span className="material-symbols-outlined text-4xl">badge</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Licencia Digital</h1>
          <p className="text-sm font-medium text-blue-100 uppercase tracking-widest">Durango Seguro</p>
        </div>
      </div>

      <main className="flex-1 px-8 pt-8 pb-4 overflow-y-auto">
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
           {/* Si es registro nuevo, mandamos sin destino específico para que vaya al flujo normal de registro */}
           <button onClick={() => onStart()} className="w-full h-14 border-2 border-primary text-primary rounded-2xl font-black text-lg hover:bg-primary/5 active:scale-95 transition-all">Crear Cuenta Nueva</button>
        </div>
      </main>
    </div>
  );
};

export default WelcomeScreen;