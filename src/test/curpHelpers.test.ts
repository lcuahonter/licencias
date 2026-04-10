import { describe, it, expect, vi } from 'vitest';
import {
  validateCurpFormat,
  getGenderFromCurp,
  decodeCurpData,
  fetchCurpData,
} from '../utils/curpHelpers';

describe('validateCurpFormat', () => {
  it('acepta un CURP válido masculino', () => {
    expect(validateCurpFormat('LOOA890101HDFLNS01')).toBe(true);
  });

  it('acepta un CURP válido femenino', () => {
    expect(validateCurpFormat('GAME870312MDFRRR04')).toBe(true);
  });

  it('rechaza un CURP vacío', () => {
    expect(validateCurpFormat('')).toBe(false);
  });

  it('rechaza un CURP con longitud incorrecta', () => {
    expect(validateCurpFormat('LOOA890101HDFLNS')).toBe(false);
  });

  it('rechaza un CURP con caracteres inválidos', () => {
    expect(validateCurpFormat('1234567890ABCDEFGH')).toBe(false);
  });

  it('es case-insensitive (acepta minúsculas)', () => {
    expect(validateCurpFormat('looa890101hdflns01')).toBe(true);
  });
});

describe('getGenderFromCurp', () => {
  it('retorna "M" para CURP masculino (H en posición 10)', () => {
    // Posición 10 = H → Hombre → 'M'
    expect(getGenderFromCurp('LOOA890101HDFLNS01')).toBe('M');
  });

  it('retorna "F" para CURP femenino (M en posición 10)', () => {
    // Posición 10 = M → Mujer → 'F'
    expect(getGenderFromCurp('GAME870312MDFRRR04')).toBe('F');
  });

  it('retorna null si el CURP es muy corto', () => {
    expect(getGenderFromCurp('LOOA')).toBe(null);
  });

  it('retorna null si la posición 10 no es H ni M', () => {
    expect(getGenderFromCurp('LOOA890101XDFLNS01')).toBe(null);
  });

  it('retorna null si el string está vacío', () => {
    expect(getGenderFromCurp('')).toBe(null);
  });
});

describe('decodeCurpData', () => {
  it('extrae correctamente la fecha de nacimiento (siglo XX, >40)', () => {
    // CURP con año 89 → 1989, mes 01, día 01
    const result = decodeCurpData('LOOA890101HDFLNS01');
    expect(result.success).toBe(true);
    expect(result.data?.birthDate).toBe('1989-01-01');
  });

  it('extrae correctamente la fecha de nacimiento (siglo XXI, <=40)', () => {
    // CURP con año 03 → 2003
    const result = decodeCurpData('GAME030312MDFRRR04');
    expect(result.success).toBe(true);
    expect(result.data?.birthDate).toBe('2003-03-12');
  });

  it('retorna el objeto con éxito true y datos iniciales vacíos', () => {
    const result = decodeCurpData('LOOA890101HDFLNS01');
    expect(result.success).toBe(true);
    expect(result.data?.firstName).toBe('');
    expect(result.data?.lastName).toBe('');
    expect(result.data?.found).toBe(false);
  });

  it('maneja un CURP de formato extraño sin lanzar error', () => {
    // decodeCurpData no valida formato, solo extrae substrings
    const result = decodeCurpData('XXXX000000XXXXXXX0');
    expect(result).toBeDefined();
  });
});

describe('fetchCurpData', () => {
  it('retorna success true para CURP válido', async () => {
    vi.useFakeTimers();
    const promise = fetchCurpData('LOOA890101HDFLNS01');
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.data?.birthDate).toBe('1989-01-01');
    vi.useRealTimers();
  }, 5000);

  it('retorna success false para CURP inválido', async () => {
    vi.useFakeTimers();
    const promise = fetchCurpData('INVALIDO');
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.success).toBe(false);
    vi.useRealTimers();
  }, 5000);

  it('normaliza a mayúsculas antes de validar', async () => {
    vi.useFakeTimers();
    const promise = fetchCurpData('looa890101hdflns01');
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.success).toBe(true);
    vi.useRealTimers();
  }, 5000);
});
