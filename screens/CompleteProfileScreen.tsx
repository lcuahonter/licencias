import React, { useState, useEffect, useRef } from 'react';
import { UserData } from '../types';
// Corregimos los imports para que sean relativos estándar
import { userService } from '../src/api/userService';
import { catalogService } from '../src/api/catalogService';
import { getGenderFromCurp } from '../src/utils/curpHelpers';
import intlTelInput from 'intl-tel-input';
import 'intl-tel-input/build/css/intlTelInput.css';
import ReactSelect from 'react-select';

const NATIONALITY_OPTIONS = [
  'AFGANA','ALBANESA','ALEMANA','ANDORRANA','ANGOLEÑA','ANTIGUENSE','ÁRABE EMIRATENSE','ARGELINA',
  'ARGENTINA','ARMENIA','AUSTRALIANA','AUSTRIACA','AZERBAIYANA','BAHAMEÑA','BANGLADESÍ','BARBADIENSE',
  'BAREINÍ','BELGA','BELICEÑA','BENINESA','BIELORRUSA','BIRMANA','BOLIVIANA','BOSNIA-HERZEGOVINIA',
  'BOTSUANIANA','BRASILEÑA','BRUNEIANA','BÚLGARA','BURKINESA','BURUNDESA','BUTANESA','CABOVERDIANA',
  'CAMBOYENSE','CAMERUNESA','CANADIENSE','CATARÍ','CHADIANA','CHILENA','CHINA','CHIPRIOTA',
  'COLOMBIANA','COMORENSE','CONGOLEÑA','COSTARRICENSE','CROATA','CUBANA','DANESA','DOMINICANA',
  'ECUATOGUINEANA','ECUATORIANA','EGIPCIA','ERITREA','ESLOVACA','ESLOVENA','ESPAÑOLA','ESTADOUNIDENSE',
  'ESTONIA','ETÍOPE','FIYIANA','FILIPINA','FINLANDESA','FRANCESA','GABONESA','GAMBIANA',
  'GEORGIANA','GHANESA','GRANADINA','GRIEGA','GUATEMALTECA','GUINEANA','GUINEA-BISAUENSE','GUYANESA',
  'HAITIANA','HONDUREÑA','HÚNGARA','INDIA','INDONESIA','IRANÍ','IRAQUÍ','IRLANDESA',
  'ISLANDESA','ISRAELÍ','ITALIANA','JAMAICANA','JAPONESA','JORDANA','KAZAJA','KENIANA',
  'KIRGUÍS','KIRIBATIANA','KUWAITÍ','LAOSIANA','LESOTENSE','LETONA','LIBERIANA','LIBIA',
  'LIECHTENSTENIENSE','LITUANA','LUXEMBURGUESA','MACEDÓNICA','MALGACHE','MALASIA','MALAUIANA','MALDIVIANA',
  'MALENSE','MALTESA','MARFILEÑA','MARROQUÍ','MAURICIANA','MAURITANA','MEXICANA','MICRONESIA',
  'MOLDAVA','MONAGUESCA','MONGOLA','MONTENEGRINA','MOZAMBIQUEÑA','NAMIBIA','NAURUANA','NEPALESA',
  'NICARAGÜENSE','NIGERIANA','NIGERINA','NORCOREANA','NORUEGA','NEOZELANDESA','OMANÍ','PAKISTANÍ',
  'PALAUANA','PALESTINA','PANAMEÑA','PAPUANA','PARAGUAYA','PERUANA','POLACA','PORTUGUESA',
  'RUANDESA','RUMANA','RUSA','SAMOANA','SANMARINENSE','SANTOTOMENSE','SAUDÍ','SENEGALESA',
  'SERBIA','SEYCHELLENSE','SIERRALEONESA','SINGAPURENSE','SIRIA','SOMALÍ','CEILANESA','SUDAFRICANA',
  'SUDANESA','SUDANSURENSE','SUECA','SUIZA','SURINAMESA','SWAZI','TAILANDESA','TANZANA',
  'TAYIKA','TIMORENSE','TOGOLESA','TONGANA','TRINITARIA','TUNECINA','TURCA','TURCOMANA',
  'TUVALUANA','UGANDESA','UCRANIANA','URUGUAYA','UZBEKA','VANUATENSE','VENEZOLANA','VIETNAMITA',
  'YEMENÍ','YIBUTIANA','ZAMBIANA','ZIMBABUENSE',
].map(n => ({ value: n, label: n }));


interface CompleteProfileScreenProps {
    userData: UserData;
    idUsuario: number;
    token?: string;
    onSessionExpired?: () => void;
    onBack: () => void;
    onSave: (data: Partial<UserData>) => void;
}

// --- COMPONENTES UI (Helpers) ---

