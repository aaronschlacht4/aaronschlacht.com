import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { measureBookBody } from './bookModel';

/**
 * The Modern Salon's shelf layout, ported from the app's ShelfScene.tsx:
 * the constants, the thickness rule, the book measurements and the row
 * packer, plus the one framing helper the demo's camera and take-down share.
 */

export const BOOK_MODEL_URL = '/salon/models/book2.glb';
export const SHELF_MODEL_URL = '/salon/models/shelfv2.glb';

export const SHELF_CATEGORIES = [
  { name: 'My Library', rows: 2 },
  { name: 'Recently Added', rows: 2 },
  { name: 'Genres', rows: 2 },
  { name: 'Popular', rows: 2 },
  { name: 'Suggested', rows: 2 },
];

export const N_ROWS = SHELF_CATEGORIES.reduce((s, c) => s + c.rows, 0); // 10
export const BG = '#140d04';

/* ---- Shelf layout ----
 * shelfv2.glb is a compartment open at the front — floor, back and two sides,
 * no front face. Books stand inside it on the floor; each compartment sits
 * directly on the one below and the stack reads as one bookcase. */

// Book height as a fraction of the compartment's height.
export const BOOK_FILL = 0.86;
// Book depth as a fraction of the compartment's depth, so nothing overhangs.
export const DEPTH_FILL = 0.9;
// Quarter turn that swings the model's spine round to face the reader.
export const SPINE_OUT_YAW = Math.PI / 2;
// Lift off the floor, as a fraction of compartment height — clears z-fighting.
export const FLOOR_INSET = 0.012;
// How far a book's face sits back from the open front, as a fraction of depth.
export const FRONT_INSET = 0.15;
// Clear space at each end of a row, as a fraction of shelf width.
export const SIDE_MARGIN = 0.04;
// Gap between neighbouring books, as a fraction of one book's width.
export const BOOK_GAP = 0.08;
// A book with no known page count renders at the width every book used to have.
export const DEFAULT_PAGE_COUNT = 300;
// Thickness grows with page count, damped by a square root and capped.
export const THICKNESS_MIN = 0.55;
export const THICKNESS_MAX = 1.7;

// Camera framing.
export const CAMERA_FOV = 50;
/** With fit="height": how many row-heights the frame shows (the profile dock). */
export const ROW_FRAME = 3.3;
/** The bookcase model's normalised width before any slimming. */
export const FULL_CASE_W = 12;
/** How much of the viewport's width the auto-slimmed case takes up. */
export const CASE_FILL = 0.94;

// How far a pointer must travel before a press counts as a drag, not a click.
export const DRAG_THRESHOLD_PX = 5;

/** Anisotropy asked of every texture; clamped down to what the card allows. */
export const MAX_ANISOTROPY = 16;

/** How wide a book's spine renders, as a multiple of the shelf's base width. */
export function spineThickness(pageCount?: number | null): number {
  if (!pageCount || pageCount <= 0) return 1;
  const raw = Math.sqrt(pageCount / DEFAULT_PAGE_COUNT);
  return Math.min(THICKNESS_MAX, Math.max(THICKNESS_MIN, raw));
}

export type Bounds = { box: THREE.Box3; size: THREE.Vector3; center: THREE.Vector3 };

export type BookMetrics = {
  size: THREE.Vector3;
  centre: THREE.Vector3;
  bottom: number;
};

/** The book model's body, measured once on a bare clone — identical for every book. */
export function useBookMetrics(): BookMetrics {
  const { scene } = useGLTF(BOOK_MODEL_URL, false, true);
  return useMemo(() => {
    const body = measureBookBody(scene.clone(true));
    return {
      size: body.getSize(new THREE.Vector3()),
      centre: body.getCenter(new THREE.Vector3()),
      bottom: body.min.y,
    };
  }, [scene]);
}

/**
 * Where a row's books sit and how big they are.
 *
 * Books stand spine-out, so the cover runs front-to-back into the compartment.
 * That makes depth the binding constraint rather than height.
 */
