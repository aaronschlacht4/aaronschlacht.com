# aaronschlacht.com

A single-page, scroll-driven 3D portfolio for Aaron Schlacht ("Big A").

The hero is a **real-time-lit 3D Earth** — its day/night terminator follows the
actual current UTC sub-solar point, with a live clock to prove it. **Scrolling**
travels an animated life-journey across the globe (Riverdale → Beverlywood →
Ramat Gan → Jerusalem → LA → Columbia), drawing flight arcs between stops. Keep
scrolling past the globe and it hands off to immersive sections: **Projects**, a
3D **Bookshelf**, a 3D **Movie wall**, **About / Now**, and **Contact**.

## Stack

- Vite + React + TypeScript (client-only SPA — no SSR, no `window is not defined`)
- three.js · @react-three/fiber · @react-three/drei
- framer-motion (2D transitions) · zustand (scroll state) · Tailwind CSS v4

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build → dist/
npm run preview
```

## Editing content (all placeholder — look for `// TODO`)

| What | File |
| --- | --- |
| Life-journey stops (places, ages, notes, coords) | `src/data/journey.ts` |
| Projects | `src/data/projects.ts` |
| Bookshelf (titles, ratings, takes, "currently reading") | `src/data/books.ts` |
| Movies | `src/data/movies.ts` |
| Section metadata, site title + tagline | `src/data/sections.ts` |
| About / Now copy | `src/components/AboutPanel.tsx` |
| Contact links | `src/components/ContactPanel.tsx` |

Drop project screenshots in `public/covers/` and movie poster art in
`public/posters/`, then reference them from the data files.

## Textures — credit

Earth maps in `public/textures/` (`earth_color`, `earth_normal`,
`earth_specular`, `earth_night`, `earth_clouds`, all `.webp`) are derived from
**NASA Visible Earth — Blue Marble Next Generation** (public domain), via the
three.js example texture set. To swap in higher-res NASA imagery, replace these
files (keep the same names) and re-credit the source here.

## Accessibility & performance

- Respects `prefers-reduced-motion` (cursor trail off, animations damped).
- Skip-to-content link; sections are real, selectable DOM.
- `dpr` clamped to `[1, 2]`; 3D section scenes are lazy-loaded and only mount
  while scrolled near (disposed when far).
- Phones / low-power devices get a WebGL-free 2D fallback (`MobileFallback`)
  with the journey as a timeline and every section reachable.
