import { Vector3 } from 'three';

/** Canonical globe radius shared across Earth, clouds, and pins. */
export const GLOBE_RADIUS = 1;

/**
 * Convert latitude/longitude (degrees) to a point on a sphere of `radius`.
 *
 * Texture-aligned convention: with the equirectangular color map applied to a
 * three.js SphereGeometry, lng=0 / lat=0 (Gulf of Guinea, off Africa) should sit
 * on the +Z face. We use the standard formula and rotate the Earth mesh so the
 * map lines up; pins use the same math so they stay glued to their coordinates.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number = GLOBE_RADIUS,
): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180); // polar angle from +Y
  const theta = (lng + 180) * (Math.PI / 180); // azimuth

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new Vector3(x, y, z);
}

/**
 * Points along the great-circle arc from A to B, lifted off the surface in a
 * gentle parabolic arch so the path reads as a flight route rather than a line
 * painted on the globe. Returns `segments + 1` points in local space.
 */
export function greatCircleArc(
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
  segments = 64,
  baseAltitude = 1.015,
  archHeight = 0.18,
): Vector3[] {
  const a = latLngToVector3(latA, lngA, 1).normalize();
  const b = latLngToVector3(latB, lngB, 1).normalize();
  let dot = a.dot(b);
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);

  const points: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let p: Vector3;
    if (sinOmega < 1e-4) {
      p = a.clone();
    } else {
      const k0 = Math.sin((1 - t) * omega) / sinOmega;
      const k1 = Math.sin(t * omega) / sinOmega;
      p = a.clone().multiplyScalar(k0).add(b.clone().multiplyScalar(k1));
    }
    // arch: 0 at ends, max in the middle, scaled (gently) by hop length so the
    // long transcontinental hops don't balloon off-screen
    const arch = Math.sin(Math.PI * t) * archHeight * (0.3 + omega * 0.35);
    p.normalize().multiplyScalar(baseAltitude + arch);
    points.push(p);
  }
  return points;
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth ease-in-out (cosine). Maps [0,1] → [0,1]. */
export function easeInOut(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
}

/** Ease-out cubic — fast start, gentle settle. Used for the intro dolly. */
export function easeOutCubic(t: number): number {
  const x = 1 - clamp01(t);
  return 1 - x * x * x;
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
