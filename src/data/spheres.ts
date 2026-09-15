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

/**
 * The alternative to orbiting: sit still and bend everything else instead.
 * `at` is a fixed world point outside the orbits; `mass` is the warp strength
 * fed to OrbitHub's gravityWarp (world units², tuned by eye — nothing
 * physical). Anchored spheres get no dotted path of their own, since they
 * don't travel one.
 */
export type Anchor = {
  at: [number, number, number];
  mass: number;
};

/**
 * One way into the project: a page (or a section of one) on the project's
 * own site. The section page shows three of these as clickable cards.
 */
export type ProjectPage = {
  title: string;
  /** one sentence on what's there */
  blurb: string;
  /** deep link — an absolute URL, ideally with an anchor into the section */
  href: string;
};

export type SphereDef = {
  id: string;
  label: string;
  tagline: string;
  route: string;
  kind: SphereKind;
  /** UI accent for the hover label + the section page (not the 3D material) */
  color: string;
  /** Exactly one of these: a sphere either rides an orbit, or anchors the
   *  system in place and pulls every orbit toward it. */
  orbit?: Orbit;
  anchor?: Anchor;
  // ── Section-page content ───────────────────────────────────────────────
  /** one- or two-sentence lead under the title */
  blurb: string;
  /** small key/value facts in the rail (role, year, stack…) */
  meta: { k: string; v: string }[];
  /** the project itself — shown as the page's one big link */
  link: { label: string; href: string };
  /** three entry points into the project, each a clickable card */
  pages: [ProjectPage, ProjectPage, ProjectPage];
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
    link: { label: 'Visit Mercurio', href: '#' },
    // TODO: point these at the real site once it's live.
    pages: [
      {
        title: 'Threads',
        blurb:
          'Real-time threaded discussion, built so a long conversation still reads cleanly.',
        href: '#',
      },
      {
        title: 'Moderation',
        blurb:
          'Reputation and lightweight moderation that stay out of the way until they are needed.',
        href: '#',
      },
      {
        title: 'Search',
        blurb: 'Full-text search across every post, fast enough to feel local.',
        href: '#',
      },
    ],
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
    link: { label: 'Read the notes', href: '#' },
    // TODO: point these at the real notes once they're published.
    pages: [
      {
        title: 'Calibration',
        blurb:
          'How well live market prices track what actually happens, bucket by bucket.',
        href: '#',
      },
      {
        title: 'Backtests',
        blurb:
          'Simple strategies run against historical quotes, and where they stop working.',
        href: '#',
      },
      {
        title: 'Microstructure',
        blurb:
          'Notes on spreads, depth, and how the order book moves when news lands.',
        href: '#',
      },
    ],
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
    link: { label: 'See the shelf', href: '#' },
    // TODO: point these at the real shelf once it's online.
    pages: [
      {
        title: 'Notes',
        blurb: 'A short note on every book I finish, written the same week.',
        href: '#',
      },
      {
        title: 'Favorites',
        blurb: 'The running shortlist: the books I keep recommending.',
        href: '#',
      },
      {
        title: 'Reviews',
        blurb: 'The occasional longer piece, when a book earns one.',
        href: '#',
      },
    ],
  },
  {
    id: 'physica',
    label: 'Physica',
    tagline: 'Modelling a black hole’s shadow',
    route: '/physica',
    kind: 'blackhole',
    color: '#eec18a',
    // No orbit: it hangs still, off to one side, a little above and set well
    // back. Position and mass are a pair — pulled in closer, a lighter hole
    // warps the paths just as much but drags the outer orbit through its own
    // disk. From out here (|r| 2.96, vs the outermost orbit's 1.66) a heavier
    // one bends that path by 0.41 and still leaves 0.91 of clearance at closest
    // approach — comfortably outside the 0.56 disk. Kept low enough in y that
    // the hover label has room above it at the top of the frame.
    anchor: { at: [1.72, 0.55, -2.35], mass: 0.85 },
    blurb:
      'A model of what a black hole actually looks like — tracing light through curved spacetime to draw the shadow it casts and the photon ring around it.',
    meta: [
      { k: 'Focus', v: 'General relativity' },
      { k: 'Year', v: '2025' },
      { k: 'Tools', v: 'Python' },
    ],
    link: {
      label: 'Interactive model and write-up',
      href: 'https://physica.fyi',
    },
    // physica.fyi renders its write-up from markdown into one <article id="how">,
    // and its headings carry no ids of their own — so "How it works" (the
    // article's own h1) links to #how, and the two inner sections use text
    // fragments (#how:~:text=…), which every current browser honours on a
    // click and which fall back to #how where unsupported.
    pages: [
      {
        title: 'How it works',
        blurb:
          'Every pixel is a photon traced backwards through curved spacetime until it hits the horizon, the disk, or a star.',
        href: 'https://physica.fyi/#how',
      },
      {
        title: 'Checking it',
        blurb:
          'The integrator is held against four results relativity gives independently, from Einstein’s deflection to the photon sphere at 3M.',
        href: 'https://physica.fyi/#how:~:text=Checking%20it%20against%20known%20answers',
      },
      {
        title: 'Running it',
        blurb:
          'One fragment shader, fourth-order Runge–Kutta per pixel, with the resolution tuned live to hold the frame rate.',
        href: 'https://physica.fyi/#how:~:text=Running%20it',
      },
    ],
  },
];

export const routeToSphere = (path: string): SphereDef | undefined =>
  SPHERES.find((s) => s.route === path);