const InputField = ({ label, value, onChange, placeholder, width = 'full', numeric = false, max = 50, readOnly = false, error, innerRef }: any) => (
    <div className={`space-y-1 ${width === 'half' ? 'col-span-1' : 'col-span-2'}`}>
        <label className={`text-[10px] font-bold uppercase ml-1 ${error ? 'text-red-500' : 'text-gray-500'}`}>
            {label}
        </label>
        <div className="relative">
            <input
                ref={innerRef}
                value={value || ''}
                onChange={(e) => {
                    if (readOnly) return;
                    onChange(e.target.value);
                }}
                maxLength={max}
                placeholder={placeholder}
                inputMode={numeric ? 'numeric' : 'text'}
                readOnly={readOnly}
                className={`w-full h-12 px-4 rounded-xl border-2 outline-none font-bold text-sm transition-all uppercase truncate
                ${readOnly
                        ? 'bg-gray-100 dark:bg-gray-900 border-gray-200 text-gray-500 cursor-not-allowed'
                        : error
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-500 text-red-900 focus:border-red-600'
                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 focus:border-primary text-gray-900 dark:text-white'
                    }`}
            />
            {readOnly && <span className="material-symbols-outlined absolute right-3 top-3 text-gray-400 text-sm">lock</span>}
            {!readOnly && error && <span className="material-symbols-outlined absolute right-3 top-3 text-red-500 text-sm">error</span>}
        </div>
        {error && <p className="text-[9px] text-red-500 font-bold ml-2 animate-in slide-in-from-top-1">{error}</p>}
    </div>
);

