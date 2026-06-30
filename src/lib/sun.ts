import { Vector3 } from 'three';
import { latLngToVector3 } from './geo';

/**
 * Real-time sun position.
 *
 * `localSunDirection` is the unit vector, in the globe's LOCAL space, pointing at
 * the current sub-solar point (where the sun is directly overhead right now).
 * GlobeScene rotates it by the globe's orientation each frame to get the world
 * direction it feeds to both the key light and the Earth's night-lights shader,
 * so the day/night terminator always matches the real world clock.
 *
 * Mutated in place (never reassigned) so the shared reference stays valid for
 * the shader uniform that points at it.
 */
export const localSunDirection = new Vector3(1, 0, 0);

/**
 * The local sun direction rotated into WORLD space by the globe's current
 * orientation. GlobeScene writes this every frame; the Earth shader uniform and
 * the key light both point at this same reference, so they never drift apart.
 */
export const worldSunDirection = new Vector3(1, 0, 0);

/**
 * Sub-solar point (degrees) for a given UTC instant. Low-precision astronomy —
 * declination from day-of-year, longitude from time-of-day plus the equation of
 * time. Good to ~1–2°, which is far finer than the eye can judge on a globe.
 */
export function subSolarPoint(date: Date): { lat: number; lng: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayMs = 86400000;
  const dayOfYear = Math.floor((date.getTime() - start) / dayMs);

  // Fractional day angle (radians).
  const gamma = (2 * Math.PI * (dayOfYear - 1)) / 365;

  // Solar declination (NOAA approximation), radians → degrees.
  const declRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const lat = (declRad * 180) / Math.PI;

  // Equation of time (minutes).
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const utcMinutes =
    date.getUTCHours() * 60 +
    date.getUTCMinutes() +
    date.getUTCSeconds() / 60;

  // Longitude where it is solar noon now. At 12:00 UTC (+ eqTime) the sub-solar
  // longitude is 0°; it moves 15°/hour westward.
  let lng = -((utcMinutes + eqTime - 720) / 4);
  // wrap to [-180, 180]
  lng = ((((lng + 180) % 360) + 360) % 360) - 180;

  return { lat, lng };
}

/** Recompute `localSunDirection` from `date` (or now). Returns the sub-solar point. */
export function updateSunDirection(date: Date): { lat: number; lng: number } {
  const sub = subSolarPoint(date);
  const v = latLngToVector3(sub.lat, sub.lng, 1);
  localSunDirection.copy(v).normalize();
  return sub;
}
