import React, { useState } from 'react';
import { UserData } from '../types';

interface PaymentScreenProps {
  userData: UserData;
  onBack: () => void;
  onPaymentSuccess: (paymentInfo: any) => void;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ userData, onBack, onPaymentSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados para tarjeta (simulados)
  const [cardData, setCardData] = useState({ number: '', name: '', exp: '', cvv: '' });

  const amount = 912.00; // Costo fijo ejemplo

  // --- GENERAR FICHA DE PAGO (SOLUCIÓN COMPATIBLE VERCEL) ---
  const generatePaymentSlip = () => {
    // 1. Datos aleatorios para la ficha
    const today = new Date().toLocaleDateString('es-MX');
    const folio = `DGO-${Math.floor(Math.random() * 1000000)}`;
    const lineaCaptura = `0034 9823 1290 4821 0000 ${Math.floor(Math.random() * 99)}`;

    // 2. Construir el contenido HTML de la ficha
    const htmlContent = `
        <html>
            <head>
                <title>Ficha de Pago - Gobierno de Durango</title>
                <style>
                    body{font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 800px; margin: 0 auto; background-color: #fff;} 
                    .header{text-align:center; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px;} 
                    .logo{font-size: 20px; font-weight: bold; color: #1a237e;} 
                    .title{font-size: 16px; text-transform: uppercase; margin-top: 10px;} 
                    .box{border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 20px; background: #f9f9f9;} 
                    .row{display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;} 
                    .label{font-weight: bold; color: #555;} 
                    .total{font-size: 22px; font-weight: bold; color: #d32f2f; text-align: right; margin-top: 10px;} 
                    .barcode{text-align: center; margin-top: 30px; letter-spacing: 3px; font-family: monospace; font-size: 12px; word-break: break-all;} 
                    .instructions{font-size: 11px; color: #666; margin-top: 20px; line-height: 1.4;}
                    @media print { body { padding: 0; } button { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">GOBIERNO DEL ESTADO DE DURANGO</div>
                    <div class="title">Secretaría de Finanzas y Administración</div>
                </div>

                <div class="box">
                    <h3>REFERENCIA DE PAGO</h3>
                    <div class="row"><span class="label">Contribuyente:</span> <span>${userData.firstName} ${userData.lastName}</span></div>
                    <div class="row"><span class="label">RFC/CURP:</span> <span>${userData.idNumber}</span></div>
                    <div class="row"><span class="label">Concepto:</span> <span>LICENCIA DE CONDUCIR</span></div>
                    <div class="row"><span class="label">Fecha Emisión:</span> <span>${today}</span></div>
                    <div class="row"><span class="label">Vigencia:</span> <span>5 días naturales</span></div>
                </div>

                <div class="box" style="border: 2px solid #1a237e;">
                    <p style="text-align:center; font-size: 12px; margin-bottom: 5px;">LÍNEA DE CAPTURA</p>
                    <h2 style="text-align:center; letter-spacing: 1px; margin: 0; font-size: 18px;">${lineaCaptura}</h2>
                    <hr style="border:0; border-top:1px dashed #ccc; margin: 15px 0;">
                    <div class="total">TOTAL: $${amount.toFixed(2)} MXN</div>
                </div>

                <div class="barcode">
                    || ||| || ||||| ||| || |||| ||| || |||||<br/>
                    ${lineaCaptura}
                </div>

                <div class="instructions">
                    <strong>Instrucciones:</strong><br/>
                    1. Acuda a cualquier sucursal bancaria o tienda de conveniencia.<br/>
                    2. Presente esta ficha impres o digital.<br/>
                    3. El pago se reflejará en 24 a 48 horas hábiles.
                </div>
                
                <script>
                    // Intentar imprimir automáticamente al abrir
                    setTimeout(function() { window.print(); }, 500);
                </script>
            </body>
        </html>
    `;

    // 3. Crear un archivo virtual (Blob)
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // 4. Crear enlace invisible
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ficha_Pago_${folio}.html`; 
    document.body.appendChild(link);
    
    // 5. Forzar clic para descargar
    link.click();

    // 6. Limpieza con RETRASO (Crucial para que funcione la descarga)
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 2000); // Esperamos 2 segundos
    
    // 7. Simular éxito diferido para continuar el flujo en la app
    setTimeout(() => {
        onPaymentSuccess({ 
            method: 'ventanilla', 
            amount, 
            date: new Date().toISOString(), 
            reference: lineaCaptura,
            status: 'pending' // Estado pendiente
        });
    }, 1500);
  };

  const handleCardPayment = () => {
      setIsProcessing(true);
      setTimeout(() => {
          setIsProcessing(false);
          onPaymentSuccess({ 
              method: 'card', 
              amount, 
              date: new Date().toISOString(), 
              reference: `AUT-${Math.floor(Math.random() * 999999)}`,
              status: 'completed'
          });
      }, 2500);
  };

  // Renderizar contenido según la selección
  const renderContent = () => {
      // 1. PANTALLA INICIAL: SELECCIÓN
      if (!paymentMethod) {
          return (
              <div className="space-y-4 animate-in fade-in">
                  <button 
                    onClick={() => setPaymentMethod('card')}
                    className="w-full bg-white dark:bg-gray-800 p-6 rounded-3xl border-2 border-gray-100 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all group text-left shadow-sm hover:shadow-md"
                  >
                      <div className="flex justify-between items-center mb-2">
                          <span className="material-symbols-outlined text-3xl text-primary bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl">credit_card</span>
                          <span className="material-symbols-outlined text-gray-300 group-hover:text-primary">chevron_right</span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Pago con Tarjeta</h3>
                      <p className="text-sm text-gray-500">Crédito o Débito (Visa, Mastercard)</p>
                  </button>

                  <button 
                    onClick={() => setPaymentMethod('bank')}
                    className="w-full bg-white dark:bg-gray-800 p-6 rounded-3xl border-2 border-gray-100 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all group text-left shadow-sm hover:shadow-md"
                  >
                      <div className="flex justify-between items-center mb-2">
                          <span className="material-symbols-outlined text-3xl text-primary bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl">store</span>
                          <span className="material-symbols-outlined text-gray-300 group-hover:text-primary">chevron_right</span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white">Pago en Ventanilla</h3>
                      <p className="text-sm text-gray-500">Bancos, OXXO y Kioscos Multipago</p>
                  </button>
              </div>
          );
      }

      // 2. PAGO CON TARJETA
      if (paymentMethod === 'card') {
          return (
              <div className="space-y-6 animate-in slide-in-from-right">
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                      <div className="relative z-10">
                          <div className="flex justify-between mb-8">
                              <span className="material-symbols-outlined">contactless</span>
                              <span className="font-bold italic text-lg">VISA</span>
                          </div>
                          <p className="font-mono text-xl tracking-widest mb-4">{cardData.number || '•••• •••• •••• ••••'}</p>
                          <div className="flex justify-between text-xs opacity-80 uppercase tracking-wider">
                              <span>Titular</span>
                              <span>Expira</span>
                          </div>
                          <div className="flex justify-between font-bold tracking-wide">
                              <span>{cardData.name || 'NOMBRE APELLIDO'}</span>
                              <span>{cardData.exp || 'MM/AA'}</span>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-gray-400 ml-1">Número de Tarjeta</label>
                          <input 
                            maxLength={19}
                            value={cardData.number}
                            onChange={(e) => {
                                // Formato simple de tarjeta con espacios
                                let val = e.target.value.replace(/\D/g, '').substring(0,16);
                                val = val.match(/.{1,4}/g)?.join(' ') || val;
                                setCardData({...cardData, number: val});
                            }}
                            placeholder="0000 0000 0000 0000"
                            className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 outline-none focus:border-primary font-mono transition-all"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-gray-400 ml-1">Nombre del Titular</label>
                          <input 
                            value={cardData.name}
                            onChange={(e) => setCardData({...cardData, name: e.target.value.toUpperCase()})}
                            placeholder="COMO APARECE EN LA TARJETA"
                            className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 outline-none focus:border-primary transition-all uppercase"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-gray-400 ml-1">Expiración</label>
                              <input 
                                maxLength={5}
                                value={cardData.exp}
                                onChange={(e) => setCardData({...cardData, exp: e.target.value})}
                                placeholder="MM/AA"
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 outline-none focus:border-primary text-center font-mono transition-all"
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-gray-400 ml-1">CVV</label>
                              <input 
                                type="password"
                                maxLength={3}
                                value={cardData.cvv}
                                onChange={(e) => setCardData({...cardData, cvv: e.target.value.replace(/\D/g,'')})}
                                placeholder="123"
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 outline-none focus:border-primary text-center font-mono transition-all"
                              />
                          </div>
                      </div>
                  </div>

                  <button 
                    onClick={handleCardPayment}
                    disabled={isProcessing || !cardData.number || !cardData.cvv}
                    className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Procesando...' : `Pagar $${amount.toFixed(2)}`}
                    {!isProcessing && <span className="material-symbols-outlined">lock</span>}
                  </button>
              </div>
          );
      }

      // 3. PAGO VENTANILLA
      if (paymentMethod === 'bank') {
          return (
              <div className="space-y-6 animate-in slide-in-from-right text-center">
                  <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto text-primary mb-4">
                      <span className="material-symbols-outlined text-5xl">print</span>
                  </div>
                  
                  <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Pago Referenciado</h3>
                      <p className="text-gray-500 text-sm leading-relaxed px-4">
                          Genera tu ficha de pago para acudir a sucursales bancarias o tiendas de conveniencia. El pago se reflejará en 24-48 horas.
                      </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total a Pagar</p>
                      <p className="text-3xl font-black text-gray-900 dark:text-white">$ {amount.toFixed(2)}</p>
                  </div>

                  <button 
                    onClick={generatePaymentSlip}
                    className="w-full h-14 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">download</span>
                    Descargar Ficha de Pago
                  </button>
              </div>
          );
      }
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark">
      {/* HEADER CON BACK */}
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
             <button onClick={paymentMethod ? () => setPaymentMethod(null) : onBack} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
             </button>
             <div>
                 <h1 className="text-xl font-black text-gray-900 dark:text-white">Confirmar Pago</h1>
                 <p className="text-xs text-gray-500">Licencia {userData.licenseType}</p>
             </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-24">
          {renderContent()}
      </main>
    </div>
  );
};

export default PaymentScreen;