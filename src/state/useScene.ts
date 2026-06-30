import { create } from 'zustand';
import { JOURNEY } from '../data/journey';

/**
 * Scroll-driven scene state. App owns a scroll listener and writes `journeyT`
 * (0 → 1 across the journey region) and `globeOpacity` (1 while the globe leads,
 * fading to 0 as the sections take over). The R3F scene and the 2D overlays both
 * read from here — one source of truth, updated once per scroll frame.
 */
type SceneState = {
  /** 0 at the first stop, 1 at the last stop. */
  journeyT: number;
  /** globe canvas opacity, for the fade-out past the journey. */
  globeOpacity: number;
  /** true once a user has scrolled at all (hides the scroll hint). */
  hasScrolled: boolean;

  setScroll: (journeyT: number, globeOpacity: number) => void;
  markScrolled: () => void;
};

export const useScene = create<SceneState>((set) => ({
  journeyT: 0,
  globeOpacity: 1,
  hasScrolled: false,
  setScroll: (journeyT, globeOpacity) => set({ journeyT, globeOpacity }),
  markScrolled: () => set({ hasScrolled: true }),
}));

const N = JOURNEY.length;

/** Position along the path in stop-units, e.g. 2.4 = 40% from stop 2 to stop 3. */
export function pathPosition(journeyT: number): number {
  return Math.max(0, Math.min(1, journeyT)) * (N - 1);
}

/** Index of the stop currently "in focus" (rounds toward whichever is closer). */
export function focusedStopIndex(journeyT: number): number {
  return Math.round(pathPosition(journeyT));
}
