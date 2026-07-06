import { create } from 'zustand';
import { JOURNEY } from '../data/journey';

/**
 * Scroll-driven scene state. App owns a scroll listener and writes `journeyT`
 * (0 → 1 across the journey region) and `globeOpacity` (1 while the globe leads,
 * fading to 0 as the sections take over). The R3F scene and the 2D overlays both
 * read from here — one source of truth, updated once per scroll frame.
 */
/**
 * The big-picture phase of the homepage:
 * - `hub`      the landing: project spheres orbit a centred Earth (Phase 2/3).
 * - `journey`  the life-story globe, entered by clicking the Earth (Phase 1).
 * - `section`  a sphere is opened: it flies to centre, Earth docks top-left.
 */
export type Phase = 'journey' | 'hub' | 'section';

type SceneState = {
  /** 0 at the first stop, 1 at the last stop. */
  journeyT: number;
  /** globe canvas opacity, for the fade-out past the journey. */
  globeOpacity: number;
  /** true once a user has scrolled at all (hides the scroll hint). */
  hasScrolled: boolean;

  phase: Phase;
  /** the open section's sphere id (route), or null in journey/hub. */
  activeSection: string | null;
  /** id of the sphere currently hovered in the hub, or null. */
  hovered: string | null;

  setScroll: (journeyT: number, globeOpacity: number) => void;
  markScrolled: () => void;
  setPhase: (phase: Phase) => void;
  openSection: (id: string | null) => void;
  setHovered: (id: string | null) => void;
};

export const useScene = create<SceneState>((set) => ({
  journeyT: 0,
  globeOpacity: 1,
  hasScrolled: false,
  phase: 'hub', // land straight in the orbital hub; click Earth for the journey
  activeSection: null,
  hovered: null,
  setScroll: (journeyT, globeOpacity) => set({ journeyT, globeOpacity }),
  markScrolled: () => set({ hasScrolled: true }),
  setPhase: (phase) => set({ phase }),
  openSection: (id) =>
    set({ activeSection: id, phase: id ? 'section' : 'hub' }),
  setHovered: (hovered) => set({ hovered }),
}));

const N = JOURNEY.length;

/**
 * Smoothed path position, damped toward the scroll target each frame by
 * GlobeScene and read by both the globe rotation and the arc drawing, so the
 * route glides smoothly and stays in sync even when the scroll input is jumpy.
 */
export const journeyAnim = { pos: 0 };

/**
 * Manual drag-to-rotate offset (radians) applied on top of the current stop
 * orientation, so viewers can spin the globe to look around. Reset when the
 * scroll advances to a new stop so each city re-centres.
 */
export const userRotate = { x: 0, y: 0 };

/** Position along the path in stop-units, e.g. 2.4 = 40% from stop 2 to stop 3. */
export function pathPosition(journeyT: number): number {
  return Math.max(0, Math.min(1, journeyT)) * (N - 1);
}

/** Index of the stop currently "in focus" (rounds toward whichever is closer). */
export function focusedStopIndex(journeyT: number): number {
  return Math.round(pathPosition(journeyT));
}
