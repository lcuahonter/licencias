import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { UserData } from '../../types';

export const generateFilledApplication = async (userData: UserData) => {
  try {
    // 1. Cargar el PDF desde la carpeta public
    // Asegúrate de que el archivo 'solicitud.pdf' exista en tu carpeta /public
    const existingPdfBytes = await fetch('/solicitud.pdf').then(res => res.arrayBuffer());

    // 2. Cargar el documento en memoria
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // 3. Obtener dimensiones (para referencia si necesitas ajustar)
    const { width, height } = firstPage.getSize();

    // 4. Incrustar fuente estándar
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    // const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold); // Descomenta si usas negritas

    // Función auxiliar para escribir texto
    const drawText = (text: string, x: number, y: number, size: number = 10) => {
      // Validamos que text no sea undefined/null para evitar errores
      const safeText = text ? text.toString().toUpperCase() : '';

      firstPage.drawText(safeText, {
        x,
        y,
        size,
        font: font,
        color: rgb(0, 0, 0),
      });
    };

    // --- COORDENADAS APROXIMADAS (Ajustar según tu PDF real de Durango) ---
    // El eje Y empieza abajo (0) y crece hacia arriba.

    // FECHA (Arriba derecha)
    const date = new Date().toLocaleDateString('es-MX');
    drawText(date, 450, 700);

    // DATOS PERSONALES
    // Apellido Paterno (Asumiendo que es la primera palabra del apellido)
    drawText(userData.lastName.split(' ')[0] || '', 120, 625);
    // Apellido Materno
    drawText(userData.lastName.split(' ')[1] || '', 300, 625);
    // Nombres
    drawText(userData.firstName, 480, 625);

    // Fecha Nacimiento
    drawText(userData.birthDate || '', 120, 595);
    // CURP
    drawText(userData.idNumber, 350, 595);

    // Tipo de Sangre (Campo Médico)
    drawText(userData.bloodGroup || '', 150, 500);

    // Donador de Organos (Si/No)
    if (userData.organDonor) {
      drawText('X', 400, 500); // Casilla SI
    } else {
      drawText('X', 450, 500); // Casilla NO
    }

    // Tipo de Licencia (Marcar con X)
    const type = userData.licenseType.toLowerCase();
    if (type.includes('automovilista')) drawText('X', 180, 450);
    if (type.includes('chofer')) drawText('X', 280, 450);
    if (type.includes('moto')) drawText('X', 380, 450);

    // 5. Guardar el PDF modificado
    const pdfBytes = await pdfDoc.save();

    // Usamos `[pdfBytes as any]` para que TS no pelee por el tipo de ArrayBuffer
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Solicitud_Licencia_${userData.firstName.split(' ')[0]}.pdf`;
    link.click();

  } catch (error) {
    throw new Error("Error: Asegúrate de guardar el archivo 'solicitud.pdf' en la carpeta public de tu proyecto.");
  }
};
