import { Capacitor } from '@capacitor/core';

export type Platform = 'ios' | 'android' | 'web';

export class PlatformDetector {
  /**
   * Detecta la plataforma actual del dispositivo
   */
  static getPlatform(): Platform {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'ios') {
      return 'ios';
    } else if (platform === 'android') {
      return 'android';
    } else {
      return 'web';
    }
  }

  /**
   * Verifica si está ejecutándose en iOS
   */
  static isIOS(): boolean {
    return this.getPlatform() === 'ios';
  }

  /**
   * Verifica si está ejecutándose en Android
   */
  static isAndroid(): boolean {
    return this.getPlatform() === 'android';
  }

  /**
   * Verifica si está ejecutándose en web
   */
  static isWeb(): boolean {
    return this.getPlatform() === 'web';
  }

  /**
   * Verifica si está ejecutándose en una plataforma móvil nativa
   */
  static isMobile(): boolean {
    return this.isIOS() || this.isAndroid();
  }
}
