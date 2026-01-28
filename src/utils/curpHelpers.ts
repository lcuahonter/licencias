// src/utils/curpHelpers.ts

// Validar formato con Regex Oficial
export const validateCurpFormat = (curp: string): boolean => {
  const re = /^([A-Z][AEIOUX][A-Z]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HM](?:AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d])(\d)$/;
  return re.test(curp.toUpperCase());
};

// Función auxiliar para decodificar fecha desde el string
export const decodeCurpData = (curp: string) => {
  const c = curp.toUpperCase();

  try {
    // Extraer fecha (Formato YYMMDD)
    const yearStr = c.substring(4, 6);
    const month = c.substring(6, 8);
    const day = c.substring(8, 10);

    // Calcular siglo usando el caracter 17 (índice 16)
    // Si es número (0-9) -> 1900
    // Si es letra (A-Z) -> 2000
    const centuryChar = c.charAt(16);
    const isDigit = /\d/.test(centuryChar);
    const fullYear = isDigit ? `19${yearStr}` : `20${yearStr}`;

    const birthDate = `${fullYear}-${month}-${day}`;

    return {
      success: true,
      data: {
        firstName: '',
        lastName: '',
        paternalName: '',
        maternalName: '',
        birthDate,
        found: false
      }
    };
  } catch (e) {
    return { success: false };
  }
};

// Función para validar y extraer datos del CURP
export const fetchCurpData = async (curp: string) => {
  // Simulamos tiempo de espera de red
  await new Promise(resolve => setTimeout(resolve, 1500));

  const upperCurp = curp.toUpperCase().trim();

  // Validar formato y extraer datos básicos
  if (validateCurpFormat(upperCurp)) {
    return decodeCurpData(upperCurp);
  }

  // Si no es válida
  return { success: false };
};
