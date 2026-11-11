// Names printed on the map. Only the countries listed here get a name, so the map
// never gets crowded. The key is the country's name in the border data; `en` and `fa`
// are what is printed. `at: [lon, lat]` overrides the computed spot (the roomiest point),
// for a name that should sit in the visual middle of its country instead.
export const LABELS = {
  Iran: { en: 'Iran', fa: 'ایران', at: [53.8, 32.6] },
  Iraq: { en: 'Iraq', fa: 'عراق' },
  Turkey: { en: 'Turkey', fa: 'ترکیه' },
  Syria: { en: 'Syria', fa: 'سوریه' },
  Egypt: { en: 'Egypt', fa: 'مصر' },
  Libya: { en: 'Libya', fa: 'لیبی' },
  Greece: { en: 'Greece', fa: 'یونان' },
  'Saudi Arabia': { en: 'Saudi Arabia', fa: 'عربستان' },
  Oman: { en: 'Oman', fa: 'عمان' },
  Yemen: { en: 'Yemen', fa: 'یمن' },
  Afghanistan: { en: 'Afghanistan', fa: 'افغانستان' },
  Pakistan: { en: 'Pakistan', fa: 'پاکستان' },
  India: { en: 'India', fa: 'هند' },
  Turkmenistan: { en: 'Turkmenistan', fa: 'ترکمنستان' },
  Uzbekistan: { en: 'Uzbekistan', fa: 'ازبکستان' },
  Kazakhstan: { en: 'Kazakhstan', fa: 'قزاقستان' },
  Russia: { en: 'Russia', fa: 'روسیه' },
  China: { en: 'China', fa: 'چین' },
};
