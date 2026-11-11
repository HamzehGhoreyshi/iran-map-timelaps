// The stops on the timeline, oldest first.
// Each stop is a snapshot of one year: `file` and `names` say which border file and which
// state names in it are highlighted as Persia (see tools/build-data.mjs).
// `en` and `fa` hold the caption in each language, kept short on purpose.
// One bright colour marks Persia in every year, so only its shape changes.
// `foreign: true` = an empire that ruled Iran from outside (capital and dynasty not Iranian):
// drawn in a lighter fill of the same colour, so it doesn't read as a Persian empire.
export const HIGHLIGHT = '#12c46b';

export const ERAS = [
  {
    id: 'parsua',
    en: { year: '844 BC', name: 'Parsua', desc: 'First written record of the Persians' },
    fa: { year: '۸۴۴ پ.م', name: 'پارسوا', desc: 'نخستین نام پارسیان در نوشته‌ها' },
    // No borders existed yet: an Assyrian inscription names the land of Parsua in the Zagros.
    marker: { lon: 46.8, lat: 35.4, radius: 2.2 },
    center: [50, 33],
  },
  {
    id: 'achaemenid',
    en: { year: '500 BC', name: 'Achaemenid Empire', desc: 'From the Nile to the Indus' },
    fa: { year: '۵۰۰ پ.م', name: 'شاهنشاهی هخامنشی', desc: 'از نیل تا سند' },
    file: 'bc500',
    names: ['Achaemenid Empire'],
  },
  {
    id: 'alexander',
    en: { year: '323 BC', name: 'Empire of Alexander', desc: 'Persia conquered by Macedon' },
    fa: { year: '۳۲۳ پ.م', name: 'امپراتوری اسکندر', desc: 'ایران به دست مقدونیان افتاد' },
    file: 'bc323',
    names: ['Empire of Alexander'],
    foreign: true,
  },
  {
    id: 'seleucid',
    en: { year: '300 BC', name: 'Seleucid Empire', desc: 'Greek kings rule Persia' },
    fa: { year: '۳۰۰ پ.م', name: 'سلوکیان', desc: 'شاهان یونانی بر ایران' },
    file: 'bc300',
    names: ['Seleucid Kingdom'],
    foreign: true,
  },
  {
    id: 'parthian',
    en: { year: 'AD 100', name: 'Parthian Empire', desc: 'Rome’s rival in the East' },
    fa: { year: '۱۰۰ میلادی', name: 'شاهنشاهی اشکانی', desc: 'رقیب روم در شرق' },
    file: '100',
    names: ['Parthian Empire'],
  },
  {
    id: 'sasanian',
    en: { year: '600', name: 'Sasanian Empire', desc: 'The last empire before Islam' },
    fa: { year: '۶۰۰ میلادی', name: 'شاهنشاهی ساسانی', desc: 'واپسین شاهنشاهی پیش از اسلام' },
    file: '600',
    names: ['Sasanian Empire'],
  },
  {
    id: 'abbasid',
    en: { year: '800', name: 'Abbasid Caliphate', desc: 'Iran ruled by Arab caliphs in Baghdad' },
    fa: { year: '۸۰۰ میلادی', name: 'خلافت عباسی', desc: 'ایران زیر فرمان خلیفه‌های عرب بغداد' },
    // The whole caliphate is shown (about 8 million km² in this file; ~11 at its 750 peak,
    // Taagepera 1979) — it really was larger than the Achaemenids, but it was not a Persian state.
    file: '800',
    names: ['Abbasid Caliphate'],
    foreign: true,
  },
  {
    id: 'samanid',
    en: { year: '900', name: 'Samanids and Saffarids', desc: 'Persian dynasties return' },
    fa: { year: '۹۰۰ میلادی', name: 'سامانیان و صفاریان', desc: 'بازگشت دودمان‌های ایرانی' },
    file: '900',
    names: ['Samanid Empire', 'Saffarids'],
  },
  {
    id: 'seljuk',
    en: { year: '1100', name: 'Seljuk Empire', desc: 'Turkic sultans, Persian court' },
    fa: { year: '۱۱۰۰ میلادی', name: 'سلجوقیان', desc: 'سلطان ترک، دربار پارسی' },
    file: '1100',
    names: ['Seljuk Empire'],
  },
  {
    id: 'ilkhanate',
    en: { year: '1300', name: 'Ilkhanate', desc: 'Mongol rule from Tabriz' },
    fa: { year: '۱۳۰۰ میلادی', name: 'ایلخانان', desc: 'فرمانروایی مغولان از تبریز' },
    file: '1300',
    names: ['Ilkhanate'],
  },
  {
    id: 'timurid',
    en: { year: '1400', name: 'Timurid Empire', desc: 'The conquests of Timur' },
    fa: { year: '۱۴۰۰ میلادی', name: 'تیموریان', desc: 'کشورگشایی‌های تیمور' },
    file: '1400',
    names: ['Timurid Empire'],
  },
  {
    id: 'safavid',
    en: { year: '1715', name: 'Safavid Empire', desc: 'Shia Iran takes shape' },
    fa: { year: '۱۷۱۵ میلادی', name: 'صفویان', desc: 'شکل‌گیری ایران شیعه' },
    file: '1715',
    names: ['Safavid Empire'],
  },
  {
    id: 'qajar',
    en: { year: '1800', name: 'Qajar Persia', desc: 'Tehran becomes the capital' },
    fa: { year: '۱۸۰۰ میلادی', name: 'قاجار', desc: 'تهران پایتخت شد' },
    file: '1800',
    names: ['Persia'],
  },
  {
    id: 'pahlavi',
    en: { year: '1938', name: 'Iran', desc: 'The world now says Iran, not Persia' },
    fa: { year: '۱۹۳۸ میلادی', name: 'ایران', desc: 'جهان دیگر می‌گوید ایران، نه پرشیا' },
    file: '1938',
    names: ['Iran'],
  },
  {
    id: 'today',
    en: { year: 'Today', name: 'Iran', desc: '31 provinces, about 90 million people' },
    fa: { year: 'امروز', name: 'ایران', desc: '۳۱ استان، حدود ۹۰ میلیون نفر' },
    file: '2010',
    names: ['Iran'],
  },
];
