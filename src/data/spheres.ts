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

export type Tool = { name: string; note: string };

export type SphereDef = {
  id: string;
  label: string;
  tagline: string;
  route: string;
  kind: SphereKind;
  /** UI accent for the hover label in the hub (not the 3D material) */
  color: string;
  /** a darker cousin of `color` that reads on the off-white project page */
  tone: string;
  /** Exactly one of these: a sphere either rides an orbit, or anchors the
   *  system in place and pulls every orbit toward it. */
  orbit?: Orbit;
  anchor?: Anchor;
  // ── Project page ────────────────────────────────────────────────────────
  /** one- or two-sentence lead under the title */
  blurb: string;
  /** the project itself; a '#' href means it isn't live yet */
  link: { label: string; href: string };
  /** the three sections of the page, paragraphs each */
  how: string[];
  tools: Tool[];
  why: string[];
};

export const SPHERES: SphereDef[] = [
  {
    id: 'mercurio',
    label: 'Mercurio',
    tagline: 'A forum app I built',
    route: '/mercurio',
    kind: 'mercury',
    color: '#e0a86b',
    tone: '#a8702f',
    orbit: { radius: 0.92, tilt: 0.2, yaw: 0.0, phase: 0.3 },
    blurb:
      'A community forum I designed and built end to end — fast threads, a clean reading experience, and moderation that stays out of the way.',
    link: { label: 'Visit Mercurio', href: '#' },
    // TODO: real copy for all three sections.
    how: [
      'Threads are stored as trees and rendered flat, so a long conversation still reads top to bottom without losing who replied to whom.',
      'Posts stream in over a live connection; the page never reloads to show a new reply.',
    ],
    tools: [
      { name: 'React', note: 'the client' },
      { name: 'Node', note: 'the API and the live feed' },
      { name: 'Postgres', note: 'threads, users, full-text search' },
    ],
    why: [
      'I wanted a forum that felt as quick as a chat and read as well as a good long-form page, and nothing I used did both.',
    ],
  },
  {
    id: 'markets',
    label: 'Prediction Markets',
    tagline: 'Forecasting & markets research',
    route: '/markets',
    kind: 'crystal',
    color: '#8fbcff',
    tone: '#2f6fc4',
    orbit: { radius: 1.3, tilt: 0.45, yaw: 0.7, phase: 2.4 },
    blurb:
      'Research and tooling on prediction markets — how they price the future, where the crowd is sharp, and where it isn’t.',
    link: { label: 'Read the notes', href: '#' },
    // TODO: real copy for all three sections.
    how: [
      'Quotes from several markets are pulled into one normalised feed, so the same question can be compared across venues.',
      'From there: calibration studies on what the prices said versus what happened, and simple backtests of strategies that trade the gaps.',
    ],
    tools: [
      { name: 'Python', note: 'ingestion and analysis' },
      { name: 'Notebooks', note: 'where the studies live' },
    ],
    why: [
      'Markets are the one forecasting method that keeps score in public. I wanted to know how good the score actually is.',
    ],
  },
  {
    id: 'books',
    label: 'Books',
    tagline: 'What I’m reading & notes',
    route: '/books',
    kind: 'paper',
    color: '#d8cfb8',
    tone: '#8a7b57',
    orbit: { radius: 1.66, tilt: 0.26, yaw: -0.6, phase: 4.3 },
    blurb:
      'A running log of what I’m reading — notes, favorite passages, and the occasional half-formed review.',
    link: { label: 'See the shelf', href: '#' },
    // TODO: real copy for all three sections.
    how: [
      'Every book I finish gets a short note the same week, a mark out of five, and a spine on the shelf above. Hover a spine to pull it out.',
    ],
    tools: [
      { name: 'three.js', note: 'the shelf' },
      { name: 'A text file', note: 'the notes, honestly' },
    ],
    why: [
      'I forget what I thought about a book within a month unless I write it down. This is the writing-down.',
    ],
  },
  {
    id: 'physica',
    label: 'Physica',
    tagline: 'Modelling a black hole’s shadow',
    route: '/physica',
    kind: 'blackhole',
    color: '#eec18a',
    tone: '#a86a1f',
    // No orbit: it hangs still, off to one side, a little above and set well
    // back. Position and mass are a pair — pulled in closer, a lighter hole
    // warps the paths just as much but drags the outer orbit through its own
    // disk. From out here (|r| 2.96, vs the outermost orbit's 1.66) a heavier
    // one bends that path by 0.41 and still leaves 0.91 of clearance at closest
    // approach — comfortably outside the 0.56 disk. Kept low enough in y that
    // the hover label has room above it at the top of the frame.
    anchor: { at: [1.72, 0.55, -2.35], mass: 0.85 },
    blurb:
      'A real-time model of what a black hole actually looks like. Every pixel is a photon traced backwards through curved spacetime until it falls in, lands on the disk, or escapes to the stars.',
    link: { label: 'physica.fyi', href: 'https://physica.fyi' },
    how: [
      'There is no model of a black hole in the window above, and no texture of a glowing ring. There is a rule for how light moves when spacetime is curved, applied to about a million photons, thirty times a second. Everything you see falls out of that rule.',
      'Each pixel asks one question: if a photon arrived here, where did it come from? A ray leaves the camera and is followed backwards until it does one of three things. It crosses the horizon and is never seen again, which paints the pixel black. It lands on the accretion disk, which paints the pixel the colour of the gas at that spot. Or it escapes, and the pixel shows whatever star lies in the direction it was finally travelling.',
      'The bending itself is the Schwarzschild null geodesic written as a central force, a = −3M h² r / |r|⁵, integrated with fourth-order Runge–Kutta in a single fragment shader. The same expression runs on the CPU in the test suite, where it is held against results known long before anyone could render them: Einstein’s deflection to seven digits, a photon parked on the unstable orbit at r = 3M, and the capture threshold at b = 3√3 M.',
      'What reaches the camera is not what the gas emitted. Light climbing out of the well is redshifted, and the gas orbits at up to half the speed of light, so the side sweeping toward you is beamed brighter by the fourth power of the Doppler shift. Switch Beaming off in the console to see the disk as it would look if the gas sat still.',
    ],
    tools: [
      { name: 'WebGL2', note: 'one fragment shader does all the physics' },
      { name: 'TypeScript', note: 'the driver, the tests, the page' },
      { name: 'Vite', note: 'build and dev server' },
      { name: 'KaTeX + marked', note: 'set the write-up' },
      { name: 'No renderer, no physics library, no framework', note: '' },
    ],
    // TODO: this is a first draft in your voice — edit freely.
    why: [
      'Every picture of a black hole I had seen was either a still from a film or a diagram with arrows. I wanted the one thing neither could give me: the picture coming out of the equation, live, with my hand on the camera.',
      'Building it forced me to understand the parts I had only nodded along to. Why the shadow is 2.6 times the size of the horizon. Why the disk appears to fold over the top of the hole. Why one side is so much brighter than the other. Each of those is a line of code that had to be right, and the tests are there to prove it is.',
    ],
  },
];

export const routeToSphere = (path: string): SphereDef | undefined =>
  SPHERES.find((s) => s.route === path);
