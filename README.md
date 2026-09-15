# aaronschlacht.com

A single-page 3D portfolio for Aaron Schlacht ("Big A").

You land in an **orbital hub**: project spheres orbit a real-time-lit Earth on
their own tilted planes. Hovering one pauses it and lifts a label; clicking one
opens its section — the sphere flies up and docks top-left as that page's
rotating emblem. Clicking **Earth** instead enters the **journey**: a
scroll-driven trip across the globe (Riverdale → Beverlywood → Ramat Gan →
Jerusalem → LA → Columbia) that draws flight arcs between stops, then hands off
to immersive sections — a 3D **Bookshelf**, a 3D **Movie wall**, **About / Now**
and **Contact**.

The Earth's day/night terminator follows the actual current UTC sub-solar point,
with a live clock to prove it.

## Stack

- Vite + React + TypeScript (client-only SPA — no SSR, no `window is not defined`)
- three.js · @react-three/fiber · @react-three/drei
- framer-motion (2D transitions) · zustand (scene state) · Tailwind CSS v4

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint     # tsc --noEmit
npm run build    # typecheck + production build → dist/
npm run preview
```

## The three phases

`src/state/useScene.ts` holds one `phase` that everything else reads:

| Phase | What you see |
| --- | --- |
| `hub` | The landing. Spheres orbit Earth; Earth is the "enter the journey" button. |
| `journey` | The scroll-driven globe story. |
| `section` | A sphere is open: it docks top-left, its page renders over the scene. |

Sections are routed (`/mercurio`, `/markets`, `/books`) and deep-linkable —
routing is derived from `SPHERES`, so adding a sphere adds its route.

## Editing content

| What | File |
| --- | --- |
| **Projects / orbital hub spheres** (label, tagline, route, orbit, link, the three pages) | `src/data/spheres.ts` |
| Project pages' live windows + interactive snippets (per project) | `src/projects/` (see below) |
| Life-journey stops (places, ages, notes, coords) | `src/data/journey.ts` |
| Bookshelf (titles, ratings, takes, "currently reading") | `src/data/books.ts` |
| Movies | `src/data/movies.ts` |
| Section metadata, site title + tagline | `src/data/sections.ts` |
| About / Now copy | `src/components/AboutPanel.tsx` |
| Contact links | `src/components/ContactPanel.tsx` |

Drop project screenshots in `public/covers/` and movie poster art in
`public/posters/`, then reference them from the data files.

### Adding a sphere to the hub

1. Add an entry to `SPHERES` in `src/data/spheres.ts` — `orbit` gives it its own
   radius, plane tilt/yaw and starting angle, so orbits stay visually distinct.
   Its section page is built from `link` (the project's URL, shown as the page's
   one big link) and `pages` (exactly three entry points into the project, each
   a clickable card: title, one-line blurb, deep link).
2. If it needs a new look, add a `kind`, a model URL in `MODEL_URL` and a render
   branch + `useGLTF.preload` in `src/scenes/hub/HubSphere.tsx`.

Nothing else needs touching: the orbit animation, hover, docking, routing, the
section page and the mobile Projects list are all driven off that one entry.

Page links can point into a section of the project's site. Physica's write-up
has one anchor (`#how`) and no heading ids, so the inner sections use text
fragments (`#how:~:text=Running%20it`), which browsers honour on a click and
otherwise fall back to `#how`.

### A project's page: window + snippets

Each project page opens on a **live window** into the project's 3D scene and
then three **interactive snippets** cut from it. `src/projects/registry.ts`
maps a sphere id to its `Window` and `Snippets` components (lazy, so a
project's renderer only loads when its page opens); anything unlisted gets
the generic `ObjectWindow` (the sphere's own model, drag to turn) and
`SoonSnippets` (its three pages as placeholders).

- **Physica** runs physica.fyi's actual renderer here —
  `src/projects/physica/shader.ts` is that repo's fragment shader verbatim
  (MIT), `renderer.ts` a port of its driver with wheel-zoom removed (a
  window that swallows scroll is a trap; distance is a dial instead), idle
  camera drift added, and rendering paused while the canvas is off-screen or
  the tab hidden. The window carries the site's console; the snippets are
  three small renders that each isolate one idea with one control.
- **Books** frames the existing `BookshelfScene` and adds three data-driven
  snippets (nightstand, ratings, pull-one-off-the-shelf).

Shared chrome lives in `src/projects/shared/`: `WindowFrame` (title bar,
picture, console strip), `SnippetCard`, and `Dial`/`Toggle` (the gauge
styling is `.gauge` in `index.css`).

**One WebGL gotcha.** A canvas hands back its one context for good, and
React's StrictMode disposes and immediately rebuilds on the same canvas — so
`PhysicaRenderer.dispose()` only loses the context once the canvas has left
the document, or the rebuilt renderer inherits a dead one.

## 3D notes (the non-obvious parts)

**Model budget.** Hub spheres render maybe 100–200px across. Keep them in the
low tens of thousands of triangles — the crumpled-paper ball arrived at 3.04M
triangles / 117MB and made hovering visibly lag. `gltfpack` fixes this:

```bash
npx gltfpack -i big.glb -o small.glb -si 0.01 -sa -noq
```

(`-si` = simplify ratio, `-sa` = hit the target, `-noq` = no quantization, so no
runtime decoder is needed. That took it to 30K triangles / 6.8MB.) The Earth was
shrunk the same way, 61MB → 5.7MB.

**Docking geometry lives in one place.** `src/lib/dock.ts` holds the camera
dolly and the docked-emblem constants, and computes the emblem's on-screen box.
Both the 3D scene (`GlobeScene`, `OrbitHub`) and the 2D section page
(`HubOverlay`, which aligns its whole layout to that box) import from it — so
the page can line up with the emblem exactly without duplicating, and drifting
from, the numbers that place it. `HUB_FOV` is shared by the camera and the
emblem's size compensation; keep them together.

**Spheres are kept circular on purpose.** A perspective camera only projects a
sphere as a circle when it's centred on the view axis — off to the side it's an
ellipse, worse the closer and more off-axis it gets, which was very visible on
the orbiting spheres. Two things fix it: the hub camera pulls back and narrows
its FOV together (same on-screen Earth size, smaller off-axis angle), and
`addBillboardCorrection` in `HubSphere.tsx` re-projects each sphere as if the
camera were looking straight at it, then shifts the result back to where it
belongs in clip space. Only `gl_Position` is touched, so lighting and
reflections stay accurate to the sphere's real position.

**Canvas layering.** In `section` the canvas sits *above* the page (so the
emblem reads in front of the copy) with pointer-events off, letting clicks fall
through to the DOM controls beneath. R3F sets `pointer-events: auto` on its own
inner wrapper, so that has to be set on the `<Canvas>` **and** its parent —
setting only the parent does nothing.

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
  while scrolled near (disposed when far). Bloom is skipped on low-memory devices.
- Phones / low-power devices get a WebGL-free 2D fallback (`MobileFallback`)
  with the journey as a timeline and every section reachable.
