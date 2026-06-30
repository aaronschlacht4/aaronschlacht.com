/**
 * Small environment / capability helpers. Kept dependency-free and SSR-safe-ish
 * (guards `window`/`matchMedia` so the module can be imported anywhere).
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    (navigator.maxTouchPoints ?? 0) > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

/**
 * "Small / low-power" heuristic used to decide whether to show the 2D fallback
 * menu instead of the full WebGL globe. Conservative: phones and very small
 * viewports get the lighter path.
 */
export function isSmallScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

/** Rough device-memory check (Chrome only); undefined elsewhere → assume ok. */
export function isLowMemory(): boolean {
  if (typeof navigator === 'undefined') return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof mem === 'number' && mem > 0 && mem <= 2;
}

/** Clamp dpr for the renderer: never below 1, never above 2. */
export const DPR_RANGE: [number, number] = [1, 2];
