# Novi ASL

An interactive, learning-focused ASL website with guided alphabet lessons, knowledge checks, word practice, and private camera feedback.

## Included

- `dist/index.html` — Novi ASL landing page with 26 alphabet lessons, saved progress, and a self-paced knowledge check.
- `dist/dojo.html` — guided lessons, camera practice, word studio, and learning progress.
- `dist/rush.html` — redirects old bookmarks to the guided lessons; the former arena has been removed.
- `dist/assets/novi-mark.svg` — new Novi logo and favicon.
- `dist/models/` and `dist/vendor/mediapipe/` — original local sign recognition model and runtime.

## Start locally

Run the included local server:

```sh
node server.js
```

Open http://localhost:8000. Webcam features require localhost or an HTTPS deployment and browser camera permission.

## Deploy

Upload the `dist` directory to a static host such as Netlify. It has no build step. You can also host its contents as the website root in GitHub Pages.

## Progress and learning

Lessons and knowledge checks use browser storage, and the webcam classifier runs locally. Camera accuracy can vary: static letters are experimental; J and Z are movement-based and visual lessons only. Fingerspelling is just one part of ASL. Learn from Deaf ASL educators for comprehensive language study.
