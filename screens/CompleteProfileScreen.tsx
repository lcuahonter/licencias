import React, { useState, useEffect, useRef } from 'react';
import { UserData } from '../types';
// Corregimos los imports para que sean relativos estándar
import { userService } from '../src/api/userService';
import { catalogService } from '../src/api/catalogService';
import { getGenderFromCurp } from '../src/utils/curpHelpers';
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

// Lista estática de países con emoji, código ISO y lada
const PHONE_COUNTRIES = [
    { name: 'México', iso2: 'mx', dialCode: '52', flag: '🇲🇽' },
    { name: 'Estados Unidos', iso2: 'us', dialCode: '1', flag: '🇺🇸' },
    { name: 'Canadá', iso2: 'ca', dialCode: '1', flag: '🇨🇦' },
    { name: 'Afghanistan', iso2: 'af', dialCode: '93', flag: '🇦🇫' },
    { name: 'Albania', iso2: 'al', dialCode: '355', flag: '🇦🇱' },
    { name: 'Alemania', iso2: 'de', dialCode: '49', flag: '🇩🇪' },
    { name: 'Andorra', iso2: 'ad', dialCode: '376', flag: '🇦🇩' },
    { name: 'Angola', iso2: 'ao', dialCode: '244', flag: '🇦🇴' },
    { name: 'Antigua y Barbuda', iso2: 'ag', dialCode: '1268', flag: '🇦🇬' },
    { name: 'Arabia Saudita', iso2: 'sa', dialCode: '966', flag: '🇸🇦' },
    { name: 'Argelia', iso2: 'dz', dialCode: '213', flag: '🇩🇿' },
    { name: 'Argentina', iso2: 'ar', dialCode: '54', flag: '🇦🇷' },
    { name: 'Armenia', iso2: 'am', dialCode: '374', flag: '🇦🇲' },
    { name: 'Australia', iso2: 'au', dialCode: '61', flag: '🇦🇺' },
    { name: 'Austria', iso2: 'at', dialCode: '43', flag: '🇦🇹' },
    { name: 'Azerbaiyán', iso2: 'az', dialCode: '994', flag: '🇦🇿' },
    { name: 'Bahamas', iso2: 'bs', dialCode: '1242', flag: '🇧🇸' },
    { name: 'Bahrein', iso2: 'bh', dialCode: '973', flag: '🇧🇭' },
    { name: 'Bangladesh', iso2: 'bd', dialCode: '880', flag: '🇧🇩' },
    { name: 'Barbados', iso2: 'bb', dialCode: '1246', flag: '🇧🇧' },
    { name: 'Bélgica', iso2: 'be', dialCode: '32', flag: '🇧🇪' },
    { name: 'Belice', iso2: 'bz', dialCode: '501', flag: '🇧🇿' },
    { name: 'Benín', iso2: 'bj', dialCode: '229', flag: '🇧🇯' },
    { name: 'Bielorrusia', iso2: 'by', dialCode: '375', flag: '🇧🇾' },
    { name: 'Bolivia', iso2: 'bo', dialCode: '591', flag: '🇧🇴' },
    { name: 'Bosnia y Herzegovina', iso2: 'ba', dialCode: '387', flag: '🇧🇦' },
    { name: 'Botsuana', iso2: 'bw', dialCode: '267', flag: '🇧🇼' },
    { name: 'Brasil', iso2: 'br', dialCode: '55', flag: '🇧🇷' },
    { name: 'Brunéi', iso2: 'bn', dialCode: '673', flag: '🇧🇳' },
    { name: 'Bulgaria', iso2: 'bg', dialCode: '359', flag: '🇧🇬' },
    { name: 'Burkina Faso', iso2: 'bf', dialCode: '226', flag: '🇧🇫' },
    { name: 'Burundi', iso2: 'bi', dialCode: '257', flag: '🇧🇮' },
    { name: 'Bután', iso2: 'bt', dialCode: '975', flag: '🇧🇹' },
    { name: 'Cabo Verde', iso2: 'cv', dialCode: '238', flag: '🇨🇻' },
    { name: 'Camboya', iso2: 'kh', dialCode: '855', flag: '🇰🇭' },
    { name: 'Camerún', iso2: 'cm', dialCode: '237', flag: '🇨🇲' },
    { name: 'Catar', iso2: 'qa', dialCode: '974', flag: '🇶🇦' },
    { name: 'Chad', iso2: 'td', dialCode: '235', flag: '🇹🇩' },
    { name: 'Chile', iso2: 'cl', dialCode: '56', flag: '🇨🇱' },
    { name: 'China', iso2: 'cn', dialCode: '86', flag: '🇨🇳' },
    { name: 'Chipre', iso2: 'cy', dialCode: '357', flag: '🇨🇾' },
    { name: 'Colombia', iso2: 'co', dialCode: '57', flag: '🇨🇴' },
    { name: 'Comoras', iso2: 'km', dialCode: '269', flag: '🇰🇲' },
    { name: 'Congo (Rep. Dem.)', iso2: 'cd', dialCode: '243', flag: '🇨🇩' },
    { name: 'Congo (Rep.)', iso2: 'cg', dialCode: '242', flag: '🇨🇬' },
    { name: 'Corea del Norte', iso2: 'kp', dialCode: '850', flag: '🇰🇵' },
    { name: 'Corea del Sur', iso2: 'kr', dialCode: '82', flag: '🇰🇷' },
    { name: 'Costa de Marfil', iso2: 'ci', dialCode: '225', flag: '🇨🇮' },
    { name: 'Costa Rica', iso2: 'cr', dialCode: '506', flag: '🇨🇷' },
    { name: 'Croacia', iso2: 'hr', dialCode: '385', flag: '🇭🇷' },
    { name: 'Cuba', iso2: 'cu', dialCode: '53', flag: '🇨🇺' },
    { name: 'Dinamarca', iso2: 'dk', dialCode: '45', flag: '🇩🇰' },
    { name: 'Djibouti', iso2: 'dj', dialCode: '253', flag: '🇩🇯' },
    { name: 'Dominica', iso2: 'dm', dialCode: '1767', flag: '🇩🇲' },
    { name: 'Ecuador', iso2: 'ec', dialCode: '593', flag: '🇪🇨' },
    { name: 'Egipto', iso2: 'eg', dialCode: '20', flag: '🇪🇬' },
    { name: 'El Salvador', iso2: 'sv', dialCode: '503', flag: '🇸🇻' },
    { name: 'Emiratos Árabes Unidos', iso2: 'ae', dialCode: '971', flag: '🇦🇪' },
    { name: 'Eritrea', iso2: 'er', dialCode: '291', flag: '🇪🇷' },
    { name: 'Eslovaquia', iso2: 'sk', dialCode: '421', flag: '🇸🇰' },
    { name: 'Eslovenia', iso2: 'si', dialCode: '386', flag: '🇸🇮' },
    { name: 'España', iso2: 'es', dialCode: '34', flag: '🇪🇸' },
    { name: 'Estonia', iso2: 'ee', dialCode: '372', flag: '🇪🇪' },
    { name: 'Esuatini', iso2: 'sz', dialCode: '268', flag: '🇸🇿' },
    { name: 'Etiopía', iso2: 'et', dialCode: '251', flag: '🇪🇹' },
    { name: 'Filipinas', iso2: 'ph', dialCode: '63', flag: '🇵🇭' },
    { name: 'Finlandia', iso2: 'fi', dialCode: '358', flag: '🇫🇮' },
    { name: 'Fiyi', iso2: 'fj', dialCode: '679', flag: '🇫🇯' },
    { name: 'Francia', iso2: 'fr', dialCode: '33', flag: '🇫🇷' },
    { name: 'Gabón', iso2: 'ga', dialCode: '241', flag: '🇬🇦' },
    { name: 'Gambia', iso2: 'gm', dialCode: '220', flag: '🇬🇲' },
    { name: 'Georgia', iso2: 'ge', dialCode: '995', flag: '🇬🇪' },
    { name: 'Ghana', iso2: 'gh', dialCode: '233', flag: '🇬🇭' },
    { name: 'Granada', iso2: 'gd', dialCode: '1473', flag: '🇬🇩' },
    { name: 'Grecia', iso2: 'gr', dialCode: '30', flag: '🇬🇷' },
    { name: 'Guatemala', iso2: 'gt', dialCode: '502', flag: '🇬🇹' },
    { name: 'Guinea', iso2: 'gn', dialCode: '224', flag: '🇬🇳' },
    { name: 'Guinea Ecuatorial', iso2: 'gq', dialCode: '240', flag: '🇬🇶' },
    { name: 'Guinea-Bisáu', iso2: 'gw', dialCode: '245', flag: '🇬🇼' },
    { name: 'Guyana', iso2: 'gy', dialCode: '592', flag: '🇬🇾' },
    { name: 'Haití', iso2: 'ht', dialCode: '509', flag: '🇭🇹' },
    { name: 'Honduras', iso2: 'hn', dialCode: '504', flag: '🇭🇳' },
    { name: 'Hungría', iso2: 'hu', dialCode: '36', flag: '🇭🇺' },
    { name: 'India', iso2: 'in', dialCode: '91', flag: '🇮🇳' },
    { name: 'Indonesia', iso2: 'id', dialCode: '62', flag: '🇮🇩' },
    { name: 'Irak', iso2: 'iq', dialCode: '964', flag: '🇮🇶' },
    { name: 'Irán', iso2: 'ir', dialCode: '98', flag: '🇮🇷' },
    { name: 'Irlanda', iso2: 'ie', dialCode: '353', flag: '🇮🇪' },
    { name: 'Islandia', iso2: 'is', dialCode: '354', flag: '🇮🇸' },
    { name: 'Islas Marshall', iso2: 'mh', dialCode: '692', flag: '🇲🇭' },
    { name: 'Islas Salomón', iso2: 'sb', dialCode: '677', flag: '🇸🇧' },
    { name: 'Israel', iso2: 'il', dialCode: '972', flag: '🇮🇱' },
    { name: 'Italia', iso2: 'it', dialCode: '39', flag: '🇮🇹' },
    { name: 'Jamaica', iso2: 'jm', dialCode: '1876', flag: '🇯🇲' },
    { name: 'Japón', iso2: 'jp', dialCode: '81', flag: '🇯🇵' },
    { name: 'Jordania', iso2: 'jo', dialCode: '962', flag: '🇯🇴' },
    { name: 'Kazajistán', iso2: 'kz', dialCode: '7', flag: '🇰🇿' },
    { name: 'Kenia', iso2: 'ke', dialCode: '254', flag: '🇰🇪' },
    { name: 'Kirguistán', iso2: 'kg', dialCode: '996', flag: '🇰🇬' },
    { name: 'Kiribati', iso2: 'ki', dialCode: '686', flag: '🇰🇮' },
    { name: 'Kuwait', iso2: 'kw', dialCode: '965', flag: '🇰🇼' },
    { name: 'Laos', iso2: 'la', dialCode: '856', flag: '🇱🇦' },
    { name: 'Lesoto', iso2: 'ls', dialCode: '266', flag: '🇱🇸' },
    { name: 'Letonia', iso2: 'lv', dialCode: '371', flag: '🇱🇻' },
    { name: 'Líbano', iso2: 'lb', dialCode: '961', flag: '🇱🇧' },
    { name: 'Liberia', iso2: 'lr', dialCode: '231', flag: '🇱🇷' },
    { name: 'Libia', iso2: 'ly', dialCode: '218', flag: '🇱🇾' },
    { name: 'Liechtenstein', iso2: 'li', dialCode: '423', flag: '🇱🇮' },
    { name: 'Lituania', iso2: 'lt', dialCode: '370', flag: '🇱🇹' },
    { name: 'Luxemburgo', iso2: 'lu', dialCode: '352', flag: '🇱🇺' },
    { name: 'Madagascar', iso2: 'mg', dialCode: '261', flag: '🇲🇬' },
    { name: 'Malasia', iso2: 'my', dialCode: '60', flag: '🇲🇾' },
    { name: 'Malaui', iso2: 'mw', dialCode: '265', flag: '🇲🇼' },
    { name: 'Maldivas', iso2: 'mv', dialCode: '960', flag: '🇲🇻' },
    { name: 'Mali', iso2: 'ml', dialCode: '223', flag: '🇲🇱' },
    { name: 'Malta', iso2: 'mt', dialCode: '356', flag: '🇲🇹' },
    { name: 'Marruecos', iso2: 'ma', dialCode: '212', flag: '🇲🇦' },
    { name: 'Mauricio', iso2: 'mu', dialCode: '230', flag: '🇲🇺' },
    { name: 'Mauritania', iso2: 'mr', dialCode: '222', flag: '🇲🇷' },
    { name: 'Micronesia', iso2: 'fm', dialCode: '691', flag: '🇫🇲' },
    { name: 'Moldavia', iso2: 'md', dialCode: '373', flag: '🇲🇩' },
    { name: 'Mónaco', iso2: 'mc', dialCode: '377', flag: '🇲🇨' },
    { name: 'Mongolia', iso2: 'mn', dialCode: '976', flag: '🇲🇳' },
    { name: 'Montenegro', iso2: 'me', dialCode: '382', flag: '🇲🇪' },
    { name: 'Mozambique', iso2: 'mz', dialCode: '258', flag: '🇲🇿' },
    { name: 'Myanmar (Birmania)', iso2: 'mm', dialCode: '95', flag: '🇲🇲' },
    { name: 'Namibia', iso2: 'na', dialCode: '264', flag: '🇳🇦' },
    { name: 'Nauru', iso2: 'nr', dialCode: '674', flag: '🇳🇷' },
    { name: 'Nepal', iso2: 'np', dialCode: '977', flag: '🇳🇵' },
    { name: 'Nicaragua', iso2: 'ni', dialCode: '505', flag: '🇳🇮' },
    { name: 'Níger', iso2: 'ne', dialCode: '227', flag: '🇳🇪' },
    { name: 'Nigeria', iso2: 'ng', dialCode: '234', flag: '🇳🇬' },
    { name: 'Noruega', iso2: 'no', dialCode: '47', flag: '🇳🇴' },
    { name: 'Nueva Zelanda', iso2: 'nz', dialCode: '64', flag: '🇳🇿' },
    { name: 'Omán', iso2: 'om', dialCode: '968', flag: '🇴🇲' },
    { name: 'Países Bajos', iso2: 'nl', dialCode: '31', flag: '🇳🇱' },
    { name: 'Pakistán', iso2: 'pk', dialCode: '92', flag: '🇵🇰' },
    { name: 'Palaos', iso2: 'pw', dialCode: '680', flag: '🇵🇼' },
    { name: 'Palestina', iso2: 'ps', dialCode: '970', flag: '🇵🇸' },
    { name: 'Panamá', iso2: 'pa', dialCode: '507', flag: '🇵🇦' },
    { name: 'Papúa Nueva Guinea', iso2: 'pg', dialCode: '675', flag: '🇵🇬' },
    { name: 'Paraguay', iso2: 'py', dialCode: '595', flag: '🇵🇾' },
    { name: 'Perú', iso2: 'pe', dialCode: '51', flag: '🇵🇪' },
    { name: 'Polonia', iso2: 'pl', dialCode: '48', flag: '🇵🇱' },
    { name: 'Portugal', iso2: 'pt', dialCode: '351', flag: '🇵🇹' },
    { name: 'Puerto Rico', iso2: 'pr', dialCode: '1787', flag: '🇵🇷' },
    { name: 'Reino Unido', iso2: 'gb', dialCode: '44', flag: '🇬🇧' },
    { name: 'República Centroafricana', iso2: 'cf', dialCode: '236', flag: '🇨🇫' },
    { name: 'República Checa', iso2: 'cz', dialCode: '420', flag: '🇨🇿' },
    { name: 'República Dominicana', iso2: 'do', dialCode: '1809', flag: '🇩🇴' },
    { name: 'Ruanda', iso2: 'rw', dialCode: '250', flag: '🇷🇼' },
    { name: 'Rumania', iso2: 'ro', dialCode: '40', flag: '🇷🇴' },
    { name: 'Rusia', iso2: 'ru', dialCode: '7', flag: '🇷🇺' },
    { name: 'Samoa', iso2: 'ws', dialCode: '685', flag: '🇼🇸' },
    { name: 'San Cristóbal y Nieves', iso2: 'kn', dialCode: '1869', flag: '🇰🇳' },
    { name: 'San Marino', iso2: 'sm', dialCode: '378', flag: '🇸🇲' },
    { name: 'San Vicente y las Granadinas', iso2: 'vc', dialCode: '1784', flag: '🇻🇨' },
    { name: 'Santa Lucía', iso2: 'lc', dialCode: '1758', flag: '🇱🇨' },
    { name: 'Santo Tomé y Príncipe', iso2: 'st', dialCode: '239', flag: '🇸🇹' },
    { name: 'Senegal', iso2: 'sn', dialCode: '221', flag: '🇸🇳' },
    { name: 'Serbia', iso2: 'rs', dialCode: '381', flag: '🇷🇸' },
    { name: 'Seychelles', iso2: 'sc', dialCode: '248', flag: '🇸🇨' },
    { name: 'Sierra Leona', iso2: 'sl', dialCode: '232', flag: '🇸🇱' },
    { name: 'Singapur', iso2: 'sg', dialCode: '65', flag: '🇸🇬' },
    { name: 'Siria', iso2: 'sy', dialCode: '963', flag: '🇸🇾' },
    { name: 'Somalia', iso2: 'so', dialCode: '252', flag: '🇸🇴' },
    { name: 'Sri Lanka', iso2: 'lk', dialCode: '94', flag: '🇱🇰' },
    { name: 'Sudáfrica', iso2: 'za', dialCode: '27', flag: '🇿🇦' },
    { name: 'Sudán', iso2: 'sd', dialCode: '249', flag: '🇸🇩' },
    { name: 'Sudán del Sur', iso2: 'ss', dialCode: '211', flag: '🇸🇸' },
    { name: 'Suecia', iso2: 'se', dialCode: '46', flag: '🇸🇪' },
    { name: 'Suiza', iso2: 'ch', dialCode: '41', flag: '🇨🇭' },
    { name: 'Surinam', iso2: 'sr', dialCode: '597', flag: '🇸🇷' },
    { name: 'Tailandia', iso2: 'th', dialCode: '66', flag: '🇹🇭' },
    { name: 'Tanzania', iso2: 'tz', dialCode: '255', flag: '🇹🇿' },
    { name: 'Tayikistán', iso2: 'tj', dialCode: '992', flag: '🇹🇯' },
    { name: 'Timor Oriental', iso2: 'tl', dialCode: '670', flag: '🇹🇱' },
    { name: 'Togo', iso2: 'tg', dialCode: '228', flag: '🇹🇬' },
    { name: 'Tonga', iso2: 'to', dialCode: '676', flag: '🇹🇴' },
    { name: 'Trinidad y Tobago', iso2: 'tt', dialCode: '1868', flag: '🇹🇹' },
    { name: 'Túnez', iso2: 'tn', dialCode: '216', flag: '🇹🇳' },
    { name: 'Turkmenistán', iso2: 'tm', dialCode: '993', flag: '🇹🇲' },
    { name: 'Turquía', iso2: 'tr', dialCode: '90', flag: '🇹🇷' },
    { name: 'Tuvalu', iso2: 'tv', dialCode: '688', flag: '🇹🇻' },
    { name: 'Ucrania', iso2: 'ua', dialCode: '380', flag: '🇺🇦' },
    { name: 'Uganda', iso2: 'ug', dialCode: '256', flag: '🇺🇬' },
    { name: 'Uruguay', iso2: 'uy', dialCode: '598', flag: '🇺🇾' },
    { name: 'Uzbekistán', iso2: 'uz', dialCode: '998', flag: '🇺🇿' },
    { name: 'Vanuatu', iso2: 'vu', dialCode: '678', flag: '🇻🇺' },
    { name: 'Venezuela', iso2: 've', dialCode: '58', flag: '🇻🇪' },
    { name: 'Vietnam', iso2: 'vn', dialCode: '84', flag: '🇻🇳' },
    { name: 'Yemen', iso2: 'ye', dialCode: '967', flag: '🇾🇪' },
    { name: 'Yibuti', iso2: 'dj', dialCode: '253', flag: '🇩🇯' },
    { name: 'Zambia', iso2: 'zm', dialCode: '260', flag: '🇿🇲' },
    { name: 'Zimbabue', iso2: 'zw', dialCode: '263', flag: '🇿🇼' },
    { name: 'Grecia', iso2: 'gr', dialCode: '30', flag: '🇬🇷' },
    { name: 'Hungría', iso2: 'hu', dialCode: '36', flag: '🇭🇺' },
    { name: 'Irlanda', iso2: 'ie', dialCode: '353', flag: '🇮🇪' },
    { name: 'Macedonia del Norte', iso2: 'mk', dialCode: '389', flag: '🇲🇰' },
    { name: 'Bosnia y Herzegovina', iso2: 'ba', dialCode: '387', flag: '🇧🇦' },
    { name: 'Kosovo', iso2: 'xk', dialCode: '383', flag: '🇽🇰' },
    { name: 'Guadalupe', iso2: 'gp', dialCode: '590', flag: '🇬🇵' },
    { name: 'Martinica', iso2: 'mq', dialCode: '596', flag: '🇲🇶' },
    { name: 'Reunión', iso2: 're', dialCode: '262', flag: '🇷🇪' },
    { name: 'Polinesia Francesa', iso2: 'pf', dialCode: '689', flag: '🇵🇫' },
    { name: 'Nueva Caledonia', iso2: 'nc', dialCode: '687', flag: '🇳🇨' },
    { name: 'Mayotte', iso2: 'yt', dialCode: '262', flag: '🇾🇹' },
    { name: 'Guayana Francesa', iso2: 'gf', dialCode: '594', flag: '🇬🇫' },
    { name: 'Islas Feroe', iso2: 'fo', dialCode: '298', flag: '🇫🇴' },
    { name: 'Groenlandia', iso2: 'gl', dialCode: '299', flag: '🇬🇱' },
    { name: 'Gibraltar', iso2: 'gi', dialCode: '350', flag: '🇬🇮' },
    { name: 'Macao', iso2: 'mo', dialCode: '853', flag: '🇲🇴' },
    { name: 'Hong Kong', iso2: 'hk', dialCode: '852', flag: '🇭🇰' },
    { name: 'Taiwán', iso2: 'tw', dialCode: '886', flag: '🇹🇼' },
];

