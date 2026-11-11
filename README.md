# Persia through time

<p align="center">
  <img src="docs/persia-through-time.gif" width="100%" alt="A white globe spins from stop to stop while Persia's borders change: Parsua in 844 BC, the Achaemenid Empire, Alexander, the Parthians, the Sasanians, the Safavids, and Iran today. A tick ruler under the globe marks the year.">
</p>

**Live:** https://iran-map-timelaps.vercel.app · Persian: https://iran-map-timelaps.vercel.app/?lang=fa

A small interactive globe that shows how the map of Persia (Iran) changed over 2,800 years, from the first written record of the Persians in 844 BC to Iran today. Move over the ruler, drag it, or use the arrow keys.

![The app in English: the Achaemenid Empire in 500 BC](docs/app-en.jpg)

![The app in Persian](docs/app-fa.jpg)

## How it works

- 15 stops. Each one is a snapshot of one real year in the border data; nothing is drawn by hand.
- The map underneath is always today's countries, very faint. Persia of each year is a see-through overlay on top, so you can read which modern countries it covered.
- The globe is one sphere drawn with plain WebGL 2 and one shader; the map is painted on 2D canvases. Between stops it makes a full spin with motion blur. No framework or 3D library: the first load is about 100 KB.
- English by default, Persian at `?lang=fa` (right-to-left, Persian digits). `?stop=<id>` opens a given stop.

## Run

```bash
npm install
npm run dev
```

`npm run data` rebuilds `public/map.json` from the border files (downloaded into `tools/source-data/`).

## Record the video

`tools/record.mjs` films the timelapse frame by frame (60 fps, no dropped frames, no top bar or footer). It needs Google Chrome and ffmpeg.

```bash
npm run build
npm i --no-save puppeteer-core
node tools/record.mjs exports/portrait.mp4 540 675
```

The two numbers are the page size; the video is twice that (here 1080×1350). Add `fa` at the end for Persian.

## Credits

- Borders and coastlines: [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik, GPL-3.0. `public/map.json` is derived from it and carries the same licence. Shapes are approximate.
- Fonts: Manrope (SIL Open Font License); Ravi by Fontiran for Persian.
- Design and build: [Hamzeh](https://hamzeh.framer.ai/?utm_source=iran-map-timelaps&utm_medium=referral), with Claude.
