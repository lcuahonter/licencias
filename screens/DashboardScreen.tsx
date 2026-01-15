import React, { useState, useRef, useEffect } from 'react';
import { UserData, LicenseRequest, LicenseType, ProcessType } from '../types';
import DocumentUploadScreen from './DocumentUploadScreen';

interface DashboardScreenProps {
  userData: UserData;
  onLogout: () => void;
  onGoToProfile: () => void;
  onContinueRequest: (req: LicenseRequest) => void;
  onGoToDocuments?: () => void;
  idUsuario?: number;
  token?: string;
}

const DOC_LABELS: Record<string, string> = {
  ineFront: 'INE (Frente)',
  ineBack: 'INE (Reverso)',
  addressProof: 'Comprobante de Domicilio',
  photo: 'Fotografía Biométrica',
  // Mapeos adicionales para mensajes de error
  passport: 'Pasaporte',
  cedulaFront: 'Cédula (Frente)',
  cedulaBack: 'Cédula (Reverso)',
  birthCertificate: 'Acta de Nacimiento',
  disabilityProof: 'Certificado de Discapacidad'
};

import { solicitudService } from '../src/api/solicitudService';
import { documentService } from '../src/api/documentService';
import { userService } from '../src/api/userService';

const DashboardScreen: React.FC<DashboardScreenProps> = ({ 
  userData, 
  onLogout, 
  onGoToProfile, 
  onContinueRequest, 
  onGoToDocuments, 
  idUsuario, 
  token 
}) => {
  
  // --- ESTADOS ---
  const [showNewReqModal, setShowNewReqModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  
  const [paymentStep, setPaymentStep] = useState<'select' | 'card' | 'cash'>('select');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'ventanilla' | null>(null);
  const [cardData, setCardData] = useState({ number: '', name: '', exp: '', cvv: '' });
  const [cardErrors, setCardErrors] = useState<{name?: string, exp?: string}>({});
  
  const [fixingRequest, setFixingRequest] = useState<LicenseRequest | null>(null);
  const [fixedDocs, setFixedDocs] = useState<Record<string, boolean>>({});
  const [activeDocKey, setActiveDocKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState<LicenseType>('Automovilista');
  const [selectedProcess, setSelectedProcess] = useState<ProcessType>('Primera Vez');
  
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // --- HELPERS ---
  
  // Helper para esperar (evitar Race Condition del 204)
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getCost = (type: LicenseType) => {
      switch (type) {
          case 'Motociclista': return 608.00;
          case 'Transporte Público': return 1450.00;
          default: return 912.00; // Automovilista
      }
  };

  // --- DATOS DEL USUARIO (PERFIL) ---
  const [userDataFresh, setUserDataFresh] = useState<any>(userData);
  const isProfileIncomplete = userDataFresh?.perfil === 'Incompleto';
  
  useEffect(() => {
    if (!idUsuario || !token) return;
    let mounted = true;
    
    userService.getUsuarioById(idUsuario, token)
      .then(resp => {
        const userFresh = {
          ...resp?.data?.usuario,
          perfil: resp?.data?.perfil
        };
        if (mounted && userFresh) {
          setUserDataFresh(userFresh);
        }
      })
      .catch(err => console.warn('Error consultando usuario en Dashboard:', err));
    
    return () => { mounted = false; };
  }, [idUsuario, token]);

  // --- CARGAR SOLICITUDES AL INICIAR ---
  useEffect(() => {
    if (!idUsuario || !token) return;
    let mounted = true;

    const loadSolicitudes = async () => {
      try {
        const resp = await solicitudService.getByUser(idUsuario, token);
        const solicitudes = resp?.data?.solicitudesData || resp?.data?.solicitudes || [];
        
        if (mounted && solicitudes.length > 0 && (window as any).tempAddRequest) {
          solicitudes.forEach((sol: any) => {
            const request: LicenseRequest = {
              id: String(sol.id),
              type: sol.descripcion?.includes('Automovilista') ? 'Automovilista' : 
                    sol.descripcion?.includes('Motociclista') ? 'Motociclista' : 'Automovilista',
              process: 'Primera Vez',
              cost: getCost(sol.descripcion?.includes('Motociclista') ? 'Motociclista' : 'Automovilista'),
              date: new Date(sol.creacion).toLocaleDateString('es-MX'),
              status: sol.numerolicencia ? 'completed' : 'paid_pending_docs',
              folio: sol.folio || `DGO-${sol.id}`,
              rejectedDocuments: [],
              rawData: sol
            };
            (window as any).tempAddRequest(request);
          });
        }
      } catch (error) {
        console.warn('Error cargando solicitudes:', error);
      }
    };

    loadSolicitudes();
    return () => { mounted = false; };
  }, [idUsuario, token]);
  
  // --- LICENCIAS Y TRÁMITES ---
  const activeLicenses = userData.requests?.filter(r => r.status === 'completed') || [];
  const activeProcessList = userData.requests?.filter(r => 
      r.status !== 'completed' && r.status !== 'replaced' && r.status !== 'archived'
  ) || [];

  const hasLicenseForType = (type: LicenseType) => {
      return activeLicenses.some(r => r.type === type);
  };

  // --- VALIDACIÓN TARJETA ---
  const detectCardType = (number: string): 'visa' | 'mastercard' | 'unknown' => {
      const clean = number.replace(/\D/g, '');
      if (clean.match(/^4/)) return 'visa';
      if (clean.match(/^5[1-5]/) || clean.match(/^2[2-7]/)) return 'mastercard'; 
      return 'unknown';
  };
  const cardType = detectCardType(cardData.number);

  const handleCardNameChange = (val: string) => {
      if (/^[A-Z\s]*$/.test(val.toUpperCase())) setCardData(prev => ({...prev, name: val.toUpperCase()}));
  };
  
  const handleCardExpChange = (val: string) => {
      let clean = val.replace(/\D/g, '');
      if (clean.length > 4) return;
      let formatted = clean;
      if (clean.length >= 2) formatted = clean.substring(0, 2) + '/' + clean.substring(2);
      setCardData(prev => ({...prev, exp: formatted}));
      
      if (clean.length === 4) {
          const mm = parseInt(clean.substring(0, 2));
          const yy = parseInt(clean.substring(2, 4));
          const now = new Date();
          const curMonth = now.getMonth() + 1;
          const curYear = parseInt(now.getFullYear().toString().slice(-2));
          if (mm < 1 || mm > 12) setCardErrors(p => ({...p, exp: 'Mes inválido'}));
          else if (yy < curYear || (yy === curYear && mm < curMonth)) setCardErrors(p => ({...p, exp: 'Vencida'}));
          else setCardErrors(p => ({...p, exp: ''}));
      } else setCardErrors(p => ({...p, exp: ''}));
  };

  // --- HANDLERS DE MODALES ---
  const handleOpenNewReq = () => {
    if (isProfileIncomplete) {
      onGoToProfile();
      return;
    }
    const defaultType = 'Automovilista';
    setSelectedType(defaultType);
    if (hasLicenseForType(defaultType)) setSelectedProcess('Renovación');
    else setSelectedProcess('Primera Vez');
    setShowNewReqModal(true);
  };

  const handleTypeSelect = (type: LicenseType) => {
      setSelectedType(type);
      if (hasLicenseForType(type)) setSelectedProcess('Renovación');
      else setSelectedProcess('Primera Vez');
  };

  const handleProceedToPay = () => {
    if (activeProcessList.some(r => r.type === selectedType)) { 
        alert(`Ya tienes un trámite de ${selectedType} en curso.`); 
        return; 
    }
    setShowNewReqModal(false);
    setPaymentStep('select');
    setCardData({ number: '', name: '', exp: '', cvv: '' });
    setCardErrors({});
    setSelectedPaymentMethod(null);
    setShowPaymentModal(true);
  };

  // Nueva función: Proceder a subir documentos después de seleccionar método de pago
  const handleProceedToDocuments = (method: 'card' | 'ventanilla') => {
      // Validaciones previas si es tarjeta
      if (method === 'card') {
          if (detectCardType(cardData.number) === 'unknown') { 
              alert("Tarjeta no válida."); 
              return; 
          }
          if (cardErrors.exp || cardData.exp.length < 5) { 
              alert("Fecha incorrecta."); 
              return; 
          }
      }

      // Guardamos el método de pago seleccionado
      setSelectedPaymentMethod(method);
      
      // Cerramos el modal de pago y abrimos el de documentos
      setShowPaymentModal(false);
      setShowDocumentsModal(true);
  };

  // =========================================================================
  // LOGICA PRINCIPAL: CREAR SOLICITUD + POLLING + SUBIR DOCUMENTOS
  // Ahora recibe los documentos como parámetro desde el modal
  // =========================================================================
  const finalizeRequest = async (documentsData: any) => {
      if (!selectedPaymentMethod) {
          alert('No se seleccionó método de pago.');
          return;
      }

      const method = selectedPaymentMethod;

      if (!idUsuario) { alert('Usuario no identificado.'); return; }

      const idtipolicencia = selectedType === 'Motociclista' ? 2 : 1;
      const idmetodopago = method === 'card' ? 1 : 2;

      const payload = {
        idusuario: idUsuario,
        idtipolicencia,
        idmetodopago
      };

      try {
        setIsSubmittingRequest(true);

        // -------------------------------------------------------------------
        // PASO 1: CREAR LA SOLICITUD
        // -------------------------------------------------------------------
        await solicitudService.createSolicitud(payload, token);

        // -------------------------------------------------------------------
        // PASO 2: RECUPERAR ID CON POLLING (EVITAR ERROR 204)
        // -------------------------------------------------------------------
        let idSolicitudReal: number | null = null;
        let solicitudDataCompleta = null;
        
        let intentos = 0;
        const maxIntentos = 3;
        const delayMs = 1500;

        while (intentos < maxIntentos && !idSolicitudReal) {
            intentos++;
            
            await wait(delayMs);

            try {
                const solicResp = await solicitudService.getByUser(idUsuario, token);
                
                const listaRaw = solicResp?.data?.solicitudesData || solicResp?.data?.solicitudes;
                
                if (Array.isArray(listaRaw) && listaRaw.length > 0) {
                    const sortedList = listaRaw.sort((a: any, b: any) => b.id - a.id);
                    const ultimaSolicitud = sortedList[0];
                    
                    idSolicitudReal = ultimaSolicitud.id;
                    solicitudDataCompleta = ultimaSolicitud;
                } else {
                    console.warn(`> Intento ${intentos}: Respuesta vacía o 204.`);
                }
            } catch (fetchErr) {
                console.warn(`> Intento ${intentos} fallido por red:`, fetchErr);
            }
        }

        if (!idSolicitudReal) {
            alert("La solicitud se creó, pero el sistema está tardando en procesarla. Verifica tu historial en unos minutos.");
            setIsSubmittingRequest(false);
            setShowDocumentsModal(false);
            return;
        }

        // -------------------------------------------------------------------
        // PASO 3: ACTUALIZAR UI MOCK
        // -------------------------------------------------------------------
        const newRequest: LicenseRequest = {
            id: String(idSolicitudReal),
            type: selectedType,
            process: selectedProcess,
            cost: getCost(selectedType),
            date: new Date().toLocaleDateString('es-MX'),
            status: method === 'card' ? 'paid_pending_docs' : 'pending_payment',
            folio: solicitudDataCompleta?.folio || 'PROCESANDO',
            rejectedDocuments: [],
            rawData: solicitudDataCompleta
        };
        (window as any).tempAddRequest(newRequest);

        // -------------------------------------------------------------------
        // PASO 4: SUBIR DOCUMENTOS
        // -------------------------------------------------------------------
        const userDocs = documentsData?.documents || [];
        
        let docsOk = 0;

        for (const doc of userDocs) {
            if (!doc.archivoBase64) continue;

            const payloadDoc = {
                idusuario: idUsuario,
                idsolicitud: idSolicitudReal,
                idtipodocumento: doc.idtipodocumento,
                formato: doc.formato || 'jpg',
                nombreoriginal: doc.nombreoriginal || `doc_${doc.idtipodocumento}`,
                tamanio: doc.tamanio || 0,
                archivoBase64: doc.archivoBase64
            };

            try {
                await documentService.createDocumento(payloadDoc, token);
                docsOk++;
            } catch (derr: any) {
                console.error(`Error subiendo doc ${doc.idtipodocumento}`, derr);
                if (derr.isAuthError) {
                    alert('Sesión expirada durante la carga de documentos.');
                    onLogout();
                    return;
                }
            }
        }
        
        if (docsOk > 0) {
            alert(`Solicitud creada exitosamente. Se subieron ${docsOk} documentos.`);
        } else {
            alert("Solicitud creada. Hubo un problema subiendo los documentos, por favor intenta cargarlos nuevamente desde el detalle.");
        }

        // Cerrar modal y limpiar estados
        setShowDocumentsModal(false);
        setSelectedPaymentMethod(null);

      } catch (err: any) {
        console.error('Error Crítico al Finalizar:', err);
        if (err.isAuthError) {
          alert('Sesión expirada. Por favor inicia sesión de nuevo.');
          onLogout();
        } else {
          alert('Error al procesar la solicitud. Inténtalo de nuevo.');
        }
      } finally {
        setIsSubmittingRequest(false);
      }
  };

  // --- DEMO HELPERS (Mocks para UI) ---
  
  const handleOpenFixModal = (req: LicenseRequest) => { setFixingRequest(req); setFixedDocs({}); };
  
  const triggerFileUpload = (docKey: string) => { setActiveDocKey(docKey); setTimeout(() => fileInputRef.current?.click(), 50); };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0] && activeDocKey) { setFixedDocs(p => ({...p, [activeDocKey]: true})); e.target.value = ''; }};
  
  const handleSubmitCorrections = () => { if (!fixingRequest) return; setTimeout(() => { (window as any).tempUpdateRequestData(fixingRequest.id, { status: 'paid_pending_docs', rejectedDocuments: [] }); setFixingRequest(null); alert("Enviado a revisión."); }, 1000); };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-background-dark relative">
      <header className="px-6 pt-10 pb-6 flex items-center justify-between bg-white dark:bg-surface-dark shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
                {userData.photo ? <img src={userData.photo} className="w-full h-full object-cover" alt="User" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><span className="material-symbols-outlined">person</span></div>}
            </div>
            <div><h1 className="text-lg font-black text-gray-900 dark:text-white">Mis Licencias</h1><p className="text-xs text-gray-500">Licencias Digitales Durango</p></div>
        </div>
        <button onClick={onLogout} className="text-gray-400 hover:text-red-500 bg-gray-100 p-2 rounded-full"><span className="material-symbols-outlined">logout</span></button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {isProfileIncomplete && (
             <div onClick={onGoToProfile} className="bg-red-600 text-white p-4 rounded-2xl shadow-lg flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform animate-pulse">
                <div className="bg-white/20 p-2 rounded-full"><span className="material-symbols-outlined">person_alert</span></div>
                <div><h3 className="font-bold text-sm">Perfil Incompleto</h3><p className="text-[10px] opacity-90">Toca aquí para completar tus datos.</p></div>
             </div>
        )}

        <section>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-sm">badge</span> Licencias Vigentes</h3>
            {activeLicenses.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl text-center"><p className="text-xs text-gray-400 font-medium">No tienes licencias activas.</p></div>
            ) : (
                <div className="space-y-4">
                    {activeLicenses.map((lic) => (
                        <div key={lic.id} className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 text-white opacity-10"><span className="material-symbols-outlined text-9xl">verified</span></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg"><p className="text-[10px] font-bold uppercase tracking-widest">Licencia Digital</p></div>
                                    <span className="material-symbols-outlined">qr_code_2</span>
                                </div>
                                <div className="mt-4"><h3 className="text-2xl font-black tracking-tight">{lic.type.toUpperCase()}</h3><p className="text-xs opacity-80 font-mono mt-1">FOLIO: {lic.folio}</p></div>
                                <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-end"><div><p className="text-[8px] uppercase opacity-70">Vigencia</p><p className="text-sm font-bold">2025 - 2028</p></div></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>

        <section>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-sm">folder_open</span> Solicitudes en Proceso</h3>
            {activeProcessList.length === 0 ? (
                 <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl text-center"><p className="text-xs text-gray-400 font-medium">No hay trámites pendientes.</p></div>
            ) : (
                <div className="space-y-3">
                    {activeProcessList.map((req) => {
                      const rawData = req.rawData;
                      const fecha = rawData?.creacion ? new Date(rawData.creacion).toLocaleDateString('es-MX') : req.date;
                      const descripcion = rawData?.descripcion || `Licencia ${req.type}`;
                      const estatus = rawData?.estatus || 'En revisión';
                      const statusDisplay = req.status === 'rejected' ? 'RECHAZADO' : req.status === 'pending_payment' ? 'PENDIENTE PAGO' : (estatus || 'EN REVISIÓN');
                      
                      return (
                        <div key={req.id} className={`p-5 rounded-2xl border-l-4 shadow-sm bg-white dark:bg-surface-dark relative overflow-hidden ${req.status === 'rejected' ? 'border-red-500' : 'border-yellow-400'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{statusDisplay}</span><span className="text-[10px] text-gray-400 font-mono">{req.folio}</span></div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{descripcion}</h3>
                                    <p className="text-xs text-gray-500 mt-1">Creado: {fecha}</p>
                                    {rawData?.idestatus && <p className="text-xs text-gray-400">Estado ID: {rawData.idestatus}</p>}
                                </div>
                                <div className={`p-2 rounded-full ${req.status === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-600'}`}><span className="material-symbols-outlined">{req.status === 'rejected' ? 'block' : 'hourglass_top'}</span></div>
                            </div>
                            {req.status === 'rejected' && req.rejectedDocuments && (<div className="mt-3 bg-red-50 p-3 rounded-xl text-xs text-red-800 border border-red-100"><div className="font-bold flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-sm">error</span> Acción Requerida:</div><ul className="list-disc list-inside font-bold">{req.rejectedDocuments.map(doc => <li key={doc}>{DOC_LABELS[doc] || doc}</li>)}</ul></div>)}
                            {req.status === 'rejected' && (
                              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                                  <button onClick={() => handleOpenFixModal(req)} className="w-full bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2"><span className="material-symbols-outlined text-sm">upload_file</span> Corregir Documentos</button>
                              </div>
                            )}
                        </div>
                      );
                    })}
                </div>
            )}
        </section>
      </main>

      <button onClick={handleOpenNewReq} className="absolute bottom-6 right-6 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-20"><span className="material-symbols-outlined text-3xl">add</span></button>

      {/* MODAL 1: SELECCIÓN */}
      {showNewReqModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-10 space-y-5">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3"><h2 className="text-lg font-black">Nueva Solicitud</h2><button onClick={() => setShowNewReqModal(false)} className="bg-gray-100 p-1 rounded-full"><span className="material-symbols-outlined text-sm">close</span></button></div>
                
                <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handleTypeSelect('Automovilista')} className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all h-20 ${selectedType === 'Automovilista' ? 'border-primary bg-blue-50 text-primary' : 'border-gray-100 text-gray-400'}`}>
                            <span className="material-symbols-outlined text-2xl">directions_car</span>
                            <span className="text-[10px] font-bold">Auto</span>
                        </button>
                        <button onClick={() => handleTypeSelect('Motociclista')} className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all h-20 ${selectedType === 'Motociclista' ? 'border-primary bg-blue-50 text-primary' : 'border-gray-100 text-gray-400'}`}>
                            <span className="material-symbols-outlined text-2xl">two_wheeler</span>
                            <span className="text-[10px] font-bold">Moto</span>
                        </button>
                        <button onClick={() => handleTypeSelect('Transporte Público')} className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all h-20 ${selectedType === 'Transporte Público' ? 'border-primary bg-blue-50 text-primary' : 'border-gray-100 text-gray-400'}`}>
                            <span className="material-symbols-outlined text-2xl">directions_bus</span>
                            <span className="text-[10px] font-bold text-center leading-tight">Transporte<br/>Público</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-400">Trámite</label>
                    <select 
                        value={selectedProcess} 
                        onChange={(e) => setSelectedProcess(e.target.value as ProcessType)} 
                        className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm outline-none appearance-none"
                    >
                        {hasLicenseForType(selectedType) ? (
                            <>
                                <option value="Renovación">Renovación</option>
                                <option value="Reposición">Reposición</option>
                            </>
                        ) : (
                            <option value="Primera Vez">Primera Vez</option>
                        )}
                    </select>
                    <p className="text-[10px] text-gray-400 text-right">
                        {hasLicenseForType(selectedType) 
                            ? "Ya cuentas con esta licencia (Renovación disponible)." 
                            : "Trámite de primera vez."}
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Total:</span><span className="text-xl font-black text-gray-900 dark:text-white">${getCost(selectedType)}.00</span></div>
                <button onClick={handleProceedToPay} className="w-full h-12 bg-primary text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">Pagar Derechos <span className="material-symbols-outlined text-sm">payments</span></button>
            </div>
        </div>
      )}

      {/* MODAL 2: PAGO */}
      {showPaymentModal && (
        <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
             <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[85vh] flex flex-col">
                <div className="bg-gray-900 text-white p-6 text-center relative shrink-0">
                    <button onClick={() => paymentStep === 'select' ? setShowPaymentModal(false) : setPaymentStep('select')} className="absolute left-4 top-4 text-white/50 hover:text-white"><span className="material-symbols-outlined">arrow_back</span></button>
                    <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Tesorería Virtual</p>
                    <h2 className="text-xl font-black">Pago de Derechos</h2>
                    <p className="text-3xl font-bold mt-2">${getCost(selectedType)}.00 <span className="text-xs font-normal opacity-70">MXN</span></p>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {paymentStep === 'select' && (
                        <div className="space-y-4 animate-in fade-in">
                            <button onClick={() => setPaymentStep('card')} className="w-full bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-primary transition-all group text-left shadow-sm flex items-center gap-4"><div className="bg-blue-50 p-3 rounded-xl text-primary"><span className="material-symbols-outlined text-2xl">credit_card</span></div><div className="flex-1"><h3 className="font-bold text-gray-900 dark:text-white">Tarjeta de Crédito / Débito</h3><div className="flex gap-2 mt-1 opacity-60"><span className="text-[10px] border px-1 rounded">VISA</span><span className="text-[10px] border px-1 rounded">MC</span></div></div><span className="material-symbols-outlined text-gray-300">chevron_right</span></button>
                            <button onClick={() => setPaymentStep('cash')} className="w-full bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-green-500 transition-all group text-left shadow-sm flex items-center gap-4"><div className="bg-green-50 p-3 rounded-xl text-green-600"><span className="material-symbols-outlined text-2xl">storefront</span></div><div className="flex-1"><h3 className="font-bold text-gray-900 dark:text-white">Pago en Ventanilla</h3><p className="text-xs text-gray-500">Bancos, OXXO y Kioscos</p></div><span className="material-symbols-outlined text-gray-300">chevron_right</span></button>
                        </div>
                    )}
                    {paymentStep === 'card' && (
                        <div className="space-y-5 animate-in slide-in-from-right">
                             {/* VISUALIZACIÓN TARJETA */}
                            <div className={`rounded-xl p-5 text-white shadow-lg relative overflow-hidden transition-all duration-500 
                                ${cardType === 'visa' ? 'bg-gradient-to-br from-blue-800 to-blue-950' : 
                                  cardType === 'mastercard' ? 'bg-gradient-to-br from-red-700 to-orange-800' : 
                                  'bg-gradient-to-br from-gray-800 to-gray-900'}`}
                            >
                                <div className="flex justify-between mb-6">
                                    <span className="material-symbols-outlined">contactless</span>
                                    <span className="font-bold italic text-xl">
                                        {cardType === 'visa' ? 'VISA' : cardType === 'mastercard' ? 'MasterCard' : ''}
                                    </span>
                                </div>
                                <p className="font-mono text-lg tracking-widest mb-3">{cardData.number || '•••• •••• •••• ••••'}</p>
                                <div className="flex justify-between text-[10px] opacity-70 uppercase tracking-wider"><span>Titular</span><span>Expira</span></div>
                                <div className="flex justify-between font-bold text-sm tracking-wide"><span>{cardData.name || 'NOMBRE'}</span><span>{cardData.exp || 'MM/AA'}</span></div>
                            </div>
                            
                            {/* FORMULARIO */}
                            <div className="space-y-3">
                                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Número de Tarjeta</label><input maxLength={19} value={cardData.number} onChange={(e) => { let val = e.target.value.replace(/\D/g, '').substring(0,16); val = val.match(/.{1,4}/g)?.join(' ') || val; setCardData({...cardData, number: val}); }} placeholder="0000 0000 0000 0000" className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 outline-none focus:border-primary font-mono text-sm" /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Titular (Sin Ñ)</label><input value={cardData.name} onChange={(e) => handleCardNameChange(e.target.value)} placeholder="COMO APARECE EN LA TARJETA" className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 outline-none focus:border-primary uppercase text-sm" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Expiración</label><input maxLength={5} value={cardData.exp} onChange={(e) => handleCardExpChange(e.target.value)} placeholder="MM/AA" className={`w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border outline-none focus:border-primary text-center font-mono text-sm ${cardErrors.exp ? 'border-red-500' : 'border-gray-200'}`} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-400 ml-1">CVV</label><input type="password" maxLength={3} value={cardData.cvv} onChange={(e) => setCardData({...cardData, cvv: e.target.value.replace(/\D/g,'')})} placeholder="123" className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 outline-none focus:border-primary text-center font-mono text-sm" /></div>
                                </div>
                            </div>
                            <button onClick={() => handleProceedToDocuments('card')} disabled={!cardData.number || !cardData.cvv || !!cardErrors.exp || isSubmittingRequest} className="w-full h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSubmittingRequest ? 'Procesando...' : 'Continuar a Documentos'} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    )}
                    {paymentStep === 'cash' && (
                        <div className="space-y-6 animate-in slide-in-from-right text-center">
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto text-primary mb-2"><span className="material-symbols-outlined text-4xl">print</span></div>
                            <div><h3 className="text-lg font-black text-gray-900 dark:text-white">Ficha de Pago</h3><p className="text-gray-500 text-xs leading-relaxed px-4">Descarga e imprime tu ficha para pagar en cualquier banco o tienda de conveniencia.</p></div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Referencia Única</p><p className="text-xl font-mono font-bold text-gray-900 dark:text-white tracking-widest">DGO-{Math.floor(Math.random() * 10000)}</p></div>
                            <button onClick={() => handleProceedToDocuments('ventanilla')} disabled={isSubmittingRequest} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">Continuar a Documentos <span className="material-symbols-outlined">arrow_forward</span></button>
                        </div>
                    )}
                </div>
             </div>
        </div>
      )}

      {/* MODAL CORRECCIÓN DOCUMENTOS */}
      {fixingRequest && (
        <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-10 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4"><div><h2 className="text-lg font-black text-red-600">Corregir Documentos</h2><p className="text-xs text-gray-500">Sube nuevamente los archivos</p></div><button onClick={() => setFixingRequest(null)} className="bg-gray-100 p-1 rounded-full"><span className="material-symbols-outlined text-sm">close</span></button></div>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {fixingRequest.rejectedDocuments?.map(doc => (
                        <div key={doc} className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">{DOC_LABELS[doc] || doc}</label>
                            <div onClick={() => triggerFileUpload(doc)} className={`h-16 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all gap-2 relative overflow-hidden ${fixedDocs[doc] ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                                {fixedDocs[doc] ? (<div className="animate-in zoom-in flex items-center gap-2"><span className="material-symbols-outlined text-green-600">check_circle</span><span className="text-xs font-bold text-green-700">Archivo Cargado</span></div>) : (<><span className="material-symbols-outlined text-gray-400">cloud_upload</span><span className="text-xs font-medium text-gray-400">Toca para subir</span></>)}
                            </div>
                        </div>
                    ))}
                </div>
                <button disabled={Object.keys(fixedDocs).length < (fixingRequest.rejectedDocuments?.length || 0)} onClick={handleSubmitCorrections} className="w-full h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">Enviar a Revisión <span className="material-symbols-outlined text-sm">send</span></button>
            </div>
        </div>
      )}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" style={{ display: 'none' }} accept="application/pdf,image/*" />

      {/* MODAL SUBIR DOCUMENTOS */}
      {showDocumentsModal && (
        <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-surface-dark w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Documentación Requerida</h2>
                        <p className="text-xs text-gray-500 mt-1">Sube los documentos necesarios para tu solicitud</p>
                    </div>
                    <button onClick={() => setShowDocumentsModal(false)} className="bg-gray-200 dark:bg-gray-800 p-2 rounded-full text-gray-500 hover:text-gray-900">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body - DocumentUploadScreen integrado */}
                <div className="flex-1 overflow-hidden">
                    <DocumentUploadScreen
                        idUsuario={idUsuario}
                        token={token}
                        onSessionExpired={onLogout}
                        onBack={() => {
                            setShowDocumentsModal(false);
                            setShowPaymentModal(true);
                        }}
                        onContinue={(documentsData) => {
                            // Cuando el usuario confirma los documentos, finalizamos la solicitud
                            finalizeRequest(documentsData);
                        }}
                    />
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default DashboardScreen;