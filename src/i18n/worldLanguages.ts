import type { CoreLanguageCode } from '../types';

export interface WorldLanguageEntry {
  code: string;
  englishName: string;
  nativeName: string;
  localizedName: string;
  dir: 'rtl' | 'ltr';
}

const RTL_CODES = new Set(['ar', 'ur', 'fa', 'ps', 'he', 'yi', 'sd', 'ug', 'dv', 'ku']);

export const CORE_LANG_CODES: CoreLanguageCode[] = ['ar', 'en', 'fr', 'tr', 'ur', 'id', 'es'];

export function resolveCoreLang(code: string | undefined): CoreLanguageCode {
  const normalized = (code || 'ar').toLowerCase().split('-')[0];
  if ((CORE_LANG_CODES as string[]).includes(normalized)) {
    return normalized as CoreLanguageCode;
  }
  return 'en';
}

export function isRtlLanguage(code: string): boolean {
  const base = (code || '').toLowerCase().split('-')[0];
  return RTL_CODES.has(base);
}

// Comprehensive ISO 639-1 + major world languages catalog [code, englishName, fallbackNativeName]
const RAW_WORLD_LANGUAGES: Array<[string, string, string]> = [
  ['ar', 'Arabic', 'العربية'],
  ['en', 'English', 'English'],
  ['fr', 'French', 'Français'],
  ['es', 'Spanish', 'Español'],
  ['tr', 'Turkish', 'Türkçe'],
  ['ur', 'Urdu', 'اردو'],
  ['id', 'Indonesian', 'Bahasa Indonesia'],
  ['zgh', 'Amazigh (Tamazight)', 'ⵜⴰⵎⴰⵣⵉⵖⵜ'],
  ['ms', 'Malay', 'Bahasa Melayu'],
  ['fa', 'Persian', 'فارسی'],
  ['de', 'German', 'Deutsch'],
  ['it', 'Italian', 'Italiano'],
  ['pt', 'Portuguese', 'Português'],
  ['nl', 'Dutch', 'Nederlands'],
  ['ru', 'Russian', 'Русский'],
  ['zh', 'Chinese', '中文'],
  ['ja', 'Japanese', '日本語'],
  ['ko', 'Korean', '한국어'],
  ['hi', 'Hindi', 'हिन्दी'],
  ['bn', 'Bengali', 'বাংলা'],
  ['pa', 'Punjabi', 'ਪੰਜਾਬੀ'],
  ['sw', 'Swahili', 'Kiswahili'],
  ['ha', 'Hausa', 'Hausa'],
  ['so', 'Somali', 'Soomaali'],
  ['am', 'Amharic', 'አማርኛ'],
  ['yo', 'Yoruba', 'Yorùbá'],
  ['ig', 'Igbo', 'Igbo'],
  ['zu', 'Zulu', 'isiZulu'],
  ['xh', 'Xhosa', 'isiXhosa'],
  ['af', 'Afrikaans', 'Afrikaans'],
  ['ps', 'Pashto', 'پښتو'],
  ['ku', 'Kurdish', 'Kurdî'],
  ['sd', 'Sindhi', 'سنڌي'],
  ['ug', 'Uyghur', 'ئۇيغۇرچە'],
  ['dv', 'Dhivehi', 'ދިވެހި'],
  ['az', 'Azerbaijani', 'Azərbaycan'],
  ['uz', 'Uzbek', 'Oʻzbekcha'],
  ['kk', 'Kazakh', 'Қазақ тілі'],
  ['ky', 'Kyrgyz', 'Кыргызча'],
  ['tg', 'Tajik', 'Тоҷикӣ'],
  ['tk', 'Turkmen', 'Türkmençe'],
  ['tt', 'Tatar', 'Татарча'],
  ['bs', 'Bosnian', 'Bosanski'],
  ['sq', 'Albanian', 'Shqip'],
  ['pl', 'Polish', 'Polski'],
  ['uk', 'Ukrainian', 'Українська'],
  ['ro', 'Romanian', 'Română'],
  ['el', 'Greek', 'Ελληνικά'],
  ['sv', 'Swedish', 'Svenska'],
  ['da', 'Danish', 'Dansk'],
  ['no', 'Norwegian', 'Norsk'],
  ['fi', 'Finnish', 'Suomi'],
  ['is', 'Icelandic', 'Íslenska'],
  ['cs', 'Czech', 'Čeština'],
  ['sk', 'Slovak', 'Slovenčina'],
  ['hu', 'Hungarian', 'Magyar'],
  ['bg', 'Bulgarian', 'Български'],
  ['sr', 'Serbian', 'Српски'],
  ['hr', 'Croatian', 'Hrvatski'],
  ['sl', 'Slovenian', 'Slovenščina'],
  ['lt', 'Lithuanian', 'Lietuvių'],
  ['lv', 'Latvian', 'Latviešu'],
  ['et', 'Estonian', 'Eesti'],
  ['mk', 'Macedonian', 'Македонски'],
  ['be', 'Belarusian', 'Беларуская'],
  ['ca', 'Catalan', 'Català'],
  ['gl', 'Galician', 'Galego'],
  ['eu', 'Basque', 'Euskara'],
  ['ga', 'Irish', 'Gaeilge'],
  ['cy', 'Welsh', 'Cymraeg'],
  ['gd', 'Scottish Gaelic', 'Gàidhlig'],
  ['mt', 'Maltese', 'Malti'],
  ['lb', 'Luxembourgish', 'Lëtzebuergesch'],
  ['fy', 'Western Frisian', 'Frysk'],
  ['ta', 'Tamil', 'தமிழ்'],
  ['te', 'Telugu', 'తెలుగు'],
  ['ml', 'Malayalam', 'മലയാളം'],
  ['kn', 'Kannada', 'ಕನ್ನಡ'],
  ['mr', 'Marathi', 'मराठी'],
  ['gu', 'Gujarati', 'ગુજરાતી'],
  ['or', 'Odia', 'ଓଡ଼ିଆ'],
  ['as', 'Assamese', 'অসমীয়া'],
  ['ne', 'Nepali', 'नेपाली'],
  ['si', 'Sinhala', 'සිංහල'],
  ['th', 'Thai', 'ไทย'],
  ['vi', 'Vietnamese', 'Tiếng Việt'],
  ['tl', 'Filipino / Tagalog', 'Tagalog'],
  ['jv', 'Javanese', 'Basa Jawa'],
  ['su', 'Sundanese', 'Basa Sunda'],
  ['km', 'Khmer', 'ខ្មែរ'],
  ['lo', 'Lao', 'ລາວ'],
  ['my', 'Burmese', 'မြန်မာ'],
  ['ka', 'Georgian', 'ქართული'],
  ['hy', 'Armenian', 'Հայերեն'],
  ['mn', 'Mongolian', 'Монгол'],
  ['bo', 'Tibetan', 'བོད་ཡིག'],
  ['dz', 'Dzongkha', 'རྫོང་ཁ'],
  ['he', 'Hebrew', 'עברית'],
  ['yi', 'Yiddish', 'ייִדיש'],
  ['ti', 'Tigrinya', 'ትግርኛ'],
  ['om', 'Oromo', 'Afaan Oromoo'],
  ['rw', 'Kinyarwanda', 'Ikinyarwanda'],
  ['rn', 'Kirundi', 'Ikirundi'],
  ['lg', 'Ganda', 'Luganda'],
  ['sn', 'Shona', 'chiShona'],
  ['ny', 'Chichewa', 'Chichewa'],
  ['st', 'Southern Sotho', 'Sesotho'],
  ['tn', 'Tswana', 'Setswana'],
  ['ts', 'Tsonga', 'Xitsonga'],
  ['ve', 'Venda', 'Tshivenḓa'],
  ['ss', 'Swati', 'SiSwati'],
  ['nr', 'South Ndebele', 'isiNdebele'],
  ['nd', 'North Ndebele', 'isiNdebele'],
  ['mg', 'Malagasy', 'Malagasy'],
  ['wo', 'Wolof', 'Wolof'],
  ['ff', 'Fulah', 'Fulfulde'],
  ['bm', 'Bambara', 'Bamanankan'],
  ['ee', 'Ewe', 'Eʋegbe'],
  ['ak', 'Akan', 'Akan'],
  ['tw', 'Twi', 'Twi'],
  ['ln', 'Lingala', 'Lingála'],
  ['kg', 'Kongo', 'Kikongo'],
  ['lu', 'Luba-Katanga', 'Tshiluba'],
  ['ki', 'Kikuyu', 'Gĩkũyũ'],
  ['sg', 'Sango', 'Sängö'],
  ['aa', 'Afar', 'Qafaraf'],
  ['ks', 'Kashmiri', 'कॉशुर'],
  ['sa', 'Sanskrit', 'संस्कृतम्'],
  ['bh', 'Bihari', 'भोजपुरी'],
  ['dv', 'Maldivian', 'ދިވެހި'],
  ['ht', 'Haitian Creole', 'Kreyòl ayisyen'],
  ['qu', 'Quechua', 'Runa Simi'],
  ['gn', 'Guarani', 'Avañeʼẽ'],
  ['ay', 'Aymara', 'Aymar aru'],
  ['mi', 'Maori', 'Te Reo Māori'],
  ['sm', 'Samoan', 'Gagana Samoa'],
  ['to', 'Tongan', 'Lea faka-Tonga'],
  ['fj', 'Fijian', 'Vosa Vakaviti'],
  ['ty', 'Tahitian', 'Reo Tahiti'],
  ['haw', 'Hawaiian', 'ʻŌlelo Hawaiʻi'],
  ['eo', 'Esperanto', 'Esperanto'],
  ['la', 'Latin', 'Latina'],
  ['br', 'Breton', 'Brezhoneg'],
  ['oc', 'Occitan', 'Occitan'],
  ['co', 'Corsican', 'Corsu'],
  ['sc', 'Sardinian', 'Sardu'],
  ['rm', 'Romansh', 'Rumantsch'],
  ['fo', 'Faroese', 'Føroyskt'],
  ['kl', 'Kalaallisut', 'Kalaallisut'],
  ['se', 'Northern Sami', 'Davvisámegiella'],
  ['kw', 'Cornish', 'Kernewek'],
  ['gv', 'Manx', 'Gaelg'],
  ['an', 'Aragonese', 'Aragonés'],
  ['wa', 'Walloon', 'Walon'],
  ['eo', 'Esperanto', 'Esperanto'],
  ['ia', 'Interlingua', 'Interlingua'],
  ['ie', 'Interlingue', 'Interlingue'],
  ['io', 'Ido', 'Ido'],
  ['vo', 'Volapük', 'Volapük'],
  ['ab', 'Abkhazian', 'Аԥсуа'],
  ['av', 'Avaric', 'Авар'],
  ['ba', 'Bashkir', 'Башҡортса'],
  ['ce', 'Chechen', 'Нохчийн'],
  ['cv', 'Chuvash', 'Чӑвашла'],
  ['kv', 'Komi', 'Коми'],
  ['os', 'Ossetian', 'Ирон'],
  ['sah', 'Yakut', 'Саха тыла'],
  ['nb', 'Norwegian Bokmål', 'Norsk bokmål'],
  ['nn', 'Norwegian Nynorsk', 'Nynorsk'],
  ['ch', 'Chamorro', 'Chamoru'],
  ['mh', 'Marshallese', 'Kajin M̧ajeļ'],
  ['na', 'Nauru', 'Dorerin Naoero'],
  ['bi', 'Bislama', 'Bislama'],
  ['cr', 'Cree', 'ᓀᐦᐃᔭᐍᐏᐣ'],
  ['iu', 'Inuktitut', 'ᐃᓄᒃᑎᑐᑦ'],
  ['oj', 'Ojibwa', 'Anishinaabemowin'],
  ['nv', 'Navajo', 'Diné bizaad'],
  ['ik', 'Inupiaq', 'Iñupiatun'],
  ['pi', 'Pali', 'पालि'],
  ['km', 'Central Khmer', 'ខ្មែរ'],
  ['br', 'Breton', 'Brezhoneg'],
  ['za', 'Zhuang', 'Sawcuengh'],
  ['ii', 'Sichuan Yi', 'ꆈꌠꉙ'],
];

