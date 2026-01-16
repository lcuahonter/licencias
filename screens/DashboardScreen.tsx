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
import { revisionService } from '../src/api/revisionService';
import examService from '../src/api/examService';

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
  const [showExamModal, setShowExamModal] = useState(false);
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<number | null>(null);
  const [examPreguntas, setExamPreguntas] = useState<any[]>([]);
  const [loadingExam, setLoadingExam] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60); // PRUEBA: 1 minuto = 60 segundos
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [idIntento, setIdIntento] = useState<number | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({}); // {idpregunta: respuesta}
  const [tiemposRespuesta, setTiemposRespuesta] = useState<Record<number, number>>({}); // {idpregunta: segundos}
  const [tiempoInicioPreguntas, setTiempoInicioPreguntas] = useState<number>(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState<'success' | 'error'>('success');
  const [enviandoExamen, setEnviandoExamen] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [showVerResultButton, setShowVerResultButton] = useState(false);
  const [verificandoResultado, setVerificandoResultado] = useState(false);
  const [idIntentoGuardado, setIdIntentoGuardado] = useState<number | null>(null);
  
  const [paymentStep, setPaymentStep] = useState<'select' | 'card' | 'cash'>('select');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'ventanilla' | null>(null);
  const [cardData, setCardData] = useState({ number: '', name: '', exp: '', cvv: '' });
  const [cardErrors, setCardErrors] = useState<{name?: string, exp?: string}>({});
  
  const [fixingRequest, setFixingRequest] = useState<LicenseRequest | null>(null);
  const [fixedDocs, setFixedDocs] = useState<Record<string, any>>({});
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
      .catch(err => {});
    
    return () => { mounted = false; };
  }, [idUsuario, token]);

  // --- CARGAR SOLICITUDES AL INICIAR ---
  useEffect(() => {
    if (!idUsuario || !token) return;
    let mounted = true;

    const loadSolicitudes = async () => {
      try {
        // Limpiar solicitudes anteriores antes de cargar nuevas
        if ((window as any).tempClearRequests) {
          (window as any).tempClearRequests();
        }
        
        const resp = await solicitudService.getByUser(idUsuario, token);
        const solicitudes = resp?.data?.solicitudesData || resp?.data?.solicitudes || [];
        
        if (mounted && solicitudes.length > 0 && (window as any).tempAddRequest) {
          // Procesar cada solicitud y determinar su estado REAL consultando los documentos
          for (const sol of solicitudes) {
            const idestatus = sol.idestatus;
            
            // Solo mostrar: 22 (Completa), 23 (Pendiente revisión), 24 (Aprobada), 25 (Rechazada)
            if (![22, 23, 24, 25].includes(idestatus)) continue;
            
            let status: any = 'pending';
            let rejectedDocuments: any[] = [];
            
            // Para TODAS las solicitudes, verificar el estado REAL de los documentos usando los endpoints
            try {
              // 1. Obtener revisiones usando /api/revisiones/revisionesBySolicitud
              const revResp = await revisionService.getRevisionesBySolicitud(sol.id, token);
              
              const revisionesData = revResp?.data?.revisionesData || revResp?.data?.revisiones || [];
              const revision = revisionesData[0];
              
              if (revision?.id) {
                // 2. Obtener documentos de revisión usando /revisionesDocumentosByRevision
                const docsResp = await revisionService.getDocumentosByRevision(revision.id, token);
                
                const docs = docsResp?.data?.revisionesDocumentosData || docsResp?.data?.revisionDocumentos || [];
                
                // 3. Analizar estado REAL de cada documento (idestatus: 13=Actualizado, 14=Aprobado, 15=Rechazado)
                const aprobados = docs.filter((d: any) => d.idestatus === 14);
                const rechazados = docs.filter((d: any) => d.idestatus === 15);
                const actualizados = docs.filter((d: any) => d.idestatus === 13);
                
                // 4. Determinar estado REAL basado en documentos (esto sobrescribe el estado de la solicitud)
                if (rechazados.length > 0) {
                  // HAY documentos rechazados - FORZAR estado rechazado
                  status = 'rejected';
                  rejectedDocuments = rechazados.map((d: any) => ({
                    iddocumento: d.iddocumento,
                    tipodocumento: d.tipodocumento || d.documento || 'Documento',
                    comentarios: d.comentarios || 'Sin comentarios'
                  }));
                } else if (aprobados.length > 0 && docs.length === aprobados.length) {
                  // TODOS aprobados - FORZAR estado completado
                  status = 'completed';
                } else if (actualizados.length > 0) {
                  // Hay documentos actualizados pendientes de revisión
                  status = 'paid_pending_docs';
                } else {
                  // Sin documentos o en proceso
                  status = 'paid_pending_docs';
                }
              } else {
                // No hay revisión - usar estado de solicitud como fallback
                if (idestatus === 24) status = 'completed';
                else if (idestatus === 25) status = 'rejected';
                else status = 'paid_pending_docs';
              }
            } catch (err) {
              // Fallback al estado de la solicitud si falla la consulta
              if (idestatus === 24) status = 'completed';
              else if (idestatus === 25) status = 'rejected';
              else status = 'paid_pending_docs';
            }
            
            // Si status final es completed, agregar como licencia
            if (status === 'completed') {
              const licenseData: LicenseRequest = {
                id: String(sol.id),
                type: sol.descripcion?.includes('Automovilista') ? 'Automovilista' : 
                      sol.descripcion?.includes('Motociclista') ? 'Motociclista' : 'Automovilista',
                process: 'Primera Vez',
                cost: getCost(sol.descripcion?.includes('Motociclista') ? 'Motociclista' : 'Automovilista'),
                date: new Date(sol.creacion).toLocaleDateString('es-MX'),
                status: 'completed',
                folio: sol.numerolicencia || sol.folio || `DGO-${sol.id}`,
                rejectedDocuments: [],
                rawData: sol
              };
              (window as any).tempAddRequest(licenseData);
              continue; // No mostrar en procesos activos
            }
            
            // Para estados no completados, agregar como proceso activo
            const request: LicenseRequest = {
              id: String(sol.id),
              type: sol.descripcion?.includes('Automovilista') ? 'Automovilista' : 
                    sol.descripcion?.includes('Motociclista') ? 'Motociclista' : 'Automovilista',
              process: 'Primera Vez',
              cost: getCost(sol.descripcion?.includes('Motociclista') ? 'Motociclista' : 'Automovilista'),
              date: new Date(sol.creacion).toLocaleDateString('es-MX'),
              status: status,
              folio: sol.folio || `DGO-${sol.id}`,
              rejectedDocuments: rejectedDocuments,
              rawData: sol
            };
            (window as any).tempAddRequest(request);
          }
        }
      } catch (error) {
        // Error al cargar solicitudes
      }
    };

    loadSolicitudes();
    return () => { mounted = false; };
  }, [idUsuario, token]);

  // --- TIMER DEL EXAMEN ---
  useEffect(() => {
    let interval: any;
    if (examStarted && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Solo mostrar modal, NO enviar
            setShowTimeoutModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [examStarted, timeRemaining]); // Remover dependencias innecesarias
  
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
                }
            } catch (fetchErr) {
                // Reintentar
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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    if (e.target.files?.[0] && activeDocKey) { 
      const file = e.target.files[0];
      setFixedDocs(p => ({...p, [activeDocKey]: file})); 
      e.target.value = ''; 
    }
  };
  
  const handleSubmitCorrections = async () => { 
    if (!fixingRequest || !token) return;
    
    try {
      // Convertir archivos a base64 y enviar updateDocumento para cada documento rechazado
      for (const docData of fixingRequest.rejectedDocuments || []) {
        const file = fixedDocs[docData.iddocumento];
        if (!file) continue;
        
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        // Extraer formato del archivo (pdf, jpg, png, etc)
        const formato = file.type.includes('pdf') ? 'pdf' : 
                       file.type.includes('jpeg') || file.type.includes('jpg') ? 'jpg' :
                       file.type.includes('png') ? 'png' : 'pdf';
        
        const payload = {
          id: docData.iddocumento,
          formato: formato,
          nombreoriginal: file.name,
          tamanio: file.size,
          archivoBase64: base64.split(',')[1], // Solo la parte base64, sin el prefijo data:
          validacion: "pendiente",
          validacioncomentarios: "Documento actualizado por el usuario",
          validacionusuario: idUsuario || 0,
          idestatus: 13 // 13 = Actualizado (pendiente de revisión)
        };
        
        await documentService.updateDocumento(payload, token);
      }
      
      // Recargar solicitudes usando la misma lógica del useEffect
      const resp = await solicitudService.getByUser(idUsuario!, token);
      const solicitudes = resp?.data?.solicitudesData || resp?.data?.solicitudes || [];
      
      // Limpiar requests actuales
      if ((window as any).tempClearRequests) {
        (window as any).tempClearRequests();
      }
      
      // Recargar todas las solicitudes con el estado actualizado
      for (const sol of solicitudes) {
        if (![22, 23, 24, 25].includes(sol.idestatus)) continue;
        
        let status: any = 'paid_pending_docs';
        let rejectedDocuments: any[] = [];
        
        try {
          const revResp = await revisionService.getRevisionesBySolicitud(sol.id, token);
          const revision = revResp?.data?.revisionesData?.[0];
          
          if (revision?.id) {
            const docsResp = await revisionService.getDocumentosByRevision(revision.id, token);
            const docs = docsResp?.data?.revisionesDocumentosData || [];
            
            const aprobados = docs.filter((d: any) => d.idestatus === 14);
            const rechazados = docs.filter((d: any) => d.idestatus === 15);
            const actualizados = docs.filter((d: any) => d.idestatus === 13);
            
            if (rechazados.length > 0) {
              status = 'rejected';
              rejectedDocuments = rechazados.map((d: any) => ({
                iddocumento: d.iddocumento,
                tipodocumento: d.tipodocumento || 'Documento',
                comentarios: d.comentarios || 'Sin comentarios'
              }));
            } else if (aprobados.length > 0 && docs.length === aprobados.length) {
              status = 'completed';
            } else {
              status = 'paid_pending_docs'; // Actualizados o en proceso
            }
          }
        } catch (err) {
          // Error al recargar
        }
        
        if (status === 'completed') {
          (window as any).tempAddRequest({
            id: String(sol.id),
            type: sol.descripcion?.includes('Automovilista') ? 'Automovilista' : 
                  sol.descripcion?.includes('Motociclista') ? 'Motociclista' : 'Automovilista',
            process: 'Primera Vez',
            cost: getCost(sol.descripcion?.includes('Motociclista') ? 'Motociclista' : 'Automovilista'),
            date: new Date(sol.creacion).toLocaleDateString('es-MX'),
            status: 'completed',
            folio: sol.numerolicencia || sol.folio || `DGO-${sol.id}`,
            rejectedDocuments: [],
            rawData: sol
          });
        } else {
          (window as any).tempAddRequest({
            id: String(sol.id),
            type: sol.descripcion?.includes('Automovilista') ? 'Automovilista' : 
                  sol.descripcion?.includes('Motociclista') ? 'Motociclista' : 'Automovilista',
            process: 'Primera Vez',
            cost: getCost(sol.descripcion?.includes('Motociclista') ? 'Motociclista' : 'Automovilista'),
            date: new Date(sol.creacion).toLocaleDateString('es-MX'),
            status: status,
            folio: sol.folio || `DGO-${sol.id}`,
            rejectedDocuments: rejectedDocuments,
            rawData: sol
          });
        }
      }
      
      setFixingRequest(null);
      alert("✅ Documentos actualizados correctamente.\n\nTu solicitud ahora está EN REVISIÓN (amarillo) esperando que el operador valide los nuevos documentos.");
    } catch (error: any) {
      console.error('❌ Error actualizando documentos:', error);
      alert(`Error al enviar los documentos: ${error?.data?.message || error?.message || 'Error desconocido'}`);
    }
  };

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
                    {activeLicenses.map((lic) => {
                      const rawData = lic.rawData;
                      const nombres = rawData?.nombres || userDataFresh?.nombres || '';
                      const apellidoPaterno = rawData?.apellidopaterno || userDataFresh?.apellidopaterno || '';
                      const apellidoMaterno = rawData?.apellidomaterno || userDataFresh?.apellidomaterno || '';
                      const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();
                      const numeroLicencia = rawData?.numerolicencia || lic.folio;
                      const vigencia = rawData?.vigencia || '2025 - 2028';
                      const descripcion = rawData?.descripcion || `Licencia ${lic.type}`;
                      
                      return (
                        <div key={lic.id} className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 text-white opacity-10"><span className="material-symbols-outlined text-9xl">verified</span></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg"><p className="text-[10px] font-bold uppercase tracking-widest">Licencia Digital</p></div>
                                    <span className="material-symbols-outlined">qr_code_2</span>
                                </div>
                                <div className="mt-4">
                                  <h3 className="text-2xl font-black tracking-tight">{lic.type.toUpperCase()}</h3>
                                  <p className="text-xs opacity-80 mt-1">{descripcion}</p>
                                  <p className="text-sm font-bold mt-2">{nombreCompleto}</p>
                                  <p className="text-xs opacity-80 font-mono mt-1">No. {numeroLicencia}</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-end">
                                  <div>
                                    <p className="text-[8px] uppercase opacity-70">Vigencia</p>
                                    <p className="text-sm font-bold">{vigencia}</p>
                                  </div>
                                </div>
                            </div>
                        </div>
                      );
                    })}
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
                            {req.status === 'rejected' && req.rejectedDocuments && req.rejectedDocuments.length > 0 && (
                              <div className="mt-3 bg-red-50 p-3 rounded-xl text-xs text-red-800 border border-red-100">
                                <div className="font-bold flex items-center gap-1 mb-1">
                                  <span className="material-symbols-outlined text-sm">error</span> Acción Requerida:
                                </div>
                                <ul className="list-disc list-inside font-bold space-y-1">
                                  {req.rejectedDocuments.map(docData => (
                                    <li key={docData.iddocumento}>
                                      {docData.tipodocumento}
                                      {docData.comentarios && <span className="font-normal text-red-600 ml-1">({docData.comentarios})</span>}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {req.status === 'rejected' && (
                              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                                  <button onClick={() => handleOpenFixModal(req)} className="w-full bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2"><span className="material-symbols-outlined text-sm">upload_file</span> Corregir Documentos</button>
                              </div>
                            )}
                            
                            {/* Botón examen teórico - Solo en solicitudes NO rechazadas */}
                            {req.status !== 'rejected' && (
                              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <button 
                                  onClick={() => {
                                    setSelectedSolicitudId(Number(req.id));
                                    setShowExamModal(true);
                                    setExamStarted(false);
                                    setTimeRemaining(60);
                                    setRespuestas({});
                                    setTiemposRespuesta({});
                                    setEnviandoExamen(false);
                                  }}
                                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-sm">quiz</span> 
                                  Realizar Examen Teórico
                                </button>
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
                    {fixingRequest.rejectedDocuments?.map(docData => (
                        <div key={docData.iddocumento} className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">{docData.tipodocumento || 'Documento'}</label>
                            {docData.comentarios && (
                              <p className="text-[10px] text-red-600 mb-1 italic">Motivo: {docData.comentarios}</p>
                            )}
                            <div onClick={() => triggerFileUpload(docData.iddocumento)} className={`h-16 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all gap-2 relative overflow-hidden ${fixedDocs[docData.iddocumento] ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                                {fixedDocs[docData.iddocumento] ? (<div className="animate-in zoom-in flex items-center gap-2"><span className="material-symbols-outlined text-green-600">check_circle</span><span className="text-xs font-bold text-green-700">Archivo Cargado</span></div>) : (<><span className="material-symbols-outlined text-gray-400">cloud_upload</span><span className="text-xs font-medium text-gray-400">Toca para subir</span></>)}
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

      {/* MODAL EXAMEN TEÓRICO */}
      {showExamModal && (
        <div 
          className="absolute inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            // Solo permitir cerrar si NO ha iniciado el examen
            if (!examStarted && e.target === e.currentTarget) {
              setShowExamModal(false);
              setSelectedSolicitudId(null);
              setExamPreguntas([]);
            }
          }}
        >
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Examen Teórico de Manejo</h2>
                {examStarted && (
                  <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-lg">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span className="font-mono font-bold">
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
              {!examStarted && (
                <button 
                  onClick={() => {
                    setShowExamModal(false);
                    setSelectedSolicitudId(null);
                    setExamPreguntas([]);
                  }}
                  className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
            
            {!examStarted ? (
              /* PANTALLA DE INSTRUCCIONES */
              <div className="space-y-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-yellow-600 text-3xl">warning</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-yellow-800 mb-2">Instrucciones Importantes</h3>
                      <ul className="space-y-2 text-sm text-yellow-700">
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-xs mt-0.5">check_circle</span>
                          <span>Tienes <strong>1 minuto</strong> para completar el examen (PRUEBA)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-xs mt-0.5">check_circle</span>
                          <span>Una vez iniciado, <strong>no podrás cerrar</strong> la ventana hasta finalizar</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-xs mt-0.5">check_circle</span>
                          <span>Si cancelas ahora, <strong>NO contará</strong> como intento</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-xs mt-0.5">check_circle</span>
                          <span>Si inicias y abandonas, <strong>SÍ contará</strong> como intento fallido</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-xs mt-0.5">check_circle</span>
                          <span>Si se agota el tiempo, tus respuestas se <strong>enviarán automáticamente</strong></span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Datos del Usuario y Solicitud */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">badge</span>
                    Información del Usuario y Solicitud
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-500 text-xs mb-1">Usuario</p>
                      <p className="font-bold text-gray-900">
                        {userDataFresh?.nombre || userDataFresh?.nombres || ''} {userDataFresh?.apellidopaterno || userDataFresh?.apellidoPaterno || ''} {userDataFresh?.apellidomaterno || userDataFresh?.apellidoMaterno || ''}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-500 text-xs mb-1">CURP</p>
                      <p className="font-mono font-bold text-gray-900 text-xs">{userDataFresh?.curp || ''}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-500 text-xs mb-1">Solicitud ID</p>
                      <p className="font-bold text-blue-600">#{selectedSolicitudId}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-gray-500 text-xs mb-1">Tipo de Licencia</p>
                      <p className="font-bold text-gray-900">{userData.requests?.find((r: any) => r.id === selectedSolicitudId?.toString())?.licenseType || 'Automovilista'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowExamModal(false);
                      setSelectedSolicitudId(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setLoadingExam(true);
                      try {
                        const data = await examService.obtenerPreguntas(selectedSolicitudId!, token || '');
                        console.log('Preguntas obtenidas:', data);
                        setExamPreguntas(data.preguntas);
                        setIdIntento(data.idintento);
                        setExamStarted(true);
                        setTimeRemaining(60); // PRUEBA: 60 segundos
                        setTiempoInicioPreguntas(Date.now());
                      } catch (error: any) {
                        console.error('Error al cargar examen:', error);
                        alert('Error al cargar el examen: ' + (error.response?.data?.message || error.message));
                        setShowExamModal(false);
                      } finally {
                        setLoadingExam(false);
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">play_arrow</span>
                    Aceptar e Iniciar Examen
                  </button>
                </div>
              </div>
            ) : loadingExam ? (
              /* CARGANDO EXAMEN */
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando examen...</p>
              </div>
            ) : examPreguntas.length > 0 ? (
              /* MOSTRANDO PREGUNTAS */
              <div className="space-y-4">
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                  <p className="text-green-700 font-bold text-sm">Examen cargado correctamente</p>
                  <p className="text-green-600 text-xs">Responde las {examPreguntas.length} preguntas. Intento ID: {idIntento}</p>
                </div>
                
                {/* Mostrar las preguntas con opciones seleccionables */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {examPreguntas.map((pregunta, index) => {
                    const respuestaSeleccionada = respuestas[pregunta.id];
                    
                    return (
                      <div key={pregunta.id} className={`border-2 rounded-lg p-4 ${
                        respuestaSeleccionada ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-start gap-2 mb-3">
                          <span className="font-bold text-blue-600 text-lg">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{pregunta.pregunta}</p>
                            <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {pregunta.categoria}
                            </span>
                          </div>
                        </div>
                        
                        {/* Opciones */}
                        <div className="space-y-2 ml-8">
                          {['A', 'B', 'C', 'D'].map(opcion => {
                            const textoOpcion = pregunta[`opcion${opcion}`];
                            const isSelected = respuestaSeleccionada === opcion;
                            
                            return (
                              <button
                                key={opcion}
                                onClick={() => {
                                  // Guardar respuesta
                                  setRespuestas(prev => ({ ...prev, [pregunta.id]: opcion }));
                                  // Si es la primera vez que responde esta pregunta, guardar tiempo
                                  if (!tiemposRespuesta[pregunta.id]) {
                                    const tiempoTranscurrido = Math.floor((Date.now() - tiempoInicioPreguntas) / 1000);
                                    setTiemposRespuesta(prev => ({ ...prev, [pregunta.id]: tiempoTranscurrido }));
                                  }
                                }}
                                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                  isSelected 
                                    ? 'border-green-500 bg-green-100 font-bold'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                <span className="font-bold mr-2">{opcion})</span>
                                <span>{textoOpcion}</span>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-green-600 float-right">check_circle</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Botón Enviar Examen */}
                <div className="mt-6 pt-4 border-t">
                  <div className="mb-3 text-center">
                    <p className="text-sm text-gray-600">
                      Respondidas: <span className="font-bold text-blue-600">{Object.keys(respuestas).length}</span> / {examPreguntas.length}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (Object.keys(respuestas).length < examPreguntas.length) {
                        if (!confirm(`Solo has respondido ${Object.keys(respuestas).length} de ${examPreguntas.length} preguntas. ¿Deseas enviar de todas formas?`)) {
                          return;
                        }
                      }
                      setShowConfirmSubmit(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">send</span>
                    Enviar Examen
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-400">No se cargaron preguntas</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN DE ENVÍO */}
      {showConfirmSubmit && (
        <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-yellow-600 text-4xl">help</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                ¿Estás seguro de enviar el examen?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Una vez enviado, no podrás modificar tus respuestas. Asegúrate de haber respondido todas las preguntas.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setShowConfirmSubmit(false);
                  
                  // DETENER EL TIMER inmediatamente
                  setExamStarted(false);
                  
                  try {
                    // Construir el array de respuestas
                    const respuestasArray = Object.entries(respuestas).map(([idpregunta, respuesta]) => ({
                      idpregunta: Number(idpregunta),
                      respuesta: respuesta as string,
                      tiempoRespuesta: tiemposRespuesta[Number(idpregunta)] || 30
                    }));
                    
                    console.log('Enviando respuestas con idintento:', idIntento, 'respuestas:', respuestasArray);
                    
                    // Llamar al servicio con los parámetros separados
                    await examService.enviarRespuestas(idIntento!, respuestasArray, token || '');
                    console.log('Respuestas enviadas exitosamente');
                    
                    // Guardar idIntento para verificar después
                    setIdIntentoGuardado(idIntento);
                    
                    // Mostrar modal con botón "Ver Resultado"
                    setResultMessage('Examen enviado correctamente.');
                    setResultType('success');
                    setShowVerResultButton(true);
                    setShowResultModal(true);
                  } catch (error: any) {
                    console.error('Error al enviar examen (mostrando botón de verificar):', error);
                    
                    // Guardar idIntento para verificar después
                    setIdIntentoGuardado(idIntento);
                    
                    // Aunque haya error, mostrar botón para verificar
                    setResultMessage('Respuestas procesadas. Verifica el resultado.');
                    setResultType('success');
                    setShowVerResultButton(true);
                    setShowResultModal(true);
                  }
                  
                  // Cerrar todo
                  setShowExamModal(false);
                  setExamPreguntas([]);
                  setSelectedSolicitudId(null);
                  setRespuestas({});
                  setTiemposRespuesta({});
                  setIdIntento(null);
                }}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">check_circle</span>
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESULTADOS */}
      {showResultModal && (
        <div className="absolute inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className={`w-20 h-20 ${
                resultType === 'success' ? 'bg-green-100' : 
                resultType === 'error' ? 'bg-red-100' : 'bg-blue-100'
              } rounded-full flex items-center justify-center mx-auto mb-4`}>
                <span className={`material-symbols-outlined ${
                  resultType === 'success' ? 'text-green-600' : 
                  resultType === 'error' ? 'text-red-600' : 'text-blue-600'
                } text-5xl`}>
                  {resultType === 'success' ? 'check_circle' : resultType === 'error' ? 'error' : 'info'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {resultType === 'success' ? '¡Examen Enviado!' : resultType === 'error' ? 'Reprobado' : 'Resultado Pendiente'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {resultMessage}
              </p>
              
              {showVerResultButton ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowResultModal(false);
                      setShowVerResultButton(false);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={async () => {
                      if (verificandoResultado) return;
                      setVerificandoResultado(true);
                      
                      try {
                        // Esperar 1 segundo antes de verificar
                        await wait(1000);
                        
                        const resultadoExamen = await examService.verificarResultado(idIntentoGuardado!, token || '');
                        console.log('Resultado del examen:', resultadoExamen);
                        
                        // Determinar el tipo según el resultado
                        // Asumiendo que resultadoExamen tiene una propiedad 'aprobado' o similar
                        const aprobado = resultadoExamen.aprobado || resultadoExamen.data?.aprobado;
                        
                        setResultMessage(resultadoExamen.message || `Calificación: ${resultadoExamen.calificacion || 'N/A'}`);
                        setResultType(aprobado ? 'success' : 'error');
                        setShowVerResultButton(false);
                      } catch (error: any) {
                        console.log('Error al verificar resultado:', error);
                        const mensaje = error.response?.data?.message || error.message || 'El examen está siendo procesado';
                        setResultMessage(mensaje);
                        setResultType('info' as any); // Azul para pendiente
                        setShowVerResultButton(false);
                      } finally {
                        setVerificandoResultado(false);
                      }
                    }}
                    disabled={verificandoResultado}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {verificandoResultado ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                        Verificando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">visibility</span>
                        Ver Resultado
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowResultModal(false);
                    setShowVerResultButton(false);
                    setIdIntentoGuardado(null);
                  }}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TIEMPO AGOTADO */}
      {showTimeoutModal && (
        <div className="absolute inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-orange-600 text-5xl">
                  schedule
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                ¡Tiempo Agotado!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                El tiempo del examen ha terminado. Se enviarán tus respuestas automáticamente. Las preguntas sin responder se marcarán con la opción "A".
              </p>
              <button
                onClick={async () => {
                  setShowTimeoutModal(false);
                  
                  if (enviandoExamen) return;
                  setEnviandoExamen(true);
                  
                  try {
                    // Completar respuestas faltantes con "A"
                    const respuestasCompletas = { ...respuestas };
                    examPreguntas.forEach(pregunta => {
                      if (!respuestasCompletas[pregunta.id]) {
                        respuestasCompletas[pregunta.id] = 'A';
                      }
                    });
                    
                    // Enviar respuestas
                    const respuestasArray = Object.entries(respuestasCompletas).map(([idpregunta, respuesta]) => ({
                      idpregunta: Number(idpregunta),
                      respuesta: respuesta as string,
                      tiempoRespuesta: tiemposRespuesta[Number(idpregunta)] || 60
                    }));
                    
                    console.log('ENVÍO POR TIMEOUT - Payload:', { idintento: idIntento, respuestas: respuestasArray });
                    
                    try {
                      await examService.enviarRespuestas(idIntento!, respuestasArray, token || '');
                      console.log('Respuestas enviadas exitosamente');
                    } catch (errorEnviar: any) {
                      console.error('Error al enviar (mostrando botón de verificar):', errorEnviar);
                    }
                    
                    // Guardar idIntento para verificar después
                    setIdIntentoGuardado(idIntento);
                    
                    // Mostrar modal con botón "Ver Resultado"
                    setResultMessage('Tiempo agotado. Examen enviado.');
                    setResultType('success');
                    setShowVerResultButton(true);
                    setShowResultModal(true);
                    
                    // Cerrar todo
                    setShowExamModal(false);
                    setExamStarted(false);
                    setExamPreguntas([]);
                    setSelectedSolicitudId(null);
                    setRespuestas({});
                    setTiemposRespuesta({});
                    setIdIntento(null);
                  } catch (error: any) {
                    console.error('Error en envío:', error);
                    setResultMessage('Error al enviar el examen: ' + (error.response?.data?.message || error.message));
                    setResultType('error');
                    setShowResultModal(true);
                  } finally {
                    setEnviandoExamen(false);
                  }
                }}
                className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold"
              >
                Aceptar y Enviar Respuestas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardScreen;