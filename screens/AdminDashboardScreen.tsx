import React, { useState, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import html2pdf from 'html2pdf.js';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import MD5 from 'crypto-js/md5';
import { userService } from '../src/api/userService';
import { fetchCurpData } from '../src/utils/curpHelpers';

interface AdminDashboardScreenProps {
  onLogout: () => void;
}

const DURANGO_MUNICIPIOS = [
  'Canatlán', 'Canelas', 'Coneto de Comonfort', 'Cuencamé', 'Durango', 
  'El Oro', 'General Simón Bolívar', 'Gómez Palacio', 'Guadalupe Victoria', 
  'Guanaceví', 'Hidalgo', 'Indé', 'Lerdo', 'Mapimí', 'Mezquital', 'Nazas', 
  'Nombre de Dios', 'Nuevo Ideal', 'Ocampo', 'Otáez', 'Pánuco de Coronado', 
  'Peñón Blanco', 'Poanas', 'Pueblo Nuevo', 'Rodeo', 'San Bernardo', 'San Dimas', 
  'San Juan de Guadalupe', 'San Juan del Río', 'San Luis del Cordero', 
  'San Pedro del Gallo', 'Santa Clara', 'Santiago Papasquiaro', 'Súchil', 
  'Tamazula', 'Tepehuanes', 'Tlahualilo', 'Topia', 'Vicente Guerrero'
];

const INITIAL_OPERATORS = [
    { id: 1, name: 'Roberto Gómez', email: 'roberto@durango.gob.mx', role: 'Supervisor', status: 'active', rejections: 12, approvals: 140 },
    { id: 2, name: 'Ana Martínez', email: 'ana@durango.gob.mx', role: 'Operador', status: 'active', rejections: 45, approvals: 80 },
    { id: 3, name: 'Carlos Ruiz', email: 'carlos@durango.gob.mx', role: 'Operador', status: 'inactive', rejections: 2, approvals: 15 },
    { id: 4, name: 'Daniela Soto', email: 'daniela@durango.gob.mx', role: 'Operador', status: 'active', rejections: 8, approvals: 95 },
];

const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'operators'>('overview');
  const [operators, setOperators] = useState(INITIAL_OPERATORS);
  
  // FECHAS
  const todayDate = new Date();
  const todayISO = todayDate.toISOString().split('T')[0]; 
  const firstDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({ start: firstDay, end: lastDay });
  const [filterLabel, setFilterLabel] = useState('Mes Actual');
  const [activeFilterBtn, setActiveFilterBtn] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
  
  // FILTROS
  const [searchOp, setSearchOp] = useState('');
  const [filterOpStatus, setFilterOpStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // MODALES
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMuni, setSelectedMuni] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ show: boolean, html: string, title: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false); 

  // INPUTS FORMULARIO OPERADOR
  const [operatorForm, setOperatorForm] = useState({
    firstName: '',
    paternalName: '',
    maternalName: '',
    curp: '',
    email: '',
    password: '',
    birthDate: ''
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmittingOperator, setIsSubmittingOperator] = useState(false);
  const [loadingCurp, setLoadingCurp] = useState(false);
  const [lastFetchedCurp, setLastFetchedCurp] = useState('');
  
  // Modal genérico para alertas
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  
  const operatorInputRefs = {
    firstName: useRef<HTMLInputElement>(null),
    paternalName: useRef<HTMLInputElement>(null),
    maternalName: useRef<HTMLInputElement>(null),
    curp: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    birthDate: useRef<HTMLInputElement>(null)
  };

  // --- HELPERS ---
  const formatDateMX = (isoDate: string) => {
      if (!isoDate) return '';
      const [year, month, day] = isoDate.split('-');
      return `${day}/${month}/${year}`;
  };

  const getRangeText = () => {
      if (dateRange.start && dateRange.end) {
          return `${formatDateMX(dateRange.start)} al ${formatDateMX(dateRange.end)}`;
      }
      return "Periodo Histórico";
  };

  // --- LÓGICA DE DATOS PRINCIPAL ---
  const getMuniStats = (muniName: string) => {
      const dateFactor = parseInt(dateRange.start.replace(/-/g, '').substring(6)) || 1; 
      const seed = (muniName.length * 5) + dateFactor; 
      
      // 1. Calculamos valores base
      const primera = Math.floor(Math.random() * 80) + seed;
      const renovacion = Math.floor(Math.random() * 120) + seed;
      
      // 2. Total real
      const total = primera + renovacion;

      // 3. Calculamos porcentajes REALES para el gráfico
      const primeraPct = Math.round((primera / total) * 100);
      const renovacionPct = 100 - primeraPct; // Para asegurar que sumen 100% exacto
      
      return {
          name: muniName,
          total, 
          // Breakdown con datos y porcentajes reales
          breakdown: {
              primera: { count: primera, pct: primeraPct },
              renovacion: { count: renovacion, pct: renovacionPct }
          }
      };
  };

  // CÁLCULO TOTALES DINÁMICOS
  const globalStats = useMemo(() => {
      let totalTramites = 0;
      let totalDinero = 0;

      DURANGO_MUNICIPIOS.forEach(muni => {
          const stats = getMuniStats(muni);
          totalTramites += stats.total;
          totalDinero += stats.total * 900; 
      });

      return { count: totalTramites, money: totalDinero };
  }, [dateRange]);

  const currentMuniStats = selectedMuni ? getMuniStats(selectedMuni) : null;

  const filteredOperators = operators.filter(op => {
      const matchesSearch = op.name.toLowerCase().includes(searchOp.toLowerCase()) || op.email.toLowerCase().includes(searchOp.toLowerCase());
      const matchesStatus = filterOpStatus === 'all' ? true : op.status === filterOpStatus;
      return matchesSearch && matchesStatus;
  });

  // --- HTML ESTRUCTURA ---
  const generateHTMLStructure = (title: string, contentBody: string) => {
    return `
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; background: white; font-size: 12px; }
                .header-table { width: 100%; border-bottom: 2px solid #2c3e50; margin-bottom: 20px; padding-bottom: 10px; }
                .header-title { font-size: 20px; color: #2c3e50; font-weight: bold; }
                .header-meta { text-align: right; font-size: 10px; color: #666; }
                table.data-table { width: 100%; border-collapse: collapse; font-size: 10px; }
                table.data-table th, table.data-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                table.data-table th { background-color: #2c3e50; color: white; }
                table.data-table tr:nth-child(even) { background-color: #f9f9f9; }
                .box { border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 8px; background: #fafafa; }
                .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
                .val { font-weight: bold; }
                .footer { margin-top: 30px; font-size: 8px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td class="header-title">${title}</td>
                    <td class="header-meta">
                        <strong>Fecha Emisión:</strong> ${formatDateMX(todayISO)}<br/>
                        <strong>Rango:</strong> ${filterLabel}<br/>
                        ${getRangeText()}
                    </td>
                </tr>
            </table>
            ${contentBody}
            <div class="footer">Gobierno del Estado de Durango - Plataforma Digital Segura</div>
        </body>
        </html>
    `;
  };

  const handlePreviewGlobalPDF = () => {
    let grandTotal = 0;
    let grandPrimera = 0;
    let grandRenovacion = 0;
    let rowsHTML = '';
    
    DURANGO_MUNICIPIOS.forEach(muni => {
        const stats = getMuniStats(muni);
        const cash = stats.total * 900;
        grandTotal += stats.total;
        grandPrimera += stats.breakdown.primera.count;
        grandRenovacion += stats.breakdown.renovacion.count;
        const shortName = muni.length > 15 ? muni.substring(0,13) + '..' : muni;
        // COLUMNAS ACTUALIZADAS
        rowsHTML += `<tr><td>${shortName}</td><td><strong>${stats.total}</strong></td><td>${stats.breakdown.primera.count}</td><td>${stats.breakdown.renovacion.count}</td><td>$${(cash/1000).toFixed(1)}k</td></tr>`;
    });

    const body = `
        <div style="margin-bottom: 15px;">
            <div class="box">
                <h3 style="margin:0 0 5px 0;">Resumen General</h3>
                <div class="row"><span>Total Trámites:</span> <span class="val" style="font-size:14px">${grandTotal.toLocaleString()}</span></div>
                <div class="row"><span>Recaudación Est:</span> <span class="val" style="color:green">$${(grandTotal * 900).toLocaleString()}</span></div>
            </div>
        </div>
        <table class="data-table">
            <thead><tr><th>Municipio</th><th>Total</th><th>1ra Vez</th><th>Renovación</th><th>Recaudado</th></tr></thead>
            <tbody>
                ${rowsHTML}
                <tr style="background-color: #eef2ff; font-weight: bold;"><td>TOTAL ESTATAL</td><td>${grandTotal}</td><td>${grandPrimera}</td><td>${grandRenovacion}</td><td>-</td></tr>
            </tbody>
        </table>
    `;
    setPdfPreview({ show: true, html: generateHTMLStructure('Reporte Estatal Global', body), title: 'Reporte Global' });
  };

  const handlePreviewMuniPDF = () => {
    if (!currentMuniStats) return;
    const s = currentMuniStats;
    const b = s.breakdown;
    const body = `
        <h2 style="color: #4F46E5; margin-top:0;">${s.name}</h2>
        <div class="box">
            <h3 style="margin:0 0 10px 0; font-size:14px; border-bottom:1px solid #ddd;">Resumen</h3>
            <div class="row"><span>Total Trámites:</span> <span class="val">${s.total}</span></div>
        </div>
        <div class="box">
            <h3 style="margin:0 0 10px 0; font-size:14px; border-bottom:1px solid #ddd;">Desglose por Tipo</h3>
            <div class="row"><span>Primera Vez:</span> <span class="val">${b.primera.count} (${b.primera.pct}%)</span></div>
            <div class="row"><span>Renovación:</span> <span class="val">${b.renovacion.count} (${b.renovacion.pct}%)</span></div>
        </div>
    `;
    setPdfPreview({ show: true, html: generateHTMLStructure('Reporte Municipal', body), title: `Reporte - ${s.name}` });
  };

  const downloadExcel = async () => {
    try {
      let csvContent = "\uFEFFID,Municipio,Total Tramites,Primera Vez,Renovacion,Recaudacion Estimada\n"; 
      DURANGO_MUNICIPIOS.forEach((muni, index) => {
          const stats = getMuniStats(muni);
          const cash = stats.total * 900;
          csvContent += `${index + 1},"${muni}",${stats.total},${stats.breakdown.primera.count},${stats.breakdown.renovacion.count},"$${cash}"\n`;
      });
      const fileName = `Reporte_Durango_${Date.now()}.csv`;
      if (Capacitor.isNativePlatform()) {
          const savedFile = await Filesystem.writeFile({
              path: fileName,
              data: csvContent,
              directory: Directory.Documents,
              encoding: Encoding.UTF8
          });
          await FileOpener.open({ filePath: savedFile.uri, contentType: 'text/csv' });
      } else {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", fileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Error al exportar Excel:", error);
      setAlertMessage("No se pudo descargar el archivo.");
      setAlertType('error');
      setShowAlertModal(true);
    }
  };

  const handleDownloadAndOpen = async () => {
    if (!pdfPreview) return;
    setIsGenerating(true);
    try {
        const element = document.createElement('div');
        element.innerHTML = pdfPreview.html;
        element.style.width = '210mm'; 
        element.style.padding = '20px';
        element.style.fontSize = '14px'; 
        document.body.appendChild(element);

        const opt = {
            margin: 5,
            filename: `Reporte_${Date.now()}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const } 
        };

        if (Capacitor.isNativePlatform()) {
            const pdfBase64 = await html2pdf().set(opt).from(element).outputPdf('datauristring');
            const base64Data = pdfBase64.split(',')[1];
            const savedFile = await Filesystem.writeFile({
                path: opt.filename,
                data: base64Data,
                directory: Directory.Documents, 
            });
            await FileOpener.open({ filePath: savedFile.uri, contentType: 'application/pdf' });
        } else {
            await html2pdf().set(opt).from(element).save();
        }
        document.body.removeChild(element);
    } catch (error) {
        console.error("Error PDF:", error);
        setAlertMessage("Error al generar el documento.");
        setAlertType('error');
        setShowAlertModal(true);
    } finally {
        setIsGenerating(false);
    }
  };

  // --- HANDLERS OPERADORES ---
  const CURP_REGEX = /^[A-Z]{4}\d{6}[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/;
  const NAME_REGEX = /^[A-ZÑ\s]*$/;
  
  const handleOperatorNameInput = (field: 'firstName' | 'paternalName' | 'maternalName', value: string) => {
    const upperValue = value.toUpperCase();
    if (NAME_REGEX.test(upperValue)) {
      setOperatorForm(prev => ({ ...prev, [field]: upperValue }));
      if (formErrors[field]) {
        setFormErrors(prev => { const n = {...prev}; delete n[field]; return n; });
      }
    }
  };

  const handleOperatorCurpInput = (value: string) => {
    const upperValue = value.toUpperCase();
    if (/^[A-Z0-9Ñ]*$/.test(upperValue) && upperValue.length <= 18) {
      setOperatorForm(prev => ({ ...prev, curp: upperValue }));
      if (formErrors.curp) {
        setFormErrors(prev => { const n = {...prev}; delete n.curp; return n; });
      }
    }
  };

  const handleOperatorCurpBlur = async () => {
    if (CURP_REGEX.test(operatorForm.curp) && operatorForm.curp !== lastFetchedCurp) {
      setLoadingCurp(true);
      const result = await fetchCurpData(operatorForm.curp);
      setLoadingCurp(false);

      if (result.success && result.data) {
        setLastFetchedCurp(operatorForm.curp);
        setOperatorForm(prev => ({
          ...prev,
          firstName: result.data.firstName || prev.firstName, 
          paternalName: result.data.paternalName || prev.paternalName,
          maternalName: result.data.maternalName || prev.maternalName,
          birthDate: result.data.birthDate || prev.birthDate
        }));
        // Limpiar errores si se autocompletó
        setFormErrors({});
      }
    }
  };

  const focusOnOperatorError = (errorList: {[key: string]: string}) => {
    const errorKeys = Object.keys(errorList);
    if (errorKeys.length === 0) return;
    const fieldOrder = ['firstName', 'paternalName', 'curp', 'email', 'password', 'birthDate'];
    const firstErrorField = fieldOrder.find(field => errorKeys.includes(field));
    if (firstErrorField) {
      const ref = operatorInputRefs[firstErrorField as keyof typeof operatorInputRefs];
      if (ref && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => ref.current!.focus(), 100);
      }
    }
  };

  const validateOperatorForm = () => {
    const errors: {[key: string]: string} = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!operatorForm.email || !emailRegex.test(operatorForm.email)) errors.email = 'Correo inválido';
    if (!operatorForm.password || operatorForm.password.length < 4) errors.password = 'Mínimo 4 caracteres';
    if (!operatorForm.curp) {
      errors.curp = 'La CURP es requerida';
    } else if (operatorForm.curp.length !== 18) {
      errors.curp = 'Debe tener 18 caracteres';
    } else if (!CURP_REGEX.test(operatorForm.curp)) {
      errors.curp = 'Formato de CURP inválido';
    }
    if (!operatorForm.firstName.trim()) errors.firstName = 'Nombre requerido';
    if (!operatorForm.paternalName.trim()) errors.paternalName = 'Apellido P. requerido';
    if (!operatorForm.birthDate) errors.birthDate = 'Fecha requerida';
    
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusOnOperatorError(errors);
      return false;
    }
    return true;
  };

  const handleAddOperator = async () => {
    if (!validateOperatorForm()) return;
    
    setIsSubmittingOperator(true);
    setFormErrors({});
    
    try {
      const md5Password = MD5(operatorForm.password).toString();
      
      const payload = {
        tipoUsuario: 3,  // ID para Operador
        nombres: operatorForm.firstName,
        apellidopaterno: operatorForm.paternalName,
        apellidomaterno: operatorForm.maternalName,
        curp: operatorForm.curp,
        email: operatorForm.email,
        password: md5Password,
        fechanacimiento: operatorForm.birthDate
      };
      
      const data = await userService.createUsuario(payload);
      
      // Solo code "200" es exitoso
      if (data.code === "200") {
        setAlertMessage(`✅ Operador "${operatorForm.firstName} ${operatorForm.paternalName}" creado exitosamente.`);
        setAlertType('success');
        setShowAlertModal(true);
        // Agregar a la lista local (opcional, podrías recargar desde API)
        const newOp = { 
          id: Date.now(), 
          name: `${operatorForm.firstName} ${operatorForm.paternalName}`, 
          email: operatorForm.email, 
          role: 'Operador', 
          status: 'active', 
          rejections: 0, 
          approvals: 0 
        };
        setOperators(prev => [...prev, newOp]);
        
        // Limpiar y cerrar
        setShowAddModal(false);
        setOperatorForm({ firstName: '', paternalName: '', maternalName: '', curp: '', email: '', password: '', birthDate: '' });
        setFormErrors({});
        setLastFetchedCurp('');
        setLoadingCurp(false);
      } else {
        throw new Error(data.message || 'Error al crear operador');
      }
    } catch (error: any) {
      console.error('Error al crear operador:', error);
      setAlertMessage(error.message || 'Error desconocido al crear operador');
      setAlertType('error');
      setShowAlertModal(true);
    } finally {
      setIsSubmittingOperator(false);
    }
  };

  const handleToggleStatus = (id: number) => { 
      // @ts-ignore
      setOperators(prev => prev.map(op => op.id === id ? { ...op, status: op.status === 'active' ? 'inactive' : 'active' } : op)); 
  };
  const handleDeleteOperator = (id: number) => { if(window.confirm('¿Estás seguro de eliminar este operador?')) setOperators(prev => prev.filter(op => op.id !== id)); };
  
  const handleQuickDate = (type: 'month' | 'quarter' | 'year') => {
      const end = new Date(); const start = new Date();
      setActiveFilterBtn(type);
      if (type === 'month') { start.setDate(1); setFilterLabel('Mes Actual'); } 
      else if (type === 'quarter') { start.setMonth(end.getMonth() - 3); setFilterLabel('Último Trimestre'); } 
      else if (type === 'year') { start.setMonth(0, 1); setFilterLabel('Año en Curso'); }
      setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <header className="safe-top bg-indigo-900 text-white px-6 pb-5 shadow-lg sticky top-0 z-10 rounded-b-3xl">
        <div className="flex justify-between items-center mb-4 pt-4"> 
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                    <span className="material-symbols-outlined text-indigo-100">monitoring</span>
                </div>
                <div>
                    <h1 className="font-black text-lg leading-tight tracking-tight">Panel de Control</h1>
                    <p className="text-[10px] opacity-70 uppercase tracking-wider font-bold">Estado de Durango</p>
                </div>
            </div>
            <button onClick={onLogout} className="bg-white/10 hover:bg-red-500/80 p-2 rounded-xl transition-colors">
                <span className="material-symbols-outlined text-sm">logout</span>
            </button>
        </div>
        <div className="flex bg-indigo-950/50 p-1 rounded-xl">
            <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-sm">analytics</span> Reportes
            </button>
            <button onClick={() => setActiveTab('operators')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'operators' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-sm">group</span> Operadores
            </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                {/* KPIs DINÁMICOS */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Trámites {filterLabel === 'Periodo Personalizado' ? 'en periodo' : filterLabel}</p>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white">{globalStats.count.toLocaleString()}</h2>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2"><div className="bg-indigo-500 h-1.5 rounded-full w-[70%]"></div></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Recaudación Total</p>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white">${(globalStats.money / 1000000).toFixed(1)}M</h2>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2"><div className="bg-green-500 h-1.5 rounded-full w-[85%]"></div></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg border border-indigo-100 dark:border-gray-700">
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-indigo-500">filter_alt</span> Exportar Datos</h3>
                            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-1 border border-gray-100 dark:border-gray-700">
                                <button onClick={handlePreviewGlobalPDF} className="p-2 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all"><span className="material-symbols-outlined text-xl">picture_as_pdf</span></button>
                                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
                                <button onClick={downloadExcel} className="p-2 text-gray-400 hover:text-green-600 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-all"><span className="material-symbols-outlined text-xl">table_view</span></button>
                            </div>
                        </div>
                        <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
                             <div className="flex-1 relative">
                                 <span className="absolute left-2 top-2 text-[8px] font-bold text-gray-400 uppercase">Desde</span>
                                 <input 
                                    type="date" 
                                    value={dateRange.start} 
                                    onChange={(e) => { 
                                        setDateRange({...dateRange, start: e.target.value}); 
                                        setFilterLabel('Periodo Personalizado'); 
                                        setActiveFilterBtn('custom'); 
                                    }} 
                                    className="w-full bg-transparent pt-4 pb-1 px-2 text-xs font-bold outline-none dark:text-white" 
                                />
                             </div>
                             <div className="text-gray-300">-</div>
                             <div className="flex-1 relative">
                                 <span className="absolute left-2 top-2 text-[8px] font-bold text-gray-400 uppercase">Hasta</span>
                                 <input 
                                    type="date" 
                                    value={dateRange.end} 
                                    onChange={(e) => { 
                                        setDateRange({...dateRange, end: e.target.value}); 
                                        setFilterLabel('Periodo Personalizado'); 
                                        setActiveFilterBtn('custom'); 
                                    }} 
                                    className="w-full bg-transparent pt-4 pb-1 px-2 text-xs font-bold outline-none dark:text-white" 
                                />
                             </div>
                        </div>
                        
                        {/* BOTONES DE FECHA */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            <button 
                                onClick={() => handleQuickDate('month')} 
                                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${activeFilterBtn === 'month' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`}
                            >
                                Mes Actual
                            </button>
                            <button 
                                onClick={() => handleQuickDate('quarter')} 
                                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${activeFilterBtn === 'quarter' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                            >
                                3 Meses
                            </button>
                            <button 
                                onClick={() => handleQuickDate('year')} 
                                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${activeFilterBtn === 'year' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                            >
                                Año Actual
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-orange-500">map</span> Desglose por Municipio</h3>
                        <p className="text-[10px] text-gray-400 mt-1">Filtrado por: <span className="font-bold text-indigo-500">{filterLabel} ({getRangeText()})</span></p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {DURANGO_MUNICIPIOS.map((muni, i) => (
                            <div key={muni} onClick={() => setSelectedMuni(muni)} className="px-5 py-4 border-b border-gray-50 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors flex justify-between items-center group">
                                <div className="flex items-center gap-3"><span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span><span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 transition-colors">{muni}</span></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-500">{getMuniStats(muni).total}</span>
                                    <span className="material-symbols-outlined text-gray-300 text-sm group-hover:text-indigo-400">bar_chart</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* --- VISTA OPERADORES --- */}
        {activeTab === 'operators' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 dark:text-white">Equipo Registrado</h3>
                    <button onClick={() => setShowAddModal(true)} className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-indigo-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">add</span> Nuevo
                    </button>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="relative">
                        <input type="text" value={searchOp} onChange={(e) => setSearchOp(e.target.value)} placeholder="Buscar por Nombre o Correo..." className="w-full h-11 pl-10 pr-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors" />
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => setFilterOpStatus('all')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${filterOpStatus === 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-transparent border-gray-200 text-gray-500'}`}>Todos</button>
                         <button onClick={() => setFilterOpStatus('active')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${filterOpStatus === 'active' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-transparent border-gray-200 text-gray-500'}`}>Activos</button>
                         <button onClick={() => setFilterOpStatus('inactive')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${filterOpStatus === 'inactive' ? 'bg-gray-100 border-gray-300 text-gray-600' : 'bg-transparent border-gray-200 text-gray-500'}`}>Inactivos</button>
                    </div>
                </div>
                {filteredOperators.length > 0 ? (
                    filteredOperators.map(op => (
                        <div key={op.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                            <div className="flex items-start gap-4 relative z-10">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md ${op.status === 'active' ? 'bg-gradient-to-br from-indigo-400 to-purple-500' : 'bg-gray-400 grayscale'}`}>
                                    {op.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{op.name}</h4>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${op.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {op.status === 'active' ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">{op.email}</p>
                                    <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <div className="text-center"><p className="text-[10px] text-gray-400 font-bold uppercase">Aprobados</p><p className="text-sm font-black text-gray-700 dark:text-white">{op.approvals}</p></div>
                                        <div className="text-center"><p className="text-[10px] text-gray-400 font-bold uppercase">Rechazos</p><p className="text-sm font-black text-red-500">{op.rejections}</p></div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2 justify-end">
                                <button onClick={() => handleToggleStatus(op.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
                                    {op.status === 'active' ? 'Desactivar' : 'Activar'}
                                </button>
                                <button onClick={() => handleDeleteOperator(op.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100">Baja</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 opacity-50">
                        <span className="material-symbols-outlined text-4xl mb-2">person_search</span>
                        <p>No se encontraron operadores.</p>
                    </div>
                )}
            </div>
        )}
      </main>

      {/* --- MODAL DETALLE MUNICIPIO (ACTUALIZADO: Gráfico Real y Colores) --- */}
      {selectedMuni && currentMuniStats && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 space-y-6 max-h-[85vh] overflow-y-auto">
                  <div className="flex justify-between items-start">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Detalle Municipal</p>
                          <h2 className="text-2xl font-black text-gray-900 dark:text-white">{selectedMuni}</h2>
                          <div className="flex items-center gap-1 mt-1"><span className="material-symbols-outlined text-xs text-indigo-500">calendar_month</span><p className="text-xs text-indigo-500 font-bold">{filterLabel} ({getRangeText()})</p></div>
                      </div>
                      <button onClick={() => setSelectedMuni(null)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><span className="material-symbols-outlined text-sm">close</span></button>
                  </div>
                  
                  {/* GRÁFICO DINÁMICO REAL */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                      <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-500">pie_chart</span> Distribución de Trámites</h4>
                      <div className="flex items-center justify-around">
                          {/* Pie Chart: Azul (Primera) y Naranja (Renovación) */}
                          <div className="relative w-28 h-28 rounded-full shadow-lg" style={{ background: `conic-gradient(#3b82f6 0% ${currentMuniStats.breakdown.primera.pct}%, #fb923c ${currentMuniStats.breakdown.primera.pct}% 100%)` }}>
                               <div className="absolute inset-3 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center flex-col"><span className="text-xs text-gray-400">Total</span><span className="text-xl font-black text-gray-800 dark:text-white">{currentMuniStats.total}</span></div>
                          </div>
                          <div className="space-y-2 text-sm">
                              {/* Leyendas con colores coincidentes */}
                              <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                                  <span className="text-gray-500">Primera Vez ({currentMuniStats.breakdown.primera.pct}%)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded bg-orange-400"></div>
                                  <span className="text-gray-500">Renovación ({currentMuniStats.breakdown.renovacion.pct}%)</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* BARRAS DE PROGRESO (Coinciden con el Pie Chart) */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                      <h4 className="font-bold text-sm text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-orange-500">bar_chart</span> Desglose Numérico</h4>
                      <div className="space-y-4">
                          <div>
                              <div className="flex justify-between text-xs mb-1 font-medium"><span>Primera Vez</span><span>{currentMuniStats.breakdown.primera.count}</span></div>
                              {/* Barra Azul */}
                              <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${currentMuniStats.breakdown.primera.pct}%` }}></div></div>
                          </div>
                          <div>
                              <div className="flex justify-between text-xs mb-1 font-medium"><span>Renovación</span><span>{currentMuniStats.breakdown.renovacion.count}</span></div>
                              {/* Barra Naranja */}
                              <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-orange-400 h-2 rounded-full" style={{ width: `${currentMuniStats.breakdown.renovacion.pct}%` }}></div></div>
                          </div>
                      </div>
                  </div>
                  <button onClick={handlePreviewMuniPDF} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">visibility</span> Ver Reporte PDF
                  </button>
              </div>
          </div>
      )}

      {/* --- MODAL AGREGAR OPERADOR --- */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
             <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl p-6 my-8 animate-in zoom-in-95">
                 <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4">Dar de Alta Operador</h2>
                 
                 <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
                     {/* CREDENCIALES */}
                     <section className="space-y-3">
                         <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 pb-2">Credenciales</h3>
                         
                         <div className="space-y-1.5">
                             <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Correo Electrónico</label>
                             <input 
                                 ref={operatorInputRefs.email}
                                 type="email" 
                                 value={operatorForm.email} 
                                 onChange={e => setOperatorForm({...operatorForm, email: e.target.value})} 
                                 placeholder="operador@durango.gob.mx" 
                                 className={`w-full h-12 bg-white dark:bg-gray-900 border-2 rounded-xl px-4 focus:border-indigo-500 outline-none transition-all ${formErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 dark:border-gray-700'}`} 
                             />
                             {formErrors.email && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{formErrors.email}</p>}
                         </div>

                         <div className="space-y-1.5">
                             <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Contraseña</label>
                             <input 
                                 ref={operatorInputRefs.password}
                                 type="password" 
                                 value={operatorForm.password} 
                                 onChange={e => setOperatorForm({...operatorForm, password: e.target.value})} 
                                 placeholder="••••••••" 
                                 className={`w-full h-12 bg-white dark:bg-gray-900 border-2 rounded-xl px-4 focus:border-indigo-500 outline-none transition-all ${formErrors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 dark:border-gray-700'}`} 
                             />
                             {formErrors.password && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{formErrors.password}</p>}
                         </div>
                     </section>

                     {/* DATOS PERSONALES */}
                     <section className="space-y-3">
                         <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 pb-2">Datos Personales</h3>
                         
                         <div className="space-y-1.5 relative">
                             <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">CURP</label>
                             <input 
                                 ref={operatorInputRefs.curp}
                                 value={operatorForm.curp} 
                                 onChange={e => handleOperatorCurpInput(e.target.value)} 
                                 onBlur={handleOperatorCurpBlur}
                                 maxLength={18} 
                                 placeholder="ABCD990101H..." 
                                 className={`w-full h-12 bg-white dark:bg-gray-900 border-2 rounded-xl px-4 focus:border-indigo-500 outline-none transition-all uppercase font-mono ${formErrors.curp ? 'border-red-400 bg-red-50' : 'border-gray-200 dark:border-gray-700'}`} 
                             />
                             {loadingCurp && <div className="absolute right-4 top-9 animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>}
                             {!formErrors.curp && CURP_REGEX.test(operatorForm.curp) && !loadingCurp && (
                                 <div className="absolute right-4 top-9 text-green-500">
                                     <span className="material-symbols-outlined">check_circle</span>
                                 </div>
                             )}
                             {formErrors.curp && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{formErrors.curp}</p>}
                         </div>

                         <div className="space-y-1.5">
                             <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Nombre(s)</label>
                             <input 
                                 ref={operatorInputRefs.firstName}
                                 value={operatorForm.firstName} 
                                 onChange={e => handleOperatorNameInput('firstName', e.target.value)} 
                                 placeholder="Ej. JUAN CARLOS" 
                                 className={`w-full h-12 bg-white dark:bg-gray-900 border-2 rounded-xl px-4 focus:border-indigo-500 outline-none transition-all ${formErrors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-200 dark:border-gray-700'}`} 
                             />
                             {formErrors.firstName && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{formErrors.firstName}</p>}
                         </div>

                         <div className="grid grid-cols-2 gap-3">
                             <div className="space-y-1.5">
                                 <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Apellido Paterno</label>
                                 <input 
                                     ref={operatorInputRefs.paternalName}
                                     value={operatorForm.paternalName} 
                                     onChange={e => handleOperatorNameInput('paternalName', e.target.value)} 
                                     placeholder="PÉREZ" 
                                     className={`w-full h-12 bg-white dark:bg-gray-900 border-2 rounded-xl px-4 focus:border-indigo-500 outline-none transition-all ${formErrors.paternalName ? 'border-red-400 bg-red-50' : 'border-gray-200 dark:border-gray-700'}`} 
                                 />
                                 {formErrors.paternalName && <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{formErrors.paternalName}</p>}
                             </div>
                             
                             <div className="space-y-1.5">
                                 <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Ap. Materno <span className="text-[9px] text-gray-300 normal-case">(Opc)</span></label>
                                 <input 
                                     ref={operatorInputRefs.maternalName}
                                     value={operatorForm.maternalName} 
                                     onChange={e => handleOperatorNameInput('maternalName', e.target.value)} 
                                     placeholder="GARCÍA" 
                                     className="w-full h-12 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 focus:border-indigo-500 outline-none transition-all" 
                                 />
                             </div>
                         </div>

                         <div className="space-y-1.5">
                             <label className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Fecha de Nacimiento</label>
                             <div className="relative">
                                 <input 
                                     ref={operatorInputRefs.birthDate}
                                     type="date" 
                                     value={operatorForm.birthDate} 
                                     readOnly
                                     disabled
                                     className={`w-full h-12 bg-gray-100 dark:bg-gray-900 border-2 rounded-xl px-4 outline-none text-gray-500 font-bold cursor-not-allowed ${formErrors.birthDate ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`} 
                                 />
                                 <span className="material-symbols-outlined absolute right-4 top-4 text-gray-400 text-lg">lock</span>
                             </div>
                             {formErrors.birthDate ? (
                                 <p className="text-[10px] text-red-500 pl-1 font-bold animate-pulse">{formErrors.birthDate}</p>
                             ) : (
                                 <p className="text-[10px] text-gray-400 pl-1">Se calcula automáticamente de la CURP</p>
                             )}
                         </div>
                     </section>
                 </div>
                 
                 <div className="flex gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                     <button 
                         onClick={() => { 
                             setShowAddModal(false); 
                             setOperatorForm({ firstName: '', paternalName: '', maternalName: '', curp: '', email: '', password: '', birthDate: '' }); 
                             setFormErrors({});
                             setLastFetchedCurp('');
                             setLoadingCurp(false);
                         }} 
                         disabled={isSubmittingOperator}
                         className="flex-1 py-3 font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                     >
                         Cancelar
                     </button>
                     <button 
                         onClick={handleAddOperator} 
                         disabled={isSubmittingOperator}
                         className={`flex-1 py-3 font-bold bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 ${isSubmittingOperator ? 'opacity-70 cursor-wait' : ''}`}
                     >
                         {isSubmittingOperator ? (
                             <>
                                 <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                 Guardando...
                             </>
                         ) : (
                             <>
                                 <span className="material-symbols-outlined text-sm">person_add</span>
                                 Guardar
                             </>
                         )}
                     </button>
                 </div>
             </div>
        </div>
      )}

      {/* --- NUEVO MODAL: PREVIEW PDF --- */}
      {pdfPreview && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-2xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                  {isGenerating && (
                      <div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
                          <p className="font-bold text-indigo-900">Generando PDF...</p>
                      </div>
                  )}
                  <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-700">{pdfPreview.title}</h3>
                      <button onClick={() => setPdfPreview(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-4 bg-gray-200">
                      <div className="bg-white shadow-xl min-h-full p-4 mx-auto w-full md:w-[21cm]" dangerouslySetInnerHTML={{ __html: pdfPreview.html }}></div>
                  </div>
                  <div className="p-4 border-t bg-white flex justify-end gap-3 safe-bottom">
                      <button onClick={() => setPdfPreview(null)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cerrar</button>
                      <button onClick={handleDownloadAndOpen} disabled={isGenerating} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50">
                          <span className="material-symbols-outlined">download</span> Descargar y Abrir
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

    </div>
  );
};

export default AdminDashboardScreen;