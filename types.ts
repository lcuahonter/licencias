export enum AppStep {
  WELCOME = 'welcome',
  REGISTRATION = 'registration',
  DOCUMENTS = 'documents',
  BIOMETRICS = 'biometrics',
  REVIEW = 'review',
  DASHBOARD = 'dashboard',
  COMPLETE_PROFILE = 'complete_profile',
  APPOINTMENT = 'appointment',
  PAYMENT = 'payment',
  SUCCESS = 'success',
  OPERATOR_DASHBOARD = 'operator_dashboard',
  ADMIN_DASHBOARD = 'admin_dashboard'
}

export type LicenseType = 'Automovilista' | 'Motociclista' | 'Transporte Público';;
export type ProcessType = 'Primera Vez' | 'Refrendo' | 'Reposición';

// Estatus posibles de la solicitud
export type RequestStatus = 'pending_payment' | 'paid_pending_docs' | 'rejected' | 'completed';

export interface LicenseRequest {
  id: string;
  type: LicenseType;
  process: ProcessType;
  cost: number;
  date: string;
  status: RequestStatus;
  folio: string;
  
  // NUEVO: Lista de documentos rechazados (ej: ['ineFront', 'photo'])
  // Esto es necesario para el modal de corrección
  rejectedDocuments?: string[]; 
  
  // NUEVO: Datos crudos del endpoint /api/solicitudes/solicitudesByIdUsuario
  rawData?: any;
}

export interface UserData {
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  birthDate: string;
  licenseType: string;
  validityDuration: string;
  bloodGroup: string;
  organDonor: boolean;
  
  photo?: string;
  documents?: {
    ineFront?: string;
    ineBack?: string;
    addressProof?: string;
  };

  // Datos Complementarios
  address?: string;
  colony?: string;
  zipCode?: string;
  municipality?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalConditions?: string;

  // Token de sesión (JWT) para llamadas autenticadas
  token?: string;

  // Perfil (Incompleto / Completo) proveniente del backend
  perfil?: string;

  // Lista de Solicitudes
  requests: LicenseRequest[]; 

  appointment?: {
    date: string;
    time: string;
    location: string;
  };
  payment?: {
    amount: number;
    reference: string;
    date: string;
  };
}