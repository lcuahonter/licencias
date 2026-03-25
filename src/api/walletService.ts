// Integración con Google Wallet y Apple Wallet

export interface LicenseData {
  folio: string;
  nombre: string;
  rfc: string;
  tipo_licencia: string;
  expedicion: string;
  vigencia: string;
  fecha_nacimiento: string;
  sexo: string;
  nacionalidad: string;
  tipo_sangre: string;
  donador: string;
  telefono_emergencia: string;
  direccion: string;
  fotoUrl?: string;
}

export class WalletService {
  /**
   * Agrega una licencia a Google Wallet (llamada al backend)
   * @param licenseData Datos de la licencia
   * @param token Token de autenticación
   */
  static async addToGoogleWallet(licenseData: LicenseData, token?: string): Promise<void> {
    try {
      console.log('📱 Enviando datos al backend para generar JWT...');

      // IMPORTANTE: Actualiza esta URL con la de tu backend real
      const BACKEND_URL = import.meta.env.VITE_API_URL || '/api';
      
      // Llamar al backend para generar el JWT de forma segura
      const response = await fetch(`${BACKEND_URL}/wallet/google/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(licenseData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el JWT en el servidor');
      }

      const data = await response.json();

      if (!data.success || !data.saveUrl) {
        throw new Error('Respuesta inválida del servidor');
      }

      console.log('✅ JWT generado correctamente en el backend');
      console.log('🔗 URL de Google Wallet:', data.saveUrl);

      // Abrir la URL de Google Wallet en una nueva ventana
      const opened = window.open(data.saveUrl, '_blank');
      
      if (!opened) {
        throw new Error('Por favor permite ventanas emergentes para agregar a Google Wallet');
      }

    } catch (error: any) {
      console.error('❌ Error al agregar a Google Wallet:', error);
      throw new Error(error.message || 'No se pudo agregar la licencia a Google Wallet');
    }
  }

  /**
   * Agrega una licencia a Apple Wallet (Versión LOCAL - Solo descarga JSON)
   * @param licenseData Datos de la licencia
   * @param token Token de autenticación
   */
  static async addToAppleWallet(licenseData: LicenseData, token?: string): Promise<void> {
    try {
      // Crear el objeto pass.json para Apple Wallet
      const passJson = {
        formatVersion: 1,
        passTypeIdentifier: 'pass.mx.gob.durango.licencias',
        serialNumber: licenseData.folio,
        teamIdentifier: 'TEAM_ID',
        organizationName: 'Gobierno del Estado de Durango',
        description: 'Licencia de Conducir - Durango',
        logoText: 'Durango',
        foregroundColor: 'rgb(255, 255, 255)',
        backgroundColor: 'rgb(0, 92, 53)',
        labelColor: 'rgb(255, 255, 255)',
        barcode: {
          message: JSON.stringify({
            folio: licenseData.folio,
            nombre: licenseData.nombre,
            tipo_licencia: licenseData.tipo_licencia,
            vigencia: licenseData.vigencia,
            rfc: licenseData.rfc
          }),
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1',
          altText: licenseData.folio
        },
        barcodes: [
          {
            message: JSON.stringify({
              folio: licenseData.folio,
              nombre: licenseData.nombre,
              tipo_licencia: licenseData.tipo_licencia,
              vigencia: licenseData.vigencia
            }),
            format: 'PKBarcodeFormatQR',
            messageEncoding: 'iso-8859-1'
          }
        ],
        generic: {
          primaryFields: [
            {
              key: 'tipo',
              label: 'TIPO DE LICENCIA',
              value: licenseData.tipo_licencia
            }
          ],
          secondaryFields: [
            {
              key: 'nombre',
              label: 'NOMBRE',
              value: licenseData.nombre
            }
          ],
          auxiliaryFields: [
            {
              key: 'folio',
              label: 'NO. LICENCIA',
              value: licenseData.folio
            },
            {
              key: 'vigencia',
              label: 'VIGENCIA',
              value: licenseData.vigencia
            }
          ],
          backFields: [
            {
              key: 'expedicion',
              label: 'EXPEDICIÓN',
              value: licenseData.expedicion
            },
            {
              key: 'tipo_sangre',
              label: 'TIPO DE SANGRE',
              value: licenseData.tipo_sangre
            },
            {
              key: 'donador',
              label: 'DONADOR',
              value: licenseData.donador
            },
            {
              key: 'fecha_nacimiento',
              label: 'FECHA DE NACIMIENTO',
              value: licenseData.fecha_nacimiento
            },
            {
              key: 'sexo',
              label: 'SEXO',
              value: licenseData.sexo
            },
            {
              key: 'rfc',
              label: 'RFC',
              value: licenseData.rfc
            },
            {
              key: 'nacionalidad',
              label: 'NACIONALIDAD',
              value: licenseData.nacionalidad
            },
            {
              key: 'telefono_emergencia',
              label: 'TELÉFONO DE EMERGENCIA',
              value: licenseData.telefono_emergencia
            }
          ]
        }
      };

      // VERSIÓN LOCAL: Descargar como JSON para pruebas
      const jsonData = JSON.stringify({
        tipo: 'Apple Wallet Pass (pass.json)',
        fecha_generacion: new Date().toISOString(),
        passJson: passJson,
        licenseData: licenseData,
        instrucciones: [
          'Este es un archivo de prueba local (pass.json)',
          'Para crear un .pkpass real se requiere:',
          '1. Cuenta de Apple Developer ($99/año)',
          '2. Pass Type ID registrado',
          '3. Certificado de Pass Type ID',
          '4. Clave privada del certificado',
          '5. Certificado WWDR de Apple',
          '6. Imágenes (logo.png, icon.png, etc.)',
          '7. Firma PKCS7 del manifest.json',
          'Consulta WALLET_SETUP.md para más información'
        ],
        estructura_pkpass: {
          archivos: [
            'pass.json (este archivo)',
            'manifest.json (hashes SHA1 de todos los archivos)',
            'signature (firma PKCS7 del manifest)',
            'logo.png (160x50px)',
            'logo@2x.png (320x100px)',
            'icon.png (58x58px)',
            'icon@2x.png (116x116px)'
          ],
          nota: 'Un .pkpass es un archivo ZIP con extensión .pkpass'
        }
      }, null, 2);

      // Crear blob y descargar
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `apple-wallet-pass-${licenseData.folio}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Pass de Apple Wallet (modo local) descargado:', passJson);
    } catch (error) {
      console.error('Error al generar pass de Apple Wallet:', error);
      throw new Error('No se pudo generar el pass de Apple Wallet');
    }
  }

  /**
   * Genera los datos de la licencia en formato para Wallet
   * @param license Objeto de licencia
   * @param userData Datos del usuario
   */
  static prepareLicenseData(license: any, userData: any): LicenseData {
    const fullName = userData.nombres
      ? `${userData.nombres} ${userData.apellidopaterno || ''} ${userData.apellidomaterno || ''}`.trim()
      : `${userData.firstName || ''} ${userData.lastName || ''}`.trim();

    const licenseNo = license.folio || license.rawData?.numerolicencia || 'N/A';
    
    const getFormattedDate = () => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear() + 3;
      return `${day}/${month}/${year}`;
    };
    
    const validity = license.rawData?.vigencia?.includes('/') ? license.rawData.vigencia : getFormattedDate();
    const birthDate = userData.fechanacimiento || userData.birthDate || 'N/A';
    const bloodType = userData.tiposangre || userData.bloodGroup || 'N/A';
    const donor = userData.donador === 'Si' || userData.donadororg || userData.organDonor ? 'SI' : 'NO';
    const rfc = userData.rfc || 'N/A';
    const sexo = userData.sexo || 'N/A';
    const nacionalidad = userData.nacionalidad || 'MEXICANA';
    const emergencyPhone = userData.conocido_telefono || userData.telefono || '911';
    const address = userData.direccion
      ? `${userData.direccion}, ${userData.colonia || ''}, ${userData.municipio || ''}`
      : userData.address || 'Durango, Dgo.';

    return {
      folio: licenseNo,
      nombre: fullName,
      rfc: rfc,
      tipo_licencia: license.type,
      expedicion: license.rawData?.expedicion 
        ? new Date(license.rawData.expedicion).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'N/A',
      vigencia: validity,
      fecha_nacimiento: birthDate,
      sexo: sexo,
      nacionalidad: nacionalidad,
      tipo_sangre: bloodType,
      donador: donor,
      telefono_emergencia: emergencyPhone,
      direccion: address
    };
  }
}