// Deduplicate by ISO code cleanly while preserving curated order
const UNIQUE_RAW_WORLD_LANGUAGES: Array<[string, string, string]> = [];
const seenCodes = new Set<string>();
for (const item of RAW_WORLD_LANGUAGES) {
  if (!seenCodes.has(item[0])) {
    seenCodes.add(item[0]);
    UNIQUE_RAW_WORLD_LANGUAGES.push(item);
  }
}

const QURAN_EDITION_LABELS: Record<string, string> = {
  ar: 'التفسير الميسر',
  en: 'Sahih International',
  fr: 'Muhammad Hamidullah',
  tr: 'Diyanet İşleri',
  ur: 'فتح محمد جالندھری',
  id: 'Kemenag RI',
  es: 'Julio Cortés',
  ms: 'Abdullah Muhammad Basmeih',
  de: 'Bubenheim & Elyas',
  fa: 'مکارم شیرازی',
  ru: 'Эльмир Кулиев',
  bn: 'Muhiuddin Khan',
  hi: 'Suhel Farooq Khan',
  zh: 'Ma Jian',
  ja: 'Japanese Quran',
  ko: 'Korean Quran',
  it: 'Hamza Roberto Piccardo',
  pt: 'Samir El-Hayek',
  nl: 'Salomo Keyzer',
  sv: 'Knut Bernström',
  pl: 'Józef Bielawski',
  so: 'Mahmud Muhammad Abduh',
  sw: 'Ali Muhsin Al-Barwani',
  uz: 'Muhammad Sodik',
  az: 'Vasim Məmmədəliyev',
  bs: 'Besim Korkut',
  sq: 'Efendi Nahi',
  ha: 'Abubakar Mahmoud Gumi',
  th: 'King Fahd Complex',
  ta: 'Jan Turst Foundation',
  ml: 'Abdul Hameed',
  ps: 'Abdulwali Khan',
  ku: 'Burhan Muhammad-Amin',
  tg: 'AbdolMohammad Ayati',
  ug: 'Muhammad Saleh',
};