export function shelfLayout(bounds: Bounds, book: BookMetrics) {
  const byHeight = (bounds.size.y * BOOK_FILL) / Math.max(book.size.y, 1e-6);
  const byDepth = (bounds.size.z * DEPTH_FILL) / Math.max(book.size.x, 1e-6);
  const scale = Math.min(byHeight, byDepth);
  const depth = book.size.x * scale;

  // Sit the spines near the opening, but never so far forward that the book's
  // back pushes out through the back panel.
  const nearFront = bounds.box.max.z - depth / 2 - bounds.size.z * FRONT_INSET;
  const againstBack = bounds.box.min.z + depth / 2;

  return {
    scale,
    // Turned spine-out, a book takes up its own thickness along the shelf.
    width: book.size.z * scale,
    depth,
    restY: bounds.box.min.y + bounds.size.y * FLOOR_INSET,
    restZ: Math.max(nearFront, againstBack),
  };
}

/** Where each book in a row stands, and how many of them fit. */
export function rowSlots(bounds: Bounds, book: BookMetrics, count: number) {
  const { scale, width, restY, restZ } = shelfLayout(bounds, book);
  const span = bounds.size.x * (1 - SIDE_MARGIN * 2);
  if (!(width > 1e-6) || !(scale > 0) || span < width) {
    return { scale, width, gap: 0, firstX: 0, restY, restZ, capacity: 0, n: 0 };
  }
  const gap = width * BOOK_GAP;
  const capacity = Math.max(1, Math.floor((span + gap) / (width + gap)));
  const firstX = bounds.center.x - span / 2 + width / 2;
  return { scale, width, gap, firstX, restY, restZ, capacity, n: Math.min(count, capacity) };
}

/** How many books one shelf holds at the default width. */
export function rowCapacity(bounds: Bounds, book: BookMetrics) {
  return rowSlots(bounds, book, 0).capacity;
}

export type SlotPlacement = { row: number; x: number; width: number };

/**
 * Where every book on the bookcase stands, now that they aren't all the same
 * width: walk the bookcase once, in reading order, adding each book's own
 * width to its row until the next one would run past the shelf's edge, then
 * wrap to the next row. Row 0 is the top shelf.
 */
export function buildRowLayout(
  bounds: Bounds,
  book: BookMetrics,
  bySlot: Map<number, { pages?: number | null }>,
  rows: number,
): Map<number, SlotPlacement> {
  const base = shelfLayout(bounds, book);
  const span = bounds.size.x * (1 - SIDE_MARGIN * 2);
  const layout = new Map<number, SlotPlacement>();
  if (!(base.width > 1e-6) || !(base.scale > 0) || span < base.width) return layout;

  const rowStart = bounds.center.x - span / 2;
  const rowEnd = rowStart + span;
  const gap = base.width * BOOK_GAP;

  let slot = 0;
  for (let row = 0; row < rows; row++) {
    let cursor = rowStart;
    let placedInRow = 0;
    for (;;) {
      const width = base.width * spineThickness(bySlot.get(slot)?.pages);
      const needed = placedInRow === 0 ? width : gap + width;
      // The row's first book always gets a place, even one that alone runs
      // past the edge.
      if (placedInRow > 0 && cursor + needed > rowEnd) break;
      cursor += needed;
      layout.set(slot, { row, x: cursor - width / 2, width });
      slot++;
      placedInRow++;
    }
  }
  return layout;
}

/** Row index (bottom-up) where each section starts, sections listed bottom to top. */
export const sectionsBottomToTop = [...SHELF_CATEGORIES].reverse();
export const sectionStarts = sectionsBottomToTop.map((_, i) =>
  sectionsBottomToTop.slice(0, i).reduce((rows, sec) => rows + sec.rows, 0),
);

/**
 * The dock's framing (fit="height"): the camera holds a bit over three rows at
 * the library's own distance, and the viewport's aspect decides how much shelf
 * fits across the view. Shared by the camera, the drag clamp and the
 * take-down's hand target so they can never disagree.
 */
export function frameHeightFit(aspect: number, cameraY: number, bounds: Bounds) {
  const halfFov = Math.tan(((CAMERA_FOV * Math.PI) / 180) / 2);
  const dist = (bounds.size.y * ROW_FRAME) / 2 / halfFov;
  const visibleH = dist * 2 * halfFov;
  const visibleW = visibleH * aspect;
  const maxScrollY = Math.max(0, N_ROWS * bounds.size.y - visibleH);
  const y = visibleH / 2 + Math.max(0, Math.min(maxScrollY, cameraY)) + bounds.box.min.y;
  const x = visibleW < bounds.size.x ? bounds.box.min.x + visibleW / 2 : bounds.center.x;
  const effSlim = Math.min(1, Math.max(0.12, (visibleW * CASE_FILL) / FULL_CASE_W));
  return { dist, visibleH, visibleW, x, y, maxScrollY, effSlim };
}
