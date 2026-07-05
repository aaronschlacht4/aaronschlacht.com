/**
 * The orbital-hub sections. Data-driven: adding/removing a sphere here never
 * touches the animation or interaction code. `kind` picks the visual/material.
 */
export type SphereKind = 'mercury' | 'crystal' | 'yarn';

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
  /** base tint for the material / label accent */
  color: string;
  orbit: Orbit;
};

export const SPHERES: SphereDef[] = [
  {
    id: 'mercurio',
    label: 'Mercurio',
    tagline: 'A forum app I built',
    route: '/mercurio',
    kind: 'mercury',
    color: '#9c948a',
    orbit: { radius: 0.92, tilt: 0.2, yaw: 0.0, phase: 0.3 },
  },
  {
    id: 'markets',
    label: 'Prediction Markets',
    tagline: 'Forecasting & markets research',
    route: '/markets',
    kind: 'crystal',
    color: '#cfe0ff',
    orbit: { radius: 1.3, tilt: 0.45, yaw: 0.7, phase: 2.4 },
  },
  {
    id: 'books',
    label: 'Books',
    tagline: 'What I’m reading & notes',
    route: '/books',
    kind: 'yarn',
    color: '#33c2a2',
    orbit: { radius: 1.66, tilt: 0.26, yaw: -0.6, phase: 4.3 },
  },
];

export const routeToSphere = (path: string): SphereDef | undefined =>
  SPHERES.find((s) => s.route === path);
