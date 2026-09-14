/**
 * The orbital-hub sections. Data-driven: adding/removing a sphere here never
 * touches the animation or interaction code. `kind` picks the visual/material.
 */
export type SphereKind = 'mercury' | 'crystal' | 'paper' | 'blackhole';

/** Each sphere rides its own orbit (radius + plane tilt/yaw + starting angle). */
export type Orbit = {
  radius: number;
  tilt: number; // radians about X
  yaw: number; // radians about Y (distinct orbital plane)
  phase: number; // starting angle
};

export type SphereDef = {
  id: string;
  label: string;
  tagline: string;
  route: string;
  kind: SphereKind;
  /** UI accent for the hover label + the section page (not the 3D material) */
  color: string;
  orbit: Orbit;
  // ── Section-page content (placeholder copy — edit freely) ─────────────
  /** one- or two-sentence lead under the title */
  blurb: string;
  /** small key/value chips in the hero (role, year, stack…) */
  meta: { k: string; v: string }[];
  /** bulleted highlights shown in the side panel */
  highlights: string[];
  /** primary call-to-action button */
  link?: { label: string; href: string };
};

export const SPHERES: SphereDef[] = [
  {
    id: 'mercurio',
    label: 'Mercurio',
    tagline: 'A forum app I built',
    route: '/mercurio',
    kind: 'mercury',
    color: '#e0a86b',
    orbit: { radius: 0.92, tilt: 0.2, yaw: 0.0, phase: 0.3 },
    blurb:
      'A community forum I designed and built end to end — fast threads, a clean reading experience, and moderation that stays out of the way.',
    meta: [
      { k: 'Role', v: 'Design & build' },
      { k: 'Year', v: '2024' },
      { k: 'Stack', v: 'React · Node · Postgres' },
    ],
    highlights: [
      'Threaded, real-time discussions',
      'Reputation and lightweight moderation',
      'Full-text search across every post',
    ],
    link: { label: 'Visit Mercurio', href: '#' },
  },
  {
    id: 'markets',
    label: 'Prediction Markets',
    tagline: 'Forecasting & markets research',
    route: '/markets',
    kind: 'crystal',
    color: '#8fbcff',
    orbit: { radius: 1.3, tilt: 0.45, yaw: 0.7, phase: 2.4 },
    blurb:
      'Research and tooling on prediction markets — how they price the future, where the crowd is sharp, and where it isn’t.',
    meta: [
      { k: 'Focus', v: 'Forecasting' },
      { k: 'Year', v: '2024' },
      { k: 'Tools', v: 'Python · Notebooks' },
    ],
    highlights: [
      'Calibration studies on live market data',
      'Backtests of simple strategies',
      'Notes on market microstructure',
    ],
    link: { label: 'Read the notes', href: '#' },
  },
  {
    id: 'books',
    label: 'Books',
    tagline: 'What I’m reading & notes',
    route: '/books',
    kind: 'paper',
    color: '#d8cfb8',
    orbit: { radius: 1.66, tilt: 0.26, yaw: -0.6, phase: 4.3 },
    blurb:
      'A running log of what I’m reading — notes, favorite passages, and the occasional half-formed review.',
    meta: [
      { k: 'Currently', v: 'Non-fiction · sci-fi' },
      { k: 'Updated', v: 'Monthly' },
    ],
    highlights: [
      'Short notes on every book I finish',
      'A running list of favorites',
      'Occasional deep-dive reviews',
    ],
    link: { label: 'See the shelf', href: '#' },
  },
  {
    id: 'physica',
    label: 'Physica',
    tagline: 'Modelling a black hole’s shadow',
    route: '/physica',
    kind: 'blackhole',
    color: '#eec18a',
    orbit: { radius: 1.5, tilt: 0.52, yaw: -2.8, phase: 5.6 },
    blurb:
      'A model of what a black hole actually looks like — tracing light through curved spacetime to draw the shadow it casts and the photon ring around it.',
    meta: [
      { k: 'Focus', v: 'General relativity' },
      { k: 'Year', v: '2025' },
      { k: 'Tools', v: 'Python' },
    ],
    highlights: [
      'Light paths integrated through curved spacetime',
      'Shadow boundary and photon ring resolved',
      'Rendered against a gravitationally lensed background',
    ],
    link: { label: 'See the model', href: '#' },
  },
];

export const routeToSphere = (path: string): SphereDef | undefined =>
  SPHERES.find((s) => s.route === path);
