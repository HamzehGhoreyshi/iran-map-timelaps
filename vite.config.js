import { defineConfig } from 'vite';

// The page needs WebGL 2, so every browser that can run it is modern:
// ship modern JavaScript as-is, with no extra compatibility code.
export default defineConfig({
  build: { target: 'es2022', modulePreload: { polyfill: false } },
});
