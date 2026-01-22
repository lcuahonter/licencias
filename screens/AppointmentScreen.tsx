import React, { useState, useEffect } from 'react';
import { UserData } from '../types'; // Asegúrate de importar UserData
import { generateFilledApplication } from '../src/utils/pdfGenerator'; // Ajusta la ruta si es necesario

interface AppointmentScreenProps {
  userData: UserData; // <--- AGREGADO: Necesario para el PDF
  onBack: () => void;
  onConfirm: (appointmentData: { date: string; time: string; location: string }) => void;
}

const AppointmentScreen: React.FC<AppointmentScreenProps> = ({ userData, onBack, onConfirm }) => {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Estados para Modal de Alerta
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const handleGeneratePDF = async () => {
    try {
      await generateFilledApplication(userData);
    } catch (error: any) {
      setAlertMessage(error.message || 'Error al generar el documento');
      setAlertType('error');
      setShowAlertModal(true);
    }
  };

  // 1. Sedes Oficiales DURANGO (Centros Multipago y Recaudación)
  const locations = [
    { id: '1', name: 'Unidad Administrativa (Carnation)', address: 'Blvd. Luis Donaldo Colosio 200, Fracc. San Ignacio' },
    { id: '2', name: 'Centro Multipago - Paseo Durango', address: 'Blvd. Felipe Pescador 1401 (Plaza Comercial)' },
    { id: '3', name: 'Recaudación - 20 de Noviembre', address: 'Av. 20 de Noviembre 306, Zona Centro' },
    { id: '4', name: 'Macroplaza (Multicentros)', address: 'Blvd. Francisco Villa, Durango, Dgo.' },
  ];

  // 2. Horarios Gubernamentales Durango (Lunes a Viernes 8:30 - 14:30)
  const timeSlots = [
    '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00'
  ];

  // 3. Generador de Días Hábiles (Calendario Mensual Inteligente)
  const [businessDays, setBusinessDays] = useState<{ label: string, val: string }[]>([]);

  useEffect(() => {
    const days = [];
    const today = new Date();

    // Festivos en México (Formato MM-DD)
    const holidays = ['01-01', '02-05', '03-18', '05-01', '09-16', '11-18', '12-25'];

    let current = new Date(today);
    // Empezamos a contar desde mañana para no agendar hoy mismo
    current.setDate(current.getDate() + 1);

    // Generamos los próximos 30 días hábiles (aprox mes y medio real)
    while (days.length < 30) {
      const dayOfWeek = current.getDay(); // 0 = Domingo, 6 = Sábado
      const monthDay = `${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

      // Si NO es domingo (0), NI sábado (6), NI festivo
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(monthDay)) {

        const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
        let label = current.toLocaleDateString('es-MX', options);
        label = label.charAt(0).toUpperCase() + label.slice(1);
        label = label.replace('.', '');

        days.push({
          label: label,
          val: current.toISOString().split('T')[0] // YYYY-MM-DD
        });
      }
      current.setDate(current.getDate() + 1);
    }
    setBusinessDays(days);
  }, []);

  const handleConfirm = () => {
    if (selectedLocation && selectedDate && selectedTime) {
      const locationName = locations.find(l => l.id === selectedLocation)?.name || '';
      onConfirm({
        location: locationName,
        date: selectedDate,
        time: selectedTime
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark">
      <header className="flex items-center p-4 justify-between sticky top-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-lg font-bold">Agendar Cita</h2>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-24">

        <div className="py-4">
          <h1 className="text-2xl font-black mb-1">Finalizar Trámite</h1>
          <p className="text-gray-500 text-sm">Selecciona dónde y cuándo recoger tu licencia física.</p>
        </div>

        <div className="space-y-6">

          {/* SECCIÓN 1: SEDE */}
          <section>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">1. Selecciona Centro Multipago</h3>
            <div className="space-y-3">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3
                    ${selectedLocation === loc.id
                      ? 'bg-white dark:bg-surface-dark border-primary ring-1 ring-primary shadow-lg shadow-primary/10'
                      : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-800 hover:border-primary/50'}`}
                >
                  <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${selectedLocation === loc.id ? 'border-primary' : 'border-gray-300'}`}>
                    {selectedLocation === loc.id && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{loc.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{loc.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN 2: FECHA */}
          <section>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">2. Fecha Disponible</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {businessDays.map((day) => (
                <button
                  key={day.val}
                  onClick={() => setSelectedDate(day.val)}
                  className={`flex flex-col items-center justify-center min-w-[80px] h-20 rounded-2xl border transition-all shrink-0 snap-start
                    ${selectedDate === day.val
                      ? 'bg-primary text-white border-primary shadow-md transform scale-105'
                      : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-800 hover:border-primary/50'}`}
                >
                  <span className="text-[10px] uppercase font-bold opacity-80">{day.label.split(',')[0]}</span>
                  <span className="text-xl font-black">{day.label.split(' ')[1]}</span>
                  <span className="text-[10px] uppercase font-bold opacity-80">{day.label.split(' ')[2]}</span>
                </button>
              ))}
            </div>
          </section>

          {/* SECCIÓN 3: HORARIO */}
          <section>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">3. Horario</h3>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2 rounded-xl text-sm font-bold border transition-all
                    ${selectedTime === time
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-800 hover:border-primary/50'}`}
                >
                  {time}
                </button>
              ))}
            </div>
          </section>

          {/* SECCIÓN 4: REQUISITOS (Con Botón de PDF) */}
          <div className="bg-[#fffcf0] dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3 text-yellow-800 dark:text-yellow-500">
              <span className="material-symbols-outlined">folder_open</span>
              <h3 className="font-bold text-sm uppercase tracking-wide">Documentación Requerida</h3>
            </div>
            <p className="text-xs text-yellow-800/80 dark:text-yellow-500/80 mb-3">
              Es obligatorio presentar <strong>Original y Copia</strong> el día de tu cita:
            </p>

            <ul className="space-y-3">
              {[
                { t: "Solicitud de licencia", d: "Requisitada (Original y 2 copias).", hasAction: true },
                { t: "Comprobante de domicilio", d: "No mayor a 4 meses (Agua, luz, etc)." },
                { t: "Identificación Oficial", d: "INE/Pasaporte (Original y 2 copias)." },
                { t: "Acta de Nacimiento", d: "Copia certificada." },
                { t: "Saber leer y escribir", d: "Requerido para firmar." },
                { t: "Certificado Médico", d: "Solo personas con discapacidad." }
              ].map((req, i) => (
                <li key={i} className="flex flex-col gap-1 text-xs text-gray-700 dark:text-gray-300 font-medium items-start bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-transparent hover:border-yellow-200 transition-colors">
                  <div className="flex gap-3 items-start w-full">
                    <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>
                    <div className="flex-1">
                      <span className="font-bold block">{req.t}</span>
                      <span className="text-gray-500 dark:text-gray-400">{req.d}</span>
                    </div>
                  </div>

                  {/* BOTÓN PARA GENERAR PDF */}
                  {req.hasAction && (
                    <button
                      onClick={handleGeneratePDF}
                      className="ml-7 mt-2 text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[12px]">edit_document</span>
                      Descargar Solicitud Llenada
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </main>

      <div className="p-6 absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-20">
        <button
          onClick={handleConfirm}
          disabled={!selectedLocation || !selectedDate || !selectedTime}
          className={`w-full h-14 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 shadow-xl ${(selectedLocation && selectedDate && selectedTime)
            ? 'bg-primary text-white shadow-primary/20 hover:bg-blue-700 active:scale-95'
            : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            }`}
        >
          Confirmar Cita
          <span className="material-symbols-outlined">event_available</span>
        </button>
      </div>
      {/* MODAL GENÉRICO DE ALERTAS */}
      {showAlertModal && (
        <div className="absolute inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${alertType === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                alertType === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                  alertType === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                }`}>
                <span className="material-symbols-outlined text-5xl">
                  {alertType === 'success' ? 'check_circle' :
                    alertType === 'error' ? 'error' :
                      alertType === 'warning' ? 'warning' : 'info'}
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
                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentScreen;
