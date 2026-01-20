import React, { useState, useEffect } from 'react';
import examService, { Pregunta, RespuestaExamen, ObtenerPreguntasResponse, VerificarResultadoResponse } from '../src/api/examService';

interface ExamScreenProps {
  solicitudId: number;
  onClose: () => void;
}

const ExamScreen: React.FC<ExamScreenProps> = ({ solicitudId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<ObtenerPreguntasResponse | null>(null);
  const [respuestas, setRespuestas] = useState<Map<number, 'A' | 'B' | 'C' | 'D'>>(new Map());
  const [tiempos, setTiempos] = useState<Map<number, number>>(new Map());
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [resultado, setResultado] = useState<VerificarResultadoResponse | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  
  // Modal genérico para alertas
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  useEffect(() => {
    loadExam();
  }, []);

  useEffect(() => {
    if (examData && !examSubmitted) {
      setStartTime(Date.now());
    }
  }, [currentQuestion]);

  const loadExam = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAlertMessage('No hay token de autenticación');
        setAlertType('error');
        setShowAlertModal(true);
        return;
      }

      const data = await examService.obtenerPreguntas(solicitudId, token);
      setExamData(data);
      setLoading(false);
    } catch (error: any) {
      console.error('Error al cargar examen:', error);
      setAlertMessage('Error al cargar el examen: ' + (error.response?.data?.message || error.message));
      setAlertType('error');
      setShowAlertModal(true);
      setLoading(false);
    }
  };

  const handleSelectAnswer = (answer: 'A' | 'B' | 'C' | 'D') => {
    if (!examData) return;

    const currentPreguntaId = examData.preguntas[currentQuestion].id;
    const tiempoRespuesta = Math.floor((Date.now() - startTime) / 1000);

    const newRespuestas = new Map(respuestas);
    newRespuestas.set(currentPreguntaId, answer);
    setRespuestas(newRespuestas);

    const newTiempos = new Map(tiempos);
    newTiempos.set(currentPreguntaId, tiempoRespuesta);
    setTiempos(newTiempos);
  };

  const handleNext = () => {
    if (examData && currentQuestion < examData.preguntas.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (!examData) return;

    if (respuestas.size !== examData.preguntas.length) {
      setAlertMessage(`Por favor responde todas las preguntas. Has respondido ${respuestas.size} de ${examData.preguntas.length}`);
      setAlertType('warning');
      setShowAlertModal(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const respuestasArray: RespuestaExamen[] = examData.preguntas.map((pregunta) => ({
        idpregunta: pregunta.id,
        respuesta: respuestas.get(pregunta.id) || 'A',
        tiempoRespuesta: tiempos.get(pregunta.id) || 0,
      }));

      await examService.enviarRespuestas(examData.idintento, respuestasArray, token);

      const resultadoData = await examService.verificarResultado(examData.idintento, token);
      setResultado(resultadoData);
      setExamSubmitted(true);
    } catch (error: any) {
      console.error('Error al enviar examen:', error);
      setAlertMessage('Error al enviar el examen: ' + (error.response?.data?.message || error.message));
      setAlertType('error');
      setShowAlertModal(true);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (!examData) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>No se pudo cargar el examen</p>
          <button onClick={onClose} style={styles.button}>Cerrar</button>
        </div>
      </div>
    );
  }

  if (examSubmitted && resultado) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Resultado del Examen</h2>
          <div style={styles.resultContainer}>
            <div style={{
              ...styles.resultBadge,
              backgroundColor: resultado.aprobado ? '#10b981' : '#ef4444'
            }}>
              {resultado.aprobado ? '✓ APROBADO' : '✗ NO APROBADO'}
            </div>
            <div style={styles.resultStats}>
              <p><strong>Calificación:</strong> {resultado.calificacion}%</p>
              <p><strong>Respuestas correctas:</strong> {resultado.correctas}</p>
              <p><strong>Respuestas incorrectas:</strong> {resultado.incorrectas}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.button}>Cerrar</button>
        </div>
      </div>
    );
  }

  const pregunta = examData.preguntas[currentQuestion];
  const selectedAnswer = respuestas.get(pregunta.id);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Examen Teórico de Manejo</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        <div style={styles.progressBar}>
          <div 
            style={{
              ...styles.progressFill,
              width: `${((currentQuestion + 1) / examData.preguntas.length) * 100}%`
            }}
          />
        </div>

        <p style={styles.questionCounter}>
          Pregunta {currentQuestion + 1} de {examData.preguntas.length}
        </p>

        <div style={styles.categoryBadge}>{pregunta.categoria}</div>

        <h3 style={styles.questionText}>{pregunta.pregunta}</h3>

        <div style={styles.optionsContainer}>
          {(['A', 'B', 'C', 'D'] as const).map((option) => (
            <button
              key={option}
              onClick={() => handleSelectAnswer(option)}
              style={{
                ...styles.optionButton,
                backgroundColor: selectedAnswer === option ? '#3b82f6' : '#f3f4f6',
                color: selectedAnswer === option ? 'white' : '#1f2937',
                borderColor: selectedAnswer === option ? '#3b82f6' : '#d1d5db'
              }}
            >
              <span style={styles.optionLetter}>{option}</span>
              <span style={styles.optionText}>{pregunta[`opcion${option}` as keyof Pregunta]}</span>
            </button>
          ))}
        </div>

        <div style={styles.navigationContainer}>
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            style={{
              ...styles.navButton,
              opacity: currentQuestion === 0 ? 0.5 : 1
            }}
          >
            ← Anterior
          </button>

          <div style={styles.answeredCounter}>
            {respuestas.size} de {examData.preguntas.length} respondidas
          </div>

          {currentQuestion < examData.preguntas.length - 1 ? (
            <button onClick={handleNext} style={styles.navButton}>
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              style={{
                ...styles.submitButton,
                opacity: respuestas.size === examData.preguntas.length ? 1 : 0.5
              }}
            >
              Enviar Examen
            </button>
          )}
        </div>

        <div style={styles.questionsGrid}>
          {examData.preguntas.map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentQuestion(index)}
              style={{
                ...styles.questionDot,
                backgroundColor: respuestas.has(examData.preguntas[index].id)
                  ? '#10b981'
                  : index === currentQuestion
                  ? '#3b82f6'
                  : '#e5e7eb'
              }}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Alertas */}
      <ModalAlert 
        show={showAlertModal} 
        type={alertType} 
        message={alertMessage} 
        onClose={() => setShowAlertModal(false)} 
      />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
    overflowY: 'auto'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0',
    width: '30px',
    height: '30px'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '20px'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease'
  },
  questionCounter: {
    color: '#6b7280',
    fontSize: '14px',
    marginBottom: '10px'
  },
  categoryBadge: {
    display: 'inline-block',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    marginBottom: '15px'
  },
  questionText: {
    fontSize: '20px',
    color: '#1f2937',
    marginBottom: '25px',
    lineHeight: '1.6'
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '30px'
  },
  optionButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    border: '2px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
    fontSize: '16px'
  },
  optionLetter: {
    fontWeight: 'bold',
    marginRight: '15px',
    fontSize: '18px'
  },
  optionText: {
    flex: 1
  },
  navigationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  navButton: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937'
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white'
  },
  answeredCounter: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  questionsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    padding: '20px 0'
  },
  questionDot: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white',
    transition: 'all 0.2s'
  },
  resultContainer: {
    textAlign: 'center',
    padding: '30px 0'
  },
  resultBadge: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  resultStats: {
    fontSize: '18px',
    color: '#1f2937',
    lineHeight: '2'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    marginTop: '20px'
  }
};

const ModalAlert: React.FC<{
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
}> = ({ show, type, message, onClose }) => {
  if (!show) return null;

  const bgColor = type === 'success' ? '#dcfce7' : type === 'error' ? '#fee2e2' : type === 'warning' ? '#fef3c7' : '#dbeafe';
  const iconColor = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : type === 'warning' ? '#d97706' : '#2563eb';
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info';
  const title = type === 'success' ? '¡Éxito!' : type === 'error' ? 'Error' : type === 'warning' ? 'Atención' : 'Información';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '32px', maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', backgroundColor: bgColor }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: iconColor }}>{icon}</span>
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>{title}</h3>
          <p style={{ color: '#6b7280', marginBottom: '24px', whiteSpace: 'pre-line' }}>{message}</p>
          <button
            onClick={onClose}
            style={{ width: '100%', padding: '12px 24px', color: 'white', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', backgroundColor: iconColor }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const ExamScreenWithModal: React.FC<ExamScreenProps> = (props) => {
  return (
    <>
      <ExamScreen {...props} />
    </>
  );
};

export default ExamScreenWithModal;
