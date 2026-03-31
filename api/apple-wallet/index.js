const fs = require('fs');
const path = require('path');
const { createHash, createSign } = require('crypto');
const archiver = require('archiver');

// Configuración de Apple Wallet
// IMPORTANTE: Estas credenciales deben configurarse como variables de entorno en Azure
const APPLE_PASS_TYPE_ID = process.env.APPLE_PASS_TYPE_ID || 'pass.mx.gob.durango.licencias';
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_CERTIFICATE = process.env.APPLE_CERTIFICATE; // Certificado en formato PEM
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY; // Clave privada en formato PEM
const APPLE_WWDR_CERTIFICATE = process.env.APPLE_WWDR_CERTIFICATE; // Certificado intermedio de Apple

module.exports = async function (context, req) {
  context.log('Apple Wallet Create function processing a request.');

  try {
    const licenseData = req.body;

    if (!licenseData || !licenseData.folio) {
      context.res = {
        status: 400,
        body: {
          code: '400',
          message: 'Se requieren los datos de la licencia'
        }
      };
      return;
    }

    // Verificar que las credenciales de Apple Wallet estén configuradas
    if (!APPLE_TEAM_ID || !APPLE_CERTIFICATE || !APPLE_PRIVATE_KEY) {
      context.log.error('Credenciales de Apple Wallet no configuradas');
      context.res = {
        status: 500,
        body: {
          code: '500',
          message: 'Apple Wallet no está configurado correctamente en el servidor'
        }
      };
      return;
    }

    // Crear el objeto pass.json
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: APPLE_PASS_TYPE_ID,
      serialNumber: licenseData.folio,
      teamIdentifier: APPLE_TEAM_ID,
      organizationName: 'Gobierno del Estado de Durango',
      description: 'Licencia de Conducir',
      logoText: 'Durango',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(0, 92, 53)',
      labelColor: 'rgb(255, 255, 255)',
      barcode: {
        message: JSON.stringify({
          folio: licenseData.folio,
          nombre: licenseData.nombre,
          tipo_licencia: licenseData.tipo_licencia,
          vigencia: licenseData.vigencia
        }),
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1'
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
          }
        ]
      }
    };

    // Crear manifiesto con hashes SHA1
    const manifest = {
      'pass.json': createHash('sha1').update(JSON.stringify(passJson)).digest('hex')
    };

    // Crear firma del manifiesto
    const manifestJson = JSON.stringify(manifest);
    const privateKey = APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const sign = createSign('sha1');
    sign.update(manifestJson);
    const signature = sign.sign(privateKey);

    // En un entorno de producción, deberías generar un archivo .pkpass real con archiver
    // Por ahora, devolvemos un mensaje indicando que la función está lista pero requiere configuración

    context.res = {
      status: 501,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        code: '501',
        message: 'La generación de passes de Apple Wallet requiere configuración adicional en el servidor',
        data: {
          info: 'Se requiere configurar certificados y claves de Apple Developer',
          required: [
            'APPLE_PASS_TYPE_ID',
            'APPLE_TEAM_ID',
            'APPLE_CERTIFICATE',
            'APPLE_PRIVATE_KEY',
            'APPLE_WWDR_CERTIFICATE'
          ],
          passData: passJson
        }
      }
    };

  } catch (error) {
    context.log.error('Error al crear el pass de Apple Wallet:', error);
    context.res = {
      status: 500,
      body: {
        code: '500',
        message: 'Error al crear el pass de Apple Wallet',
        data: {
          error: error.message
        }
      }
    };
  }
};