export function getQuranEditionLabel(code: string): string {
  const base = (code || 'ar').toLowerCase().split('-')[0];
  return QURAN_EDITION_LABELS[base] || 'Sahih International';
}

export function getWorldLanguages(uiLang: string): WorldLanguageEntry[] {
  let uiNames: Intl.DisplayNames | null = null;
  try {
    uiNames = new Intl.DisplayNames([uiLang], { type: 'language' });
  } catch {
    uiNames = null;
  }

  return UNIQUE_RAW_WORLD_LANGUAGES.map(([code, englishName, fallbackNative]) => {
    let nativeName = fallbackNative;
    try {
      const nativeDisp = new Intl.DisplayNames([code], { type: 'language' }).of(code);
      if (nativeDisp && nativeDisp.toLowerCase() !== code.toLowerCase()) {
        nativeName = nativeDisp.charAt(0).toUpperCase() + nativeDisp.slice(1);
      }
    } catch {
      nativeName = fallbackNative;
    }

    let localizedName = englishName;
    try {
      const disp = uiNames?.of(code);
      if (disp && disp.toLowerCase() !== code.toLowerCase()) {
        localizedName = disp;
      }
    } catch {
      localizedName = englishName;
    }

    return {
      code,
      englishName,
      nativeName,
      localizedName,
      dir: isRtlLanguage(code) ? 'rtl' : 'ltr',
    };
  });
}

export function getWorldLanguageByCode(code: string, uiLang = 'en'): WorldLanguageEntry {
  const found = getWorldLanguages(uiLang).find(
    (l) => l.code.toLowerCase() === (code || 'ar').toLowerCase()
  );
  if (found) return found;
  return {
    code,
    englishName: code,
    nativeName: code,
    localizedName: code,
    dir: isRtlLanguage(code) ? 'rtl' : 'ltr',
  };
}