const PhoneInput = ({ phoneValue, ladaValue, onPhoneChange, onLadaChange, label = 'Teléfono', error }: any) => {
    const itiContainerRef = useRef<HTMLDivElement>(null); // div vacío - React NO renderiza hijos aquí
    const itiRef = useRef<any>(null);
    const onLadaChangeRef = useRef(onLadaChange);
    onLadaChangeRef.current = onLadaChange;

    useEffect(() => {
        if (!itiContainerRef.current || itiRef.current) return;

        // Input imperativo — React nunca lo toca
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'tel';
        hiddenInput.tabIndex = -1;
        hiddenInput.style.cssText = 'width:0;height:48px;opacity:0;border:none;padding:0;margin:0;outline:none;background:transparent;position:absolute;';
        itiContainerRef.current.appendChild(hiddenInput);

        itiRef.current = intlTelInput(hiddenInput, {
            initialCountry: 'mx',
            separateDialCode: true,
            dropdownContainer: document.body,
        } as any);

        const handleCountryChange = () => {
            const data = itiRef.current?.getSelectedCountryData();
            if (data) onLadaChangeRef.current('+' + data.dialCode);
        };
        hiddenInput.addEventListener('countrychange', handleCountryChange);

        return () => {
            hiddenInput.removeEventListener('countrychange', handleCountryChange);
            itiRef.current?.destroy();
            itiRef.current = null;
        };
    }, []);

    return (
        <div className="col-span-2 space-y-1">
            <label className={`text-[10px] font-bold uppercase ml-1 ${error ? 'text-red-500' : 'text-gray-500'}`}>
                {label}
            </label>
            <div className={`flex items-center rounded-xl border-2 h-12 transition-all ${
                error ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}>
                {/* Div imperativo: ancho automático según el prefijo seleccionado */}
                <div ref={itiContainerRef} className="phone-iti-wrap relative shrink-0 h-full" />
                {/* Nuestro input real: 100% React, sin ninguna libreria tocando su valor */}
                <input
                    type="tel"
                    inputMode="numeric"
                    value={phoneValue || ''}
                    onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10 dígitos"
                    className={`flex-1 h-full pl-3 pr-2 bg-transparent outline-none font-bold text-sm ${
                        error ? 'text-red-900' : 'text-gray-900 dark:text-white'
                    }`}
                />
            </div>
            {error && <p className="text-[9px] text-red-500 font-bold ml-2">{error}</p>}
        </div>
    );
};

// --- MAIN COMPONENT ---

const CompleteProfileScreen: React.FC<CompleteProfileScreenProps> = ({ userData, idUsuario, token, onBack, onSave }) => {

    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [coloniesList, setColoniesList] = useState<{ id: number, localidad: string, municipio: string }[]>([]);
    const [emergColoniesList, setEmergColoniesList] = useState<{ id: number, localidad: string, municipio: string }[]>([]);

    const [form, setForm] = useState({
        // Datos Personales
        firstName: userData.firstName || '',
        paternalName: userData.paternalName || '',
        maternalName: userData.maternalName || '',
        rfc: '',
        curp: userData.idNumber || '',
        email: userData.email || '',
        nationality: (() => {
            const c = (userData.idNumber || '').toUpperCase();
            if (c.length >= 13) return c.substring(11, 13) === 'NE' ? '' : 'MEXICANA';
            return '';
        })(),
        gender: '',
        bloodType: '',
        isDonor: false,
        workplace: '',
        restrictions: '',
        medicalNotes: userData.medicalConditions || '',

        // Domicilio
        address: userData.address || '',
        zipCode: userData.zipCode || '',
        colony: '',           // Ahora será el ID del catálogo
        colonyId: 0,          // ID de la colonia seleccionada del catálogo
        colonyName: userData.colony || '', // Nombre de la colonia
        municipality: userData.municipality || '',
        locality: '',         // Ahora será campo de texto libre
        state: 'DURANGO',
        phoneLada: '+52',
        phone: userData.phone || '',

        // Emergencia
        emergFirstName: '',
        emergPaternal: '',
        emergMaternal: '',
        emergAddress: '',
        emergZipCode: '',
        emergColony: '',      // Ahora será el ID del catálogo
        emergColonyId: 0,     // ID de la colonia de emergencia
        emergColonyName: '',  // Nombre de la colonia
        emergMunicipality: '',
        emergLocality: '',    // Ahora será campo de texto libre
        emergPhoneLada: '+52',
        emergPhone: userData.emergencyPhone || ''
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Modal genérico para alertas
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const inputRefs = {
        rfc: useRef<HTMLInputElement>(null),
        workplace: useRef<HTMLInputElement>(null),
        address: useRef<HTMLInputElement>(null),
        zipCode: useRef<HTMLInputElement>(null),
        colony: useRef<HTMLSelectElement>(null),        // Ahora es SELECT
        municipality: useRef<HTMLSelectElement>(null),
        locality: useRef<HTMLInputElement>(null),       // Ahora es INPUT de texto
        phone: useRef<HTMLInputElement>(null),
        emergFirstName: useRef<HTMLInputElement>(null),
        emergPaternal: useRef<HTMLInputElement>(null),
        emergAddress: useRef<HTMLInputElement>(null),
        emergZipCode: useRef<HTMLInputElement>(null),
        emergColony: useRef<HTMLSelectElement>(null),   // Ahora es SELECT
        emergLocality: useRef<HTMLInputElement>(null),  // Ahora es INPUT de texto
        emergPhone: useRef<HTMLInputElement>(null),
    };

    // --- 1. CARGA DE DATOS (GET) ---
    useEffect(() => {
        const fetchUserData = async () => {
            if (!idUsuario) return;

            setIsLoadingData(true);
            try {
                // Usamos el servicio. Enviamos token si está disponible
                const json = await userService.getUsuarioById(idUsuario, token);

                if (json.data && json.data.usuario) {
                    const userAPI = json.data.usuario;
                    setForm(prev => ({
                        ...prev,
                        firstName: userAPI.nombres || prev.firstName,
                        paternalName: userAPI.apellidopaterno || prev.paternalName,
                        maternalName: userAPI.apellidomaterno || prev.maternalName,
                        rfc: userAPI.rfc || prev.rfc,
                        curp: userAPI.curp || prev.curp,
                        email: userAPI.email || prev.email,
                        gender: userAPI.sexo === 'Femenino' ? 'F' : userAPI.sexo === 'Masculino' ? 'M' : prev.gender,
                        phone: userAPI.telefono || prev.phone,
                    }));
                }
            } catch (error) {
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchUserData();
    }, [idUsuario]);

    // --- HANDLERS ---
    const handleSafeInput = (field: string, rawValue: string, type: 'text' | 'alphanumeric' | 'numeric' | 'address' = 'alphanumeric') => {
        let value = rawValue.toUpperCase();
        value = value.replace(/['";\\]/g, "").replace(/--/g, "");
        let isValid = true;
        switch (type) {
            case 'text': if (!/^[A-ZÑ\s]*$/.test(value)) isValid = false; break;
            case 'numeric': if (!/^\d*$/.test(value)) isValid = false; break;
            case 'address': if (!/^[A-Z0-9Ñ\s#.\-\/]*$/.test(value)) isValid = false; break;
            case 'alphanumeric': if (!/^[A-Z0-9Ñ\s]*$/.test(value)) isValid = false; break;
        }
        if (isValid) {
            setForm(prev => ({ ...prev, [field]: value }));
            if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
        }
    };

    const handleLocalitySelect = (id: string, isEmergency: boolean) => {
        const selectedId = Number(id);
        if (isEmergency) {
            const item = emergColoniesList.find(i => i.id === selectedId);
            if (item) {
                setForm(prev => ({ ...prev, emergColony: item.localidad, emergColonyId: item.id, emergColonyName: item.localidad }));
                setErrors(prev => { const n = { ...prev }; delete n.emergColony; return n; });
            }
        } else {
            const item = coloniesList.find(i => i.id === selectedId);
            if (item) {
                setForm(prev => ({ ...prev, colony: item.localidad, colonyId: item.id, colonyName: item.localidad }));
                setErrors(prev => { const n = { ...prev }; delete n.colony; return n; });
            }
        }
    };

    // --- 2. CARGA DE CP (CATALOGO) ---
    const fetchZipData = async (cp: string, isEmergency: boolean) => {
        try {
            const data = await catalogService.getLocalidadByCP(cp);

            if (!data || data.code === "204" || (Object.keys(data).length === 0)) {
                if (isEmergency) {
                    setErrors(prev => ({ ...prev, emergZipCode: "CP no encontrado" }));
                    setEmergColoniesList([]);
                    setForm(prev => ({ ...prev, emergMunicipality: '', emergColony: '', emergColonyId: 0, emergColonyName: '' }));
                } else {
                    setErrors(prev => ({ ...prev, zipCode: "CP no encontrado" }));
                    setColoniesList([]);
                    setForm(prev => ({ ...prev, municipality: '', colony: '', colonyId: 0, colonyName: '' }));
                }
                return;
            }

            if (data.code === "200" && data.data && data.data.catCPs.length > 0) {
                const list = data.data.catCPs;
                const firstRecord = list[0];
                if (isEmergency) {
                    setEmergColoniesList(list);
                    setForm(prev => ({ ...prev, emergMunicipality: firstRecord.municipio.toUpperCase(), emergColony: '', emergColonyId: 0, emergColonyName: '', emergState: 'DURANGO' }));
                    setErrors(prev => { const n = { ...prev }; delete n.emergZipCode; return n; });
                } else {
                    setColoniesList(list);
                    setForm(prev => ({ ...prev, municipality: firstRecord.municipio.toUpperCase(), colony: '', colonyId: 0, colonyName: '', state: 'DURANGO' }));
                    setErrors(prev => { const n = { ...prev }; delete n.zipCode; return n; });
                }
            }
        } catch (error) {
        }
    };

    useEffect(() => {
        if (form.zipCode.length === 5) fetchZipData(form.zipCode, false);
        else setColoniesList([]);
    }, [form.zipCode]);

    useEffect(() => {
        if (form.emergZipCode.length === 5) fetchZipData(form.emergZipCode, true);
        else setEmergColoniesList([]);
    }, [form.emergZipCode]);

    // Auto-generar RFC desde CURP (primeros 10 caracteres)
    useEffect(() => {
        if (form.curp && form.curp.length >= 10) {
            const rfcFromCurp = form.curp.substring(0, 10).toUpperCase();
            setForm(prev => ({ ...prev, rfc: rfcFromCurp }));
        }
    }, [form.curp]);

    // Auto-detectar sexo desde CURP
    useEffect(() => {
        if (form.curp && form.curp.length >= 11) {
            const gender = getGenderFromCurp(form.curp);
            if (gender) {
                setForm(prev => ({ ...prev, gender }));
                // Limpiar error de género si existía
                if (errors.gender) {
                    setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.gender;
                        return newErrors;
                    });
                }
            }
        }
    }, [form.curp]);

    // Auto-detectar nacionalidad desde CURP (posiciones 12-13, índice 11-12)
    useEffect(() => {
        if (form.curp && form.curp.length >= 13) {
            const estadoCurp = form.curp.substring(11, 13).toUpperCase();
            const newNationality = estadoCurp === 'NE' ? '' : 'MEXICANA';
            setForm(prev => ({ ...prev, nationality: newNationality }));
            if (newNationality && errors.nationality) {
                setErrors(prev => { const n = { ...prev }; delete n.nationality; return n; });
            }
        }
    }, [form.curp]);

    const validateRFC = (rfc: string) => {
        // Acepta 10 caracteres (sin homoclave) o 13 (con homoclave)
        const rfcRegex = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{0,3})$/;
        if (!rfc) return "Requerido";
        if (rfc.length !== 10 && rfc.length !== 13) return "Debe tener 10 o 13 caracteres";
        if (!rfcRegex.test(rfc)) return "Formato inválido";
        return null;
    };

    const focusOnError = (errorList: any) => {
        const errorKeys = Object.keys(errorList);
        if (errorKeys.length === 0) return;

        const fieldOrder = [
            'rfc',
            'address', 'zipCode', 'colony', 'locality', 'phone',
            'emergFirstName', 'emergPaternal', 'emergAddress', 'emergZipCode', 'emergColony', 'emergLocality', 'emergPhone'
        ];

        const firstErrorField = fieldOrder.find(field => errorKeys.includes(field));

        if (firstErrorField) {
            // @ts-ignore
            const ref = inputRefs[firstErrorField];
            if (ref && ref.current) {
                ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    ref.current.focus();
                }, 100);
            }
        }
    };

    const validateStep = (step: number) => {
        const newErrors: any = {};
        let isValid = true;

        if (step === 1) {
            const rfcError = validateRFC(form.rfc);
            if (rfcError) newErrors.rfc = rfcError;
            if (!form.gender) newErrors.gender = 'Selecciona el sexo';
            if (!form.nationality) newErrors.nationality = 'Selecciona la nacionalidad';
            if (!form.bloodType) newErrors.bloodType = 'Selecciona el tipo de sangre';
        }

        if (step === 2) {
            if (!form.address.trim()) newErrors.address = 'Requerido';
            if (!form.zipCode || form.zipCode.length !== 5) newErrors.zipCode = '5 dígitos';
            if (!form.colony) newErrors.colony = 'Requerido';
            if (!form.municipality.trim()) newErrors.municipality = 'Requerido';
            if (!form.locality.trim()) newErrors.locality = 'Requerido';
            if (!form.phone.trim()) newErrors.phone = 'Requerido';
        }

        if (step === 3) {
            if (!form.emergFirstName.trim()) newErrors.emergFirstName = 'Requerido';
            if (!form.emergPaternal.trim()) newErrors.emergPaternal = 'Requerido';
            if (!form.emergPhone.trim()) newErrors.emergPhone = 'Requerido';
            if (!form.emergAddress.trim()) newErrors.emergAddress = 'Requerido';
            if (!form.emergZipCode || form.emergZipCode.length !== 5) newErrors.emergZipCode = '5 dígitos';
            if (!form.emergColony) newErrors.emergColony = 'Requerido';
            if (!form.emergLocality.trim()) newErrors.emergLocality = 'Requerido';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            isValid = false;
            focusOnError(newErrors);
        }
        return isValid;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setErrors({});
            setCurrentStep(prev => prev + 1);
        }
    };

    // --- 3. GUARDADO (UPDATE) ---
    const handleSave = async () => {
        if (!validateStep(3)) return;

        setIsSubmitting(true);

        try {
            const payload = {
                idUsuario: idUsuario,
                rfc: form.rfc,
                domicilio: form.address,
                colonia: form.colonyName,            // Nombre de la colonia
                cp: form.colonyId,                   // ID del CP (mismo que colonia)
                id_cp: form.colonyId,                // ID del CP
                municipio: form.municipality,
                localidad: form.locality,            // Texto libre
                entidad: "DURANGO",
                nacionalidad: form.nationality,
                sexo: form.gender === 'M' ? 'Masculino' : 'Femenino',
                tipoSangre: form.bloodType,
                donador: form.isDonor ? "Si" : "No",
                lugarTrabajo: form.workplace,
                restricciones: form.restrictions || "Ninguna",
                observaciones: form.medicalNotes || "Ninguna",
                conocidoNombre: form.emergFirstName,
                conocidoApellidoPaterno: form.emergPaternal,
                conocidoApellidoMaterno: form.emergMaternal,
                conocidoDomicilio: form.emergAddress,
                conocidoCp: form.emergColonyId,      // ID de la colonia de emergencia
                conocidoIdCp: form.emergColonyId,    // ID del CP
                conocidoColonia: form.emergColonyName, // Nombre de la colonia
                conocidoMunicipio: form.emergMunicipality,
                conocidoLocalidad: form.emergLocality, // Texto libre
                conocidoTelefono: `${form.emergPhoneLada} ${form.emergPhone}`,
                telefono: `${form.phoneLada} ${form.phone}`
            };

            // Llamada limpia al servicio
            const data = await userService.updateUsuario(payload, token);

            // Re-obtenemos el usuario para asegurarnos del estado del perfil (Incompleto -> Completo)
            try {
                const refreshed = await userService.getUsuarioById(idUsuario, token);
                const userAPI = refreshed?.data?.usuario ?? refreshed?.data ?? null;
                const payload: Partial<any> = {
                    firstName: userAPI?.nombres || form.firstName,
                    lastName: userAPI?.apellidopaterno ? `${userAPI.apellidopaterno} ${userAPI?.apellidomaterno || ''}`.trim() : form.paternalName,
                    idNumber: userAPI?.curp || form.curp,
                    email: userAPI?.email || form.email,
                    address: userAPI?.domicilio || form.address,
                    phone: userAPI?.telefono || form.phone,
                    perfil: userAPI?.perfil || 'Completo'
                };
                onSave(payload);
            } catch (rferr) {
                onSave(form);
            }

        } catch (error: any) {
            setAlertMessage(error.message || 'Error al actualizar perfil');
            setAlertType('error');
            setShowAlertModal(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) {
        return (
            <div className="flex flex-col h-full bg-gray-50 dark:bg-background-dark items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-gray-500 animate-pulse">Obteniendo información del usuario...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-background-dark">

            <header className="px-6 pt-8 pb-4 bg-white dark:bg-surface-dark shadow-sm sticky top-0 z-10 safe-top">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={currentStep > 1 ? () => setCurrentStep(prev => prev - 1) : onBack} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 hover:bg-gray-200">
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-black text-gray-900 dark:text-white">Completar Perfil</h1>
                </div>
                <div className="flex items-center justify-between px-2">
                    {[1, 2, 3].map(step => (
                        <div key={step} className="flex flex-col items-center gap-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep >= step ? 'bg-primary text-white shadow-lg shadow-blue-500/30' : 'bg-gray-200 text-gray-400'}`}>
                                {step}
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                {step === 1 ? 'Personal' : step === 2 ? 'Domicilio' : 'Emergencia'}
                            </span>
                        </div>
                    ))}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">

                {currentStep === 1 && (
                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-right">
                        <InputField label="Nombre(s)" value={form.firstName} readOnly={true} />
                        <InputField label="Apellido Paterno" value={form.paternalName} readOnly={true} width="half" />
                        <InputField label="Apellido Materno" value={form.maternalName} readOnly={true} width="half" />
                        <InputField label="CURP" value={form.curp} readOnly={true} />
                        <InputField label="Correo" value={form.email} readOnly={true} />

                        <InputField innerRef={inputRefs.rfc} label="RFC (Homoclave Opcional)" value={form.rfc} onChange={(val: string) => handleSafeInput('rfc', val, 'alphanumeric')} placeholder="AAAA990101 o AAAA990101XXX" width="half" max={13} error={errors.rfc} />

                        <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-bold uppercase ml-1 text-gray-500">Sexo</label>
                            <div className="relative">
                                <select value={form.gender} disabled className="w-full h-12 px-3 rounded-xl bg-gray-100 dark:bg-gray-900 border-2 border-gray-200 text-gray-500 outline-none font-bold cursor-not-allowed">
                                    <option value="" disabled>-- Selecciona --</option>
                                    <option value="F">FEMENINO</option>
                                    <option value="M">MASCULINO</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-3 text-gray-400 text-sm pointer-events-none">lock</span>
                            </div>
                        </div>
                        <div className="col-span-1 space-y-1">
                            <label className={`text-[10px] font-bold uppercase ml-1 ${errors.nationality ? 'text-red-500' : 'text-gray-500'}`}>Nacionalidad</label>
                            <ReactSelect
                                options={NATIONALITY_OPTIONS}
                                value={form.nationality ? { value: form.nationality, label: form.nationality } : null}
                                onChange={(opt: any) => {
                                    setForm(prev => ({ ...prev, nationality: opt?.value || '' }));
                                    if (opt?.value && errors.nationality) setErrors((p: any) => { const n = {...p}; delete n.nationality; return n; });
                                }}
                                placeholder="-- Seleccione --"
                                isClearable
                                isSearchable
                                noOptionsMessage={() => 'Sin resultados'}
                                styles={{
                                    control: (base: any, state: any) => ({
                                        ...base,
                                        minHeight: '48px',
                                        borderRadius: '0.75rem',
                                        borderWidth: '2px',
                                        borderColor: errors.nationality ? '#ef4444' : state.isFocused ? '#6366f1' : '#f3f4f6',
                                        boxShadow: 'none',
                                        backgroundColor: errors.nationality ? '#fef2f2' : 'white',
                                        fontWeight: '700',
                                        fontSize: '0.875rem',
                                        '&:hover': { borderColor: errors.nationality ? '#ef4444' : '#6366f1' },
                                    }),
                                    valueContainer: (base: any) => ({ ...base, padding: '0 12px' }),
                                    singleValue: (base: any) => ({ ...base, color: errors.nationality ? '#7f1d1d' : '#111827' }),
                                    placeholder: (base: any) => ({ ...base, color: '#9ca3af', fontWeight: '400' }),
                                    menu: (base: any) => ({ ...base, borderRadius: '0.75rem', zIndex: 9999 }),
                                    option: (base: any, state: any) => ({
                                        ...base,
                                        fontWeight: '600',
                                        fontSize: '0.875rem',
                                        backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#e0e7ff' : 'white',
                                        color: state.isSelected ? 'white' : '#111827',
                                    }),
                                    indicatorSeparator: () => ({ display: 'none' }),
                                }}
                            />
                            {errors.nationality && <p className="text-[9px] text-red-500 font-bold ml-2 animate-in slide-in-from-top-1">{errors.nationality}</p>}
                        </div>
                        <div className="col-span-1 space-y-1">
                            <label className={`text-[10px] font-bold uppercase ml-1 ${errors.bloodType ? 'text-red-500' : 'text-gray-500'}`}>Tipo Sangre</label>
                            <select value={form.bloodType} onChange={(e) => { setForm({ ...form, bloodType: e.target.value }); if (errors.bloodType) setErrors(p => { const n = {...p}; delete n.bloodType; return n; }); }} className={`w-full h-12 px-3 rounded-xl bg-white dark:bg-gray-800 border-2 outline-none font-bold ${errors.bloodType ? 'border-red-500 text-red-900' : 'border-gray-100 dark:border-gray-700'}`}>
                                <option value="" disabled>-- Selecciona --</option>
                                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {errors.bloodType && <p className="text-[9px] text-red-500 font-bold ml-2 animate-in slide-in-from-top-1">{errors.bloodType}</p>}
                        </div>
                        <div className="col-span-1 flex items-center h-full pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.isDonor} onChange={(e) => setForm({ ...form, isDonor: e.target.checked })} className="w-5 h-5 rounded text-primary" />
                                <span className="text-xs font-bold text-gray-600">Donador de órganos</span>
                            </label>
                        </div>
                        <InputField innerRef={inputRefs.workplace} label="Lugar de Trabajo (Opcional)" value={form.workplace} onChange={(val: string) => handleSafeInput('workplace', val, 'alphanumeric')} placeholder="Empresa o Institución" error={errors.workplace} />
                        <InputField label="Restricciones" value={form.restrictions} onChange={(val: string) => handleSafeInput('restrictions', val, 'text')} placeholder="USA LENTES" />
                        <div className="col-span-2 space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Observaciones Médicas</label><textarea value={form.medicalNotes} onChange={(e) => handleSafeInput('medicalNotes', e.target.value, 'alphanumeric')} className="w-full h-20 p-3 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 outline-none font-bold uppercase resize-none" /></div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-right">
                        <InputField innerRef={inputRefs.address} label="Calle y Número" value={form.address} onChange={(val: string) => handleSafeInput('address', val, 'address')} placeholder="AV. 20 DE NOVIEMBRE #123" error={errors.address} />
                        <InputField innerRef={inputRefs.zipCode} label="Código Postal" value={form.zipCode} onChange={(val: string) => handleSafeInput('zipCode', val, 'numeric')} placeholder="34000" numeric width="half" max={5} error={errors.zipCode} />

                        {/* COLONIA - Ahora es SELECT */}
                        <div className="col-span-1 space-y-1">
                            <label className={`text-[10px] font-bold uppercase ml-1 ${errors.colony ? 'text-red-500' : 'text-gray-500'}`}>Colonia</label>
                            {coloniesList.length > 0 ? (
                                <select
                                    // @ts-ignore
                                    ref={inputRefs.colony}
                                    value={form.colonyId || ""}
                                    onChange={(e) => handleLocalitySelect(e.target.value, false)}
                                    className={`w-full h-12 px-3 rounded-xl bg-white dark:bg-gray-800 border-2 outline-none font-bold uppercase ${errors.colony ? 'border-red-500' : 'border-gray-100 dark:border-gray-700'}`}
                                >
                                    <option value="">Seleccione...</option>
                                    {coloniesList.map(item => (
                                        <option key={item.id} value={item.id}>{item.localidad}</option>
                                    ))}
                                </select>
                            ) : (
                                <input readOnly value={form.colonyName} placeholder="" className="w-full h-12 px-4 rounded-xl bg-gray-100 dark:bg-gray-900 border-2 border-gray-200 text-gray-500 font-bold uppercase cursor-not-allowed outline-none" />
                            )}
                            {errors.colony && <p className="text-[9px] text-red-500 font-bold ml-2">{errors.colony}</p>}
                        </div>

                        <InputField label="Municipio" value={form.municipality} readOnly={true} width="half" />

                        {/* LOCALIDAD - Ahora es INPUT de texto libre */}
                        <InputField
                            innerRef={inputRefs.locality}
                            label="Localidad"
                            value={form.locality}
                            onChange={(val: string) => handleSafeInput('locality', val, 'address')}
                            placeholder="LOCALIDAD"
                            width="half"
                            error={errors.locality}
                        />

                        <InputField label="Entidad" value={form.state} readOnly={true} width="half" />
                        <PhoneInput
                            label="Teléfono"
                            phoneValue={form.phone}
                            ladaValue={form.phoneLada}
                            onLadaChange={(v: string) => setForm(prev => ({ ...prev, phoneLada: v }))}
                            onPhoneChange={(v: string) => {
                                setForm(prev => ({ ...prev, phone: v }));
                                if (v.trim()) setErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
                            }}
                            error={errors.phone}
                        />
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-right">
                        <div className="col-span-2 p-3 bg-red-50 rounded-xl mb-2 flex items-center gap-2 text-red-700"><span className="material-symbols-outlined">warning</span><p className="text-xs font-bold">En caso de accidente contactar a:</p></div>
                        <InputField innerRef={inputRefs.emergFirstName} label="Nombre(s)" value={form.emergFirstName} onChange={(val: string) => handleSafeInput('emergFirstName', val, 'text')} error={errors.emergFirstName} />
                        <InputField innerRef={inputRefs.emergPaternal} label="Apellido Paterno" value={form.emergPaternal} onChange={(val: string) => handleSafeInput('emergPaternal', val, 'text')} width="half" error={errors.emergPaternal} />
                        <InputField label="Apellido Materno" value={form.emergMaternal} onChange={(val: string) => handleSafeInput('emergMaternal', val, 'text')} width="half" />
                        <div className="col-span-2 border-t border-gray-100 my-2"></div>
                        <InputField innerRef={inputRefs.emergAddress} label="Calle y Número (Emergencia)" value={form.emergAddress} onChange={(val: string) => handleSafeInput('emergAddress', val, 'address')} error={errors.emergAddress} />
                        <InputField innerRef={inputRefs.emergZipCode} label="C.P." value={form.emergZipCode} onChange={(val: string) => handleSafeInput('emergZipCode', val, 'numeric')} placeholder="34000" numeric width="half" max={5} error={errors.emergZipCode} />

                        {/* COLONIA EMERGENCIA - Ahora es SELECT */}
                        <div className="col-span-1 space-y-1">
                            <label className={`text-[10px] font-bold uppercase ml-1 ${errors.emergColony ? 'text-red-500' : 'text-gray-500'}`}>Colonia</label>
                            {emergColoniesList.length > 0 ? (
                                <select
                                    // @ts-ignore
                                    ref={inputRefs.emergColony}
                                    value={form.emergColonyId || ""}
                                    onChange={(e) => handleLocalitySelect(e.target.value, true)}
                                    className={`w-full h-12 px-3 rounded-xl bg-white dark:bg-gray-800 border-2 outline-none font-bold uppercase ${errors.emergColony ? 'border-red-500' : 'border-gray-100 dark:border-gray-700'}`}
                                >
                                    <option value="">Seleccione...</option>
                                    {emergColoniesList.map(item => (
                                        <option key={item.id} value={item.id}>{item.localidad}</option>
                                    ))}
                                </select>
                            ) : (
                                <input readOnly value={form.emergColonyName} placeholder="" className="w-full h-12 px-4 rounded-xl bg-gray-100 dark:bg-gray-900 border-2 border-gray-200 text-gray-500 font-bold uppercase cursor-not-allowed outline-none" />
                            )}
                            {errors.emergColony && <p className="text-[9px] text-red-500 font-bold ml-2">{errors.emergColony}</p>}
                        </div>

                        <InputField label="Municipio" value={form.emergMunicipality} readOnly={true} width="half" />

                        {/* LOCALIDAD EMERGENCIA - Ahora es INPUT de texto libre */}
                        <InputField
                            innerRef={inputRefs.emergLocality}
                            label="Localidad"
                            value={form.emergLocality}
                            onChange={(val: string) => handleSafeInput('emergLocality', val, 'address')}
                            placeholder="LOCALIDAD"
                            width="half"
                            error={errors.emergLocality}
                        />

                        <PhoneInput
                            label="Teléfono de Emergencia"
                            phoneValue={form.emergPhone}
                            ladaValue={form.emergPhoneLada}
                            onLadaChange={(v: string) => setForm(prev => ({ ...prev, emergPhoneLada: v }))}
                            onPhoneChange={(v: string) => {
                                setForm(prev => ({ ...prev, emergPhone: v }));
                                if (v.trim()) setErrors(prev => { const n = { ...prev }; delete n.emergPhone; return n; });
                            }}
                            error={errors.emergPhone}
                        />
                    </div>
                )}

            </main>

            <div className="p-6 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800">
                <button onClick={currentStep === 3 ? handleSave : handleNext} disabled={isSubmitting} className={`w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}>
                    {isSubmitting ? 'Guardando...' : (currentStep === 3 ? 'Guardar Todo' : 'Siguiente')}
                    {!isSubmitting && <span className="material-symbols-outlined">{currentStep === 3 ? 'save' : 'arrow_forward'}</span>}
                </button>
            </div>

            {/* MODAL GENÉRICO DE ALERTAS */}
            {showAlertModal && (
                <div className="absolute inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 max-w-md w-full">
                        <div className="text-center">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${alertType === 'success' ? 'bg-green-100' :
                                alertType === 'error' ? 'bg-red-100' :
                                    alertType === 'warning' ? 'bg-yellow-100' :
                                        'bg-blue-100'
                                }`}>
                                <span className={`material-symbols-outlined text-5xl ${alertType === 'success' ? 'text-green-600' :
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
                                className={`w-full px-6 py-3 text-white rounded-xl font-bold ${alertType === 'success' ? 'bg-green-600 hover:bg-green-700' :
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

        </div>
    );
};

export default CompleteProfileScreen;
