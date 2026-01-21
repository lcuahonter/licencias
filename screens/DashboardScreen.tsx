import React, { useState, useRef, useEffect } from 'react';
import { UserData, LicenseRequest, LicenseType, ProcessType } from '../types';
import DocumentUploadScreen from './DocumentUploadScreen';
import durangoLogo from '../src/recursos/durangogob.svg';

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
  const [showDigitalLicense, setShowDigitalLicense] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseRequest | null>(null);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<number | null>(null);
  const [examPreguntas, setExamPreguntas] = useState<any[]>([]);
  const [loadingExam, setLoadingExam] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutos = 900 segundos
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
  const [isSubmittingCorrections, setIsSubmittingCorrections] = useState(false);
  
  // Modales para documentos corregidos
  const [showCorrectionsSuccessModal, setShowCorrectionsSuccessModal] = useState(false);
  const [showCorrectionsErrorModal, setShowCorrectionsErrorModal] = useState(false);
  const [correctionsMessage, setCorrectionsMessage] = useState('');
  
  // Modal genérico para alertas
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [selectedType, setSelectedType] = useState<LicenseType>('Automovilista');
  const [selectedProcess, setSelectedProcess] = useState<ProcessType>('Primera Vez');
  
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  
  // Estado local para solicitudes cargadas desde el backend
  const [solicitudesCargadas, setSolicitudesCargadas] = useState<LicenseRequest[]>([]);

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
  
  const reloadUserProfile = async () => {
    if (!idUsuario || !token) return;
    try {
      const resp = await userService.getUsuarioById(idUsuario, token);
      
      const userFresh = {
        ...resp?.data?.usuario,
        perfil: resp?.data?.perfil
      };
      
      if (userFresh) {
        setUserDataFresh(userFresh);
      }
    } catch (err) {
      // Error al recargar perfil
    }
  };
  
  useEffect(() => {
    reloadUserProfile();
  }, [idUsuario, token]);

  // Recargar perfil cuando se regresa a esta pantalla (focus)
  useEffect(() => {
    const handleFocus = () => {
      reloadUserProfile();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [idUsuario, token]);

  // --- FUNCIÓN PARA RECARGAR SOLICITUDES ---
  const reloadSolicitudes = async () => {
    if (!idUsuario || !token) {
      return;
    }
    
    try {
      const resp = await solicitudService.getByUser(idUsuario, token);
      
      const solicitudes = resp?.data?.solicitudesData || resp?.data?.solicitudes || [];
      
      if (solicitudes.length > 0) {
        const solicitudesProcesadas: LicenseRequest[] = [];
        // Procesar cada solicitud usando su idestatus como fuente de verdad
        for (const sol of solicitudes) {
          const idestatus = sol.idestatus;
          
          // Solo mostrar: 20 (Nueva), 22 (Completa), 23 (Pendiente revisión), 24 (Documentos aprobados), 25 (Rechazada), 26 (Examen aprobado), 27 (Examen reprobado), 32 (Asignada a operador)
          if (![20, 22, 23, 24, 25, 26, 27, 32].includes(idestatus)) continue;
          
          let status: any = 'pending';
          let rejectedDocuments: any[] = [];
          
          // USAR EL IDESTATUS DE LA SOLICITUD COMO FUENTE DE VERDAD
          if (idestatus === 26) {
            // Estado 26 = Examen APROBADO confirmado por el backend
            status = 'completed';
          } else if (idestatus === 24) {
            // Solicitud APROBADA (documentos OK) - verificar examen usando API de verificación
            try {
              const resultadoExamen = await examService.verificarAprobacion(sol.id, token);
              const examenAprobado = resultadoExamen?.aprobo === true;
              
              if (examenAprobado) {
                status = 'completed';
              } else {
                // Documentos aprobados pero examen pendiente o reprobado
                status = 'paid_pending_docs';
              }
            } catch (err) {
              // Si hay error al verificar, mantener como pendiente
              status = 'paid_pending_docs';
            }
          } else if (idestatus === 27) {
            // Examen teórico REPROBADO
            status = 'rejected';
          } else if (idestatus === 20 || idestatus === 25 || idestatus === 22 || idestatus === 23 || idestatus === 32) {
            status = idestatus === 25 ? 'rejected' : 'paid_pending_docs';
            
            try {
              const revResp = await revisionService.getRevisionesBySolicitud(sol.id, token);
              const revisionesData = revResp?.data?.revisionesData || revResp?.data?.revisiones || [];
              const revision = revisionesData[0];
              
              if (revision?.id) {
                const docsResp = await revisionService.getDocumentosByRevision(revision.id, token);
                const docs = docsResp?.data?.revisionesDocumentosData || docsResp?.data?.revisionDocumentos || [];
                
                const rechazados = docs.filter((d: any) => d.idestatus === 15);
                
                if (rechazados.length > 0) {
                  status = 'rejected';
                  rejectedDocuments = rechazados.map((d: any) => ({
                    iddocumento: d.iddocumento,
                    tipodocumento: d.tipodocumento || d.documento || 'Documento',
                    comentarios: d.comentarios || 'Sin comentarios'
                  }));
                }
              }
            } catch (err) {
              // Error al consultar documentos
            }
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
            solicitudesProcesadas.push(licenseData);
            continue;
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
          solicitudesProcesadas.push(request);
        }
        
        setSolicitudesCargadas(solicitudesProcesadas);
      }
    } catch (error) {
      // Error al cargar solicitudes
    }
  };

  // --- CARGAR SOLICITUDES AL INICIAR ---
  useEffect(() => {
    if (!idUsuario || !token) {
      return;
    }
    
    let mounted = true;

    const loadSolicitudes = async () => {
      try {
        const resp = await solicitudService.getByUser(idUsuario, token);
        
        const solicitudes = resp?.data?.solicitudesData || resp?.data?.solicitudes || [];
        
        if (mounted && solicitudes.length > 0) {
          const solicitudesProcesadas: LicenseRequest[] = [];
          
          // Procesar cada solicitud usando su idestatus como fuente de verdad
          for (const sol of solicitudes) {
            const idestatus = sol.idestatus;
            
            // Solo mostrar: 20 (Nueva), 22 (Completa), 23 (Pendiente revisión), 24 (Documentos aprobados), 25 (Rechazada), 26 (Examen aprobado), 27 (Examen reprobado), 32 (Asignada a operador)
            if (![20, 22, 23, 24, 25, 26, 27, 32].includes(idestatus)) continue;
            
            let status: any = 'pending';
            let rejectedDocuments: any[] = [];
            
            // USAR EL IDESTATUS DE LA SOLICITUD COMO FUENTE DE VERDAD
            if (idestatus === 26) {
              // Estado 26 = Examen APROBADO confirmado por el backend
              status = 'completed';
            } else if (idestatus === 24) {
              // Solicitud APROBADA (documentos OK) - verificar examen usando API de verificación
              try {
                const resultadoExamen = await examService.verificarAprobacion(sol.id, token);
                const examenAprobado = resultadoExamen?.aprobo === true;
                
                if (examenAprobado) {
                  status = 'completed';
                } else {
                  // Documentos aprobados pero examen pendiente o reprobado
                  status = 'paid_pending_docs';
                }
              } catch (err) {
                // Si hay error al verificar, mantener como pendiente
                status = 'paid_pending_docs';
              }
            } else if (idestatus === 27) {
              // Examen teórico REPROBADO
              status = 'rejected';
            } else if (idestatus === 20 || idestatus === 25 || idestatus === 22 || idestatus === 23 || idestatus === 32) {
              // Para solicitudes rechazadas o en proceso, consultar documentos
              // IMPORTANTE: NUNCA marcar como completed si idestatus no es 24
              status = idestatus === 25 ? 'rejected' : 'paid_pending_docs';
              
              try {
                const revResp = await revisionService.getRevisionesBySolicitud(sol.id, token);
                const revisionesData = revResp?.data?.revisionesData || revResp?.data?.revisiones || [];
                const revision = revisionesData[0];
                
                if (revision?.id) {
                  const docsResp = await revisionService.getDocumentosByRevision(revision.id, token);
                  const docs = docsResp?.data?.revisionesDocumentosData || docsResp?.data?.revisionDocumentos || [];
                  
                  // Buscar documentos rechazados (idestatus 15) para mostrar al usuario
                  const rechazados = docs.filter((d: any) => d.idestatus === 15);
                  const aprobados = docs.filter((d: any) => d.idestatus === 14);
                  const actualizados = docs.filter((d: any) => d.idestatus === 13);
                  
                  if (rechazados.length > 0) {
                    // Si hay documentos rechazados, cambiar status a rejected
                    status = 'rejected';
                    rejectedDocuments = rechazados.map((d: any) => ({
                      iddocumento: d.iddocumento,
                      tipodocumento: d.tipodocumento || d.documento || 'Documento',
                      comentarios: d.comentarios || 'Sin comentarios'
                    }));
                  }
                  // IMPORTANTE: Si idestatus es 32, SIEMPRE mantener como paid_pending_docs
                  // NO importa si todos los documentos están aprobados (14)
                  // Solo el backend puede cambiar la solicitud a idestatus 24
                }
              } catch (err) {
                // Error al consultar documentos - continuar con estado basado en idestatus
              }
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
              solicitudesProcesadas.push(licenseData);
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
            solicitudesProcesadas.push(request);
          }
          
          setSolicitudesCargadas(solicitudesProcesadas);
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
  // Combinar solicitudes del prop userData.requests con las cargadas del backend
  const todasLasSolicitudes = [...(userData.requests || []), ...solicitudesCargadas];
  const activeLicenses = todasLasSolicitudes.filter(r => r.status === 'completed') || [];
  const activeProcessList = todasLasSolicitudes.filter(r => 
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
        setAlertMessage(`Ya tienes un trámite de ${selectedType} en curso.`);
        setAlertType('warning');
        setShowAlertModal(true);
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
              setAlertMessage("Tarjeta no válida.");
              setAlertType('error');
              setShowAlertModal(true);
              return; 
          }
          if (cardErrors.exp || cardData.exp.length < 5) { 
              setAlertMessage("Fecha incorrecta.");
              setAlertType('error');
              setShowAlertModal(true);
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
          setAlertMessage('No se seleccionó método de pago.');
          setAlertType('warning');
          setShowAlertModal(true);
          return;
      }

      const method = selectedPaymentMethod;

      if (!idUsuario) { 
        setAlertMessage('Usuario no identificado.');
        setAlertType('error');
        setShowAlertModal(true);
        return; 
      }

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
            setAlertMessage("La solicitud se creó, pero el sistema está tardando en procesarla. Verifica tu historial en unos minutos.");
            setAlertType('info');
            setShowAlertModal(true);
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
        
        // Agregar al estado local
        setSolicitudesCargadas(prev => [...prev, newRequest]);

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
                // Error subiendo documento
                if (derr.isAuthError) {
                    setAlertMessage('Sesión expirada durante la carga de documentos.');
                    setAlertType('error');
                    setShowAlertModal(true);
                    setTimeout(() => onLogout(), 2000);
                    return;
                }
            }
        }
        
        if (docsOk > 0) {
            setAlertMessage(`Solicitud creada exitosamente. Se subieron ${docsOk} documentos.`);
            setAlertType('success');
            setShowAlertModal(true);
        } else {
            setAlertMessage("Solicitud creada. Hubo un problema subiendo los documentos, por favor intenta cargarlos nuevamente desde el detalle.");
            setAlertType('warning');
            setShowAlertModal(true);
        }

        // Cerrar modal y limpiar estados
        setShowDocumentsModal(false);
        setSelectedPaymentMethod(null);

      } catch (err: any) {
        if (err.isAuthError) {
          setAlertMessage('Sesión expirada. Por favor inicia sesión de nuevo.');
          setAlertType('error');
          setShowAlertModal(true);
          setTimeout(() => onLogout(), 2000);
        } else {
          setAlertMessage('Error al procesar la solicitud. Inténtalo de nuevo.');
          setAlertType('error');
          setShowAlertModal(true);
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
    if (!fixingRequest || !token || isSubmittingCorrections) return;
    
    try {
      setIsSubmittingCorrections(true);
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
      
      // Recargar todas las solicitudes después de actualizar documentos
      await reloadSolicitudes();
      
      setFixingRequest(null);
      setCorrectionsMessage("✅ Documentos actualizados correctamente.\n\nTu solicitud ahora está EN REVISIÓN esperando que el operador valide los nuevos documentos.");
      setShowCorrectionsSuccessModal(true);
    } catch (error: any) {
      setCorrectionsMessage(`Error al enviar los documentos: ${error?.data?.message || error?.message || 'Error desconocido'}`);
      setShowCorrectionsErrorModal(true);
    } finally {
      setIsSubmittingCorrections(false);
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
                      const nombres = userDataFresh?.nombres || '';
                      const apellidoPaterno = userDataFresh?.apellidopaterno || '';
                      const apellidoMaterno = userDataFresh?.apellidomaterno || '';
                      const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();
                      
                      const numeroLicencia = rawData?.numerolicencia || lic.folio;
                      const vigencia = rawData?.vigencia || '2025 - 2028';
                      const descripcion = rawData?.descripcion || `Licencia ${lic.type}`;
                      
                      return (
                        <div key={lic.id} onClick={() => { setSelectedLicense(lic); setShowDigitalLicense(true); }} className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform">
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
                      const idestatus = rawData?.idestatus;
                      
                      // Determinar el texto del estado
                      const statusDisplay = req.status === 'rejected' ? (idestatus === 27 ? 'EXAMEN REPROBADO' : 'RECHAZADO') : 
                                          req.status === 'pending_payment' ? 'EN ESPERA DE REVISION' : 
                                          (idestatus === 20 ? 'EN ESPERA QUE REALICES TU EXAMEN' :
                                           idestatus === 24 ? 'APROBADO - FALTA EXAMEN' : 
                                           idestatus === 26 ? 'EXAMEN APROBADO' : (estatus || 'EN REVISIÓN'));
                      
                      return (
                        <div key={req.id} className={`p-5 rounded-2xl border-l-4 shadow-sm bg-white dark:bg-surface-dark relative overflow-hidden ${req.status === 'rejected' ? 'border-red-500' : 'border-yellow-400'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{statusDisplay}</span><span className="text-[10px] text-gray-400 font-mono">{req.folio}</span></div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{descripcion}</h3>
                                    <p className="text-xs text-gray-500 mt-1">Creado: {fecha}</p>
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
                            
                            {/* Botón examen teórico - Solo mostrar cuando idestatus es 20 (Nueva solicitud sin examen) */}
                            {req.status !== 'rejected' && req.status !== 'completed' && idestatus === 20 && (
                              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <button 
                                  onClick={() => {
                                    setSelectedSolicitudId(Number(req.id));
                                    setShowExamModal(true);
                                    setExamStarted(false);
                                    setTimeRemaining(900);
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
                <button 
                  disabled={Object.keys(fixedDocs).length < (fixingRequest.rejectedDocuments?.length || 0) || isSubmittingCorrections} 
                  onClick={handleSubmitCorrections} 
                  className="w-full h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingCorrections ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar a Revisión <span className="material-symbols-outlined text-sm">send</span>
                    </>
                  )}
                </button>
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
                        isSubmittingRequest={isSubmittingRequest}
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
                          <span>Tienes <strong>15 minutos</strong> para completar el examen</span>
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
                        {userDataFresh?.nombres || ''} {userDataFresh?.apellidopaterno || ''} {userDataFresh?.apellidomaterno || ''}
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
                        setExamPreguntas(data.preguntas);
                        setIdIntento(data.idintento);
                        setExamStarted(true);
                        setTimeRemaining(900); // 15 minutos = 900 segundos
                        setTiempoInicioPreguntas(Date.now());
                      } catch (error: any) {
                        setAlertMessage('Error al cargar el examen: ' + (error.response?.data?.message || error.message));
                        setAlertType('error');
                        setShowAlertModal(true);
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
                    // Validación de tipo de respuesta
                    const isValidRespuesta = (resp: string): resp is "A" | "B" | "C" | "D" => {
                      return ["A", "B", "C", "D"].includes(resp);
                    };
                    
                    // Construir el array de respuestas con validación
                    const respuestasArray = Object.entries(respuestas)
                      .filter(([, respuesta]) => respuesta !== null && isValidRespuesta(respuesta as string))
                      .map(([idpregunta, respuesta]) => ({
                        idpregunta: Number(idpregunta),
                        respuesta: respuesta as "A" | "B" | "C" | "D",
                        tiempoRespuesta: tiemposRespuesta[Number(idpregunta)] || 30
                      }));
                    
                    // Llamar al servicio con los parámetros separados
                    await examService.enviarRespuestas(idIntento!, respuestasArray, token || '');
                    
                    // Guardar idIntento para verificar después
                    setIdIntentoGuardado(idIntento);
                    
                    // Mostrar modal con botón "Ver Resultado"
                    setResultMessage('Examen enviado correctamente.');
                    setResultType('success');
                    setShowVerResultButton(true);
                    setShowResultModal(true);
                  } catch (error: any) {
                    
                    // Guardar idIntento para verificar después
                    setIdIntentoGuardado(idIntento);
                    
                    // Aunque haya error, mostrar botón para verificar
                    setResultMessage('Respuestas procesadas. Verifica el resultado.');
                    setResultType('success');
                    setShowVerResultButton(true);
                    setShowResultModal(true);
                  }
                  
                  // Cerrar todo (mantener selectedSolicitudId para Ver Resultado)
                  setShowExamModal(false);
                  setExamPreguntas([]);
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
                      setSelectedSolicitudId(null);
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
                        
                        const resultadoExamen = await examService.verificarAprobacion(selectedSolicitudId!, token || '');
                        
                        const aprobado = resultadoExamen?.aprobo === true;
                        const mensaje = resultadoExamen?.mensaje || resultadoExamen?.message || '';
                        const calificacion = resultadoExamen?.calificacion;
                        
                        const mensajeFinal = mensaje || (aprobado ? `¡Felicidades! Has aprobado el examen con ${calificacion}` : `No aprobaste el examen. Calificación: ${calificacion || 'N/A'}`);
                        
                        setResultMessage(mensajeFinal);
                        setResultType(aprobado ? 'success' : 'error');
                        setShowVerResultButton(false);
                        
                        // Si aprobó el examen, actualizar solicitud a estado 22
                        if (aprobado && selectedSolicitudId) {
                          try {
                            await solicitudService.updateSolicitud(selectedSolicitudId, 22, token || '');
                          } catch (updateErr) {
                            // Error al actualizar solicitud, pero continuar
                          }
                        }
                        
                        // Recargar solicitudes para actualizar el estado (aprobado o reprobado)
                        await wait(1000);
                        await reloadSolicitudes();
                        
                        // Limpiar selectedSolicitudId después de recargar
                        setSelectedSolicitudId(null);
                      } catch (error: any) {
                        const mensaje = error.response?.data?.message || error.response?.data?.data?.mensaje || error.message || 'El examen está siendo procesado';
                        setResultMessage(mensaje);
                        setResultType('info' as any);
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
                    // Recargar solicitudes para actualizar el estado del examen
                    reloadSolicitudes();
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
                      respuesta: respuesta as "A" | "B" | "C" | "D",
                      tiempoRespuesta: tiemposRespuesta[Number(idpregunta)] || 60
                    }));
                    
                    try {
                      await examService.enviarRespuestas(idIntento!, respuestasArray, token || '');
                    } catch (errorEnviar: any) {
                      // Error al enviar
                    }
                    
                    // Guardar idIntento para verificar después
                    setIdIntentoGuardado(idIntento);
                    
                    // Mostrar modal con botón "Ver Resultado"
                    setResultMessage('Tiempo agotado. Examen enviado.');
                    setResultType('success');
                    setShowVerResultButton(true);
                    setShowResultModal(true);
                    
                    // Cerrar todo (mantener selectedSolicitudId para Ver Resultado)
                    setShowExamModal(false);
                    setExamStarted(false);
                    setExamPreguntas([]);
                    setRespuestas({});
                    setTiemposRespuesta({});
                    setIdIntento(null);
                  } catch (error: any) {
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
      
      {/* MODAL DE ÉXITO - DOCUMENTOS CORREGIDOS */}
      {showCorrectionsSuccessModal && (
        <div className="absolute inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-green-600 text-5xl">check_circle</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">¡Éxito!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line">{correctionsMessage}</p>
              <button
                onClick={() => setShowCorrectionsSuccessModal(false)}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL DE ERROR - DOCUMENTOS CORREGIDOS */}
      {showCorrectionsErrorModal && (
        <div className="absolute inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-600 text-5xl">error</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Error</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{correctionsMessage}</p>
              <button
                onClick={() => setShowCorrectionsErrorModal(false)}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENÉRICO DE ALERTAS */}
      {showAlertModal && (
        <div className="absolute inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                alertType === 'success' ? 'bg-green-100' : 
                alertType === 'error' ? 'bg-red-100' : 
                alertType === 'warning' ? 'bg-yellow-100' : 
                'bg-blue-100'
              }`}>
                <span className={`material-symbols-outlined text-5xl ${
                  alertType === 'success' ? 'text-green-600' : 
                  alertType === 'error' ? 'text-red-600' : 
                  alertType === 'warning' ? 'text-yellow-600' : 
                  'text-blue-600'
                }`}>
                  {alertType === 'success' ? 'check_circle' : 
                   alertType === 'error' ? 'error' : 
                   alertType === 'warning' ? 'warning' : 
                   'info'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {alertType === 'success' ? '¡Éxito!' : 
                 alertType === 'error' ? 'Error' : 
                 alertType === 'warning' ? 'Atención' : 
                 'Información'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line">{alertMessage}</p>
              <button
                onClick={() => setShowAlertModal(false)}
                className={`w-full px-6 py-3 text-white rounded-xl font-bold ${
                  alertType === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                  alertType === 'error' ? 'bg-red-600 hover:bg-red-700' : 
                  alertType === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' : 
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LICENCIA DIGITAL */}
      {showDigitalLicense && selectedLicense && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={(e) => e.target === e.currentTarget && setShowDigitalLicense(false)}>
            <div className="w-full max-w-sm relative perspective-1000 animate-in zoom-in duration-300">
                
                {/* TARJETA DE LICENCIA - ESTILO REALISTA */}
                <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl transform transition-transform border border-gray-200">
                    
                    {/* ENCABEZADO - GOBIERNO */}
                    <div className="bg-[#1F2937] text-white p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <div className="flex justify-between items-center relative z-10">
                            <img src={durangoLogo} className="h-8 invert opacity-90" alt="Gobierno de Durango" />
                            <div className="text-right">
                                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Estados Unidos Mexicanos</p>
                                <p className="text-[10px] font-black uppercase tracking-wider">Gobierno del Estado de Durango</p>
                            </div>
                        </div>
                    </div>

                    {/* CUERPO DE LA LICENCIA */}
                    <div className="p-5 relative">
                        {/* Marca de agua de seguridad */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
                             <img src={durangoLogo} className="w-48 grayscale" />
                        </div>

                        <div className="relative z-10 flex flex-col gap-4">
                            {/* FOTO y TIPO */}
                            <div className="flex justify-between items-start">
                                <div className="w-32 h-40 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 shadow-md relative">
                                    {userDataFresh.photo ? (
                                        <img src={userDataFresh.photo} className="w-full h-full object-cover" alt="Foto Conductor" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                            <span className="material-symbols-outlined text-6xl">person</span>
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm text-center py-1">
                                        <p className="text-[10px] text-white font-bold uppercase tracking-wider">Conductor</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                     <div className="text-right">
                                        <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider mb-0.5">Tipo de Licencia</p>
                                        <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-sm inline-block">
                                             <span className="text-3xl font-black">{selectedLicense.type === 'Automovilista' ? 'A' : 'M'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right mt-2">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">No. de Licencia</p>
                                        <p className="text-xl font-black text-gray-900 font-mono tracking-tight">{selectedLicense.folio || 'S/N'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* DATOS */}
                            <div className="space-y-3 pt-2">
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Nombre</p>
                                    <p className="text-lg font-bold text-gray-900 leading-tight uppercase">
                                        {userDataFresh?.nombres} {userDataFresh?.apellidopaterno} {userDataFresh?.apellidomaterno}
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Nacionalidad</p>
                                        <p className="text-sm font-bold text-gray-900">N/A</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Tipo Sangre</p>
                                        <p className="text-sm font-bold text-gray-900 text-red-600">N/A</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">RFC</p>
                                        <p className="text-xs font-bold text-gray-900">N/A</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 border-t border-gray-100 pt-3 mt-1">
                                    <div className="flex-1 space-y-3">
                                        <div className="grid grid-cols-1 gap-0.5">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Fecha de Expedición</p>
                                            <p className="text-sm font-bold text-gray-900 capitalize leading-tight">
                                                {new Date(selectedLicense.rawData?.creacion || Date.now()).toLocaleDateString('es-MX', {day: 'numeric', month: 'long', year: 'numeric'})}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-0.5">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Vigencia</p>
                                            <p className="text-sm font-bold text-gray-900 capitalize leading-tight">
                                                {selectedLicense.rawData?.vigencia 
                                                    ? new Date(selectedLicense.rawData.vigencia).toLocaleDateString('es-MX', {day: 'numeric', month: 'long', year: 'numeric'})
                                                    : new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toLocaleDateString('es-MX', {day: 'numeric', month: 'long', year: 'numeric'})
                                                }
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-0.5">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Antigüedad</p>
                                            <p className="text-sm font-bold text-gray-900 capitalize leading-tight">
                                                {new Date(selectedLicense.rawData?.creacion || Date.now()).toLocaleDateString('es-MX', {day: 'numeric', month: 'long', year: 'numeric'})}
                                            </p>
                                        </div>
                                    </div>

                                    {/* QR CODE - ALADO DE FECHAS */}
                                    <div className="flex-shrink-0 flex items-center justify-center pl-2 border-l border-gray-100">
                                        <div className="w-28 h-28 bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`LICENCIA-DGO:${selectedLicense.folio}|USR:${userDataFresh.id}|${userDataFresh.curp}`)}`} 
                                                className="w-full h-full object-contain" 
                                                alt="QR de Validación"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER - SOLO FIRMAS */}
                        <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-100 flex items-end justify-between gap-8 relative z-10 px-4 pb-4">
                            {/* FIRMA DIGITAL */}
                            <div className="flex-1 flex flex-col items-center justify-end">
                                <div className="h-16 w-full flex items-end justify-center pb-2 border-b border-gray-400 mb-1 relative">
                                   <p className="text-4xl text-gray-800 text-center w-full transform -rotate-2" style={{ fontFamily: '"Monsieur La Doulaise", cursive', lineHeight: '1' }}>
                                        {userDataFresh?.nombres?.split(' ')[0]} {userDataFresh?.apellidopaterno}
                                   </p>
                                </div>
                                <p className="text-[7px] text-center font-bold text-gray-500 uppercase tracking-wider">Firma del Titular</p>
                            </div>

                            {/* FIRMA SECRETARIO */}
                            <div className="flex-1 flex flex-col items-center justify-end">
                                <div className="h-12 w-full flex items-end justify-center pb-1 border-b border-gray-400 mb-1 relative overflow-hidden">
                                     <svg viewBox="0 0 140 50" className="w-full h-full opacity-80" preserveAspectRatio="none">
                                        <path d="M10,40 C30,10 50,60 70,30 S110,10 130,40" stroke="#1f2937" strokeWidth="2" fill="none" />
                                        <path d="M20,25 Q60,50 90,20" stroke="#1f2937" strokeWidth="1.5" fill="none" />
                                     </svg>
                                </div>
                                <p className="text-[7px] text-center font-bold text-gray-500 uppercase tracking-wider">Secretario de Movilidad</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* BANDA INFERIOR */}
                    <div className="bg-[#B91C1C] h-3 w-full"></div>
                </div>

                {/* BOTÓN CERRAR */}
                <button onClick={() => setShowDigitalLicense(false)} className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">close</span> Cerrar Vista Previa
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

export default DashboardScreen;