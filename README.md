# Persia through time

A small interactive globe that shows how the map of Persia (Iran) changed over 2,800 years, from the first written record of the Persians in 844 BC to Iran today. Move over the ruler, drag it, or use the arrow keys.

- English by default, Persian at `?lang=fa`.
- Built with Vite, vanilla JavaScript and three.js.

## Run

```bash
npm install
npm run dev
```

`npm run data` rebuilds `public/map.json` from the border files (downloaded into `tools/source-data/`).

## Credits

- Borders and coastlines: [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik, GPL-3.0. `public/map.json` is derived from it and carries the same licence. Shapes are approximate.
- Fonts: Manrope (SIL Open Font License); Ravi by Fontiran for Persian.
- Design and build: [Hamzeh](https://hamzeh.framer.ai/?utm_source=iran-map-timelaps&utm_medium=referral), with Claude.
