// Interface text in each language. The caption text of every stop lives in eras.js.
// Elements in index.html pick their text with data-t="key" (plain text) or
// data-t-html="key" (text that contains a link).
export const LANGS = {
  en: {
    dir: 'ltr',
    todaySide: 'right', // where "Today" sits on the timeline: English starts with BC on the left
    native: 'English',
    title: 'Persia through time — 2,800 years of borders on one globe',
    mark: 'Persia through time',
    sources: 'Sources',
    language: 'Language',
    timeline: 'Timeline',
    sourcesIntro: 'Each stop is a snapshot of one year. Old borders were never sharp lines, so every shape here is an approximation.',
    bordersLabel: 'Borders and coastlines',
    bordersText: '<a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener">historical-basemaps</a> by André Ourednik, GPL-3.0.',
    parsuaLabel: '844 BC',
    parsuaText: 'An inscription of the Assyrian king Shalmaneser III names the land of Parsua in the Zagros. The glow marks the region, not a border.',
    close: 'Close',
  },
  fa: {
    dir: 'rtl',
    todaySide: 'left', // Persian reads right to left, so BC starts on the right
    native: 'فارسی',
    title: 'ایران در گذر زمان — ۲۸۰۰ سال مرز روی یک کره',
    mark: 'ایران در گذر زمان',
    sources: 'منابع',
    language: 'زبان',
    timeline: 'خط زمان',
    sourcesIntro: 'هر ایستگاه تصویری از یک سال است. مرزهای کهن هیچ‌گاه خط دقیقی نبوده‌اند، پس همهٔ شکل‌ها تقریبی‌اند.',
    bordersLabel: 'مرزها و خط ساحلی',
    bordersText: 'پروژهٔ <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener" dir="ltr">historical-basemaps</a> از آندره اوردنیک، با پروانهٔ GPL-3.0.',
    parsuaLabel: '۸۴۴ پ.م',
    parsuaText: 'کتیبهٔ شلمنصر سوم، شاه آشور، از سرزمین پارسوا در زاگرس نام می‌برد. هاله جای تقریبی را نشان می‌دهد، نه مرز.',
    close: 'بستن',
  },
};

// Small drawn flags: emoji flags sit at different heights on each system, and Windows shows letters instead.
export const FLAGS = {
  fa: '<svg viewBox="0 0 21 15"><rect width="21" height="5" fill="#239f40"/><rect y="5" width="21" height="5" fill="#fff"/><rect y="10" width="21" height="5" fill="#da0000"/><path d="M10.5 6.1c-.9.3-1.3 1-1.3 1.5 0 .6.5 1.2 1.3 1.4.8-.2 1.3-.8 1.3-1.4 0-.5-.4-1.2-1.3-1.5Z" fill="none" stroke="#da0000" stroke-width=".55"/><path d="M10.5 6.4v2.4" stroke="#da0000" stroke-width=".55"/></svg>',
  en: '<svg viewBox="0 0 21 15"><rect width="21" height="15" fill="#fff"/><g fill="#b22234"><rect width="21" height="1.154"/><rect y="2.308" width="21" height="1.154"/><rect y="4.615" width="21" height="1.154"/><rect y="6.923" width="21" height="1.154"/><rect y="9.231" width="21" height="1.154"/><rect y="11.538" width="21" height="1.154"/><rect y="13.846" width="21" height="1.154"/></g><rect width="9" height="8.077" fill="#3c3b6e"/><g fill="#fff"><circle cx="1.5" cy="1.4" r=".38"/><circle cx="3.5" cy="1.4" r=".38"/><circle cx="5.5" cy="1.4" r=".38"/><circle cx="7.5" cy="1.4" r=".38"/><circle cx="2.5" cy="2.9" r=".38"/><circle cx="4.5" cy="2.9" r=".38"/><circle cx="6.5" cy="2.9" r=".38"/><circle cx="1.5" cy="4.4" r=".38"/><circle cx="3.5" cy="4.4" r=".38"/><circle cx="5.5" cy="4.4" r=".38"/><circle cx="7.5" cy="4.4" r=".38"/><circle cx="2.5" cy="5.9" r=".38"/><circle cx="4.5" cy="5.9" r=".38"/><circle cx="6.5" cy="5.9" r=".38"/></g></svg>',
};
