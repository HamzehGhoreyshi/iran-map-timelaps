First read ~/Desktop/AI/ai-os/AGENTS.md

# AGENTS.md — iran-map-timelaps

## First
This project belongs to Hamzeh's AI OS.
Read `~/Desktop/AI/ai-os/AGENTS.md` and follow its session routine.
If you cannot reach that path, ask Hamzeh to also connect the `ai-os` folder.
Project summary lives in: `~/Desktop/AI/ai-os/10_context/projects/iran-map-timelaps.md`

## This project
- What it is: Experiment — "Persia through time". A minimal white 3D globe that shows how the map of Persia/Iran changed from 844 BC to today. A tick ruler scrubs through 15 stops; the globe spins with motion blur between them. English (Manrope) by default, Persian (Ravi) at `?lang=fa`.
- Tech stack: Vite · vanilla JS · plain WebGL 2 (one sphere, one shader, map painted on 2D canvases) · no framework, no 3D library, one dependency (Manrope font).
  - `src/eras.js` stops and captions (EN/FA) · `src/labels.js` country names · `src/i18n.js` interface text · `src/globe.js` globe · `src/mapdata.js` loads the border file · `src/ruler.js` timeline · `src/main.js` wiring.
  - `public/map.json` is generated and packed small: `npm run data` (tools/build-data.mjs) downloads the border files and rebuilds it. Never edit it by hand.
  - Keep it light: first load is about 100 KB compressed (page 2, CSS 3, JS 10, font 25, map 60). Do not add three.js or other libraries for the globe.
- How to run it: `npm install`, then `npm run dev` (starts a local server and prints its address).
- How to deploy it: static site — `npm run build` makes `dist/`; host on Vercel (`vercel.json` sets cache headers). Live at https://iran-map-timelaps.vercel.app. Deploy with `vercel --prod` from this folder (GitHub is not connected to Vercel, so a push alone does not deploy). Repo: github.com/HamzehGhoreyshi/iran-map-timelaps, branch `main`.
- Videos: `tools/record.mjs` films the timelapse frame by frame (60 fps, no top bar or footer). After a visible design change, re-record the social videos (`exports/`, not in git), `docs/persia-through-time.gif` and `public/og-image.jpg`.
- Rules specific to this project:
  - Portfolio link: the published page must show a visible link to `https://hamzeh.framer.ai/?utm_source=iran-map-timelaps&utm_medium=referral`. Check it is there before every deploy.
  - Every stop is a snapshot of one real year in the border data. Do not invent borders; if the data has no shape for a state, leave the stop out or use a marker (as for 844 BC).
  - The map underneath is always today's countries, very faint, with small names (only those in `src/labels.js`). Persia of each year is a see-through overlay in the one `HIGHLIGHT` colour, so the countries beneath stay readable.
  - Timeline side is set per language in `src/i18n.js` (`todaySide`): each language starts with BC on its reading side — English: BC left, Today right; Persian: BC right, Today left.
  - Persian text: never letter-space it. Ravi is commercial and is loaded from `word-capsule-fonts.vercel.app`; never put the font files in this repo.
  - Border data is GPL-3.0 (historical-basemaps by André Ourednik): keep the credit in the Sources dialog and README.
  - Share image: `public/og-image.jpg` is a 1200×630 screenshot of `/?stop=achaemenid`. Meta tags assume `https://iran-map-timelaps.vercel.app` — change them if the address differs.

## Session end (in addition to the AI OS routine)
- Commit and push this project's changes to its own repo.
- Update the project page in ai-os/10_context/projects/iran-map-timelaps.md directly: state, decisions, next actions.