const PhoneInput = ({ phoneValue, ladaValue, onPhoneChange, onLadaChange, label = 'Teléfono', error }: any) => {
    const onLadaChangeRef = useRef(onLadaChange);
    onLadaChangeRef.current = onLadaChange;

    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(PHONE_COUNTRIES[0]); // México por defecto

    const selectCountry = (c: typeof PHONE_COUNTRIES[0]) => {
        setSelected(c);
        onLadaChangeRef.current('+' + c.dialCode);
        setShowModal(false);
        setSearch('');
    };

    // Inicializar lada al montar
    useEffect(() => {
        onLadaChangeRef.current('+' + selected.dialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = PHONE_COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        ('+' + c.dialCode).includes(search)
    );

    return (
        <div className="col-span-2 space-y-1">
            <label className={`text-[10px] font-bold uppercase ml-1 ${error ? 'text-red-500' : 'text-gray-500'}`}>
                {label}
            </label>
            <div className={`flex items-center rounded-xl border-2 h-12 transition-all ${
                error ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}>
                {/* Botón selector de país */}
                <button
                    type="button"
                    onClick={() => { setSearch(''); setShowModal(true); }}
                    className="flex items-center gap-1.5 h-full px-3 border-r border-gray-200 dark:border-gray-600 shrink-0 active:bg-gray-50 dark:active:bg-gray-700 rounded-l-xl"
                >
                    <img
                        src={`https://flagcdn.com/w20/${selected.iso2}.png`}
                        srcSet={`https://flagcdn.com/w40/${selected.iso2}.png 2x`}
                        alt={selected.name}
                        className="w-5 h-auto rounded-sm shrink-0"
                        loading="eager"
                    />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">+{selected.dialCode}</span>
                    <span className="text-gray-400 text-xs">▾</span>
                </button>
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

            {/* Modal centrado en pantalla */}
            {showModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl flex flex-col"
                        style={{ maxHeight: '75vh' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
                            <h3 className="font-bold text-sm text-gray-800 dark:text-white">Selecciona el prefijo</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold"
                            >✕</button>
                        </div>
                        {/* Búsqueda */}
                        <div className="px-4 py-2 shrink-0">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar país o código..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-10 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-800 dark:text-white outline-none border-2 border-transparent focus:border-indigo-400"
                            />
                        </div>
                        {/* Lista */}
                        <div className="overflow-y-auto flex-1 px-2 pb-4">
                            {filtered.map((c) => (
                                <button
                                    key={c.iso2}
                                    type="button"
                                    onClick={() => selectCountry(c)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors active:scale-95 ${
                                        selected.iso2 === c.iso2
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <img
                                        src={`https://flagcdn.com/w20/${c.iso2}.png`}
                                        srcSet={`https://flagcdn.com/w40/${c.iso2}.png 2x`}
                                        alt={c.name}
                                        className="w-6 h-auto rounded-sm shrink-0"
                                        loading="lazy"
                                    />
                                    <span className="flex-1 font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{c.name}</span>
                                    <span className={`text-xs font-bold shrink-0 ${selected.iso2 === c.iso2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>+{c.dialCode}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
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
