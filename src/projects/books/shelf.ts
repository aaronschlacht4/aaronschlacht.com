/**
 * The books on the demo's shelf: The Modern Salon's own catalogue, wearing
 * the app's own cover files (public/salon/covers/, downsized to 600px tall).
 *
 * Every cover is one image of the jacket laid out flat — back cover, spine,
 * front cover, left to right — the same convention the app's shelf uses.
 * `spine` is where the spine sits in that file, as fractions of its width.
 * Two of these covers were built to the app's spec (921px covers, a spine of
 * 203px × the book's thickness, against a 1200px height), so their spine is
 * exact; the rest were measured off the file by eye.
 */
export type ShelfBook = {
  id: string;
  title: string;
  author: string;
  pages: number;
  /** cover file, back–spine–front */
  cover: string;
  /** width / height of the cover file */
  fileAspect: number;
  /** [start, end] of the spine in the file, as fractions of its width */
  spine: [number, number];
  /** built to the app's cover spec */
  calibrated?: boolean;
  /** height on the shelf (world units); real books aren't all one size */
  height: number;
};

export const SHELF: ShelfBook[] = [
  {
    id: 'meditations',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    pages: 128,
    cover: '/salon/covers/meditations.jpg',
    fileAspect: 800 / 600,
    spine: [0.445, 0.555],
    height: 1.16,
  },
  {
    id: 'mans-search-for-meaning',
    title: 'Man’s Search for Meaning',
    author: 'Viktor E. Frankl',
    pages: 69,
    cover: '/salon/covers/mans-search-for-meaning.jpg',
    fileAspect: 977 / 600,
    spine: [921 / 1954, 1033 / 1954],
    calibrated: true,
    height: 1.22,
  },
  {
    id: 'crime-and-punishment',
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    pages: 767,
    cover: '/salon/covers/crime-and-punishment.jpg',
    fileAspect: 800 / 600,
    spine: [0.44, 0.56],
    height: 1.3,
  },
  {
    id: 'frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    pages: 180,
    cover: '/salon/covers/frankenstein.jpg',
    fileAspect: 822 / 600,
    spine: [0.44, 0.56],
    height: 1.24,
  },
  {
    id: 'beyond-good-and-evil',
    title: 'Beyond Good and Evil',
    author: 'Friedrich Nietzsche',
    pages: 116,
    cover: '/salon/covers/beyond-good-and-evil.jpg',
    fileAspect: 800 / 600,
    spine: [0.448, 0.552],
    height: 1.14,
  },
  {
    id: 'notes-from-underground',
    title: 'Notes from Underground',
    author: 'Fyodor Dostoevsky',
    pages: 187,
    cover: '/salon/covers/notes-from-underground.jpg',
    fileAspect: 1001 / 600,
    spine: [920.9 / 2002, 1081.1 / 2002],
    calibrated: true,
    height: 1.2,
  },
  {
    id: 'moby-dick',
    title: 'Moby Dick',
    author: 'Herman Melville',
    pages: 468,
    cover: '/salon/covers/moby-dick.jpg',
    fileAspect: 922 / 600,
    spine: [0.445, 0.555],
    height: 1.34,
  },
  {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    pages: 423,
    cover: '/salon/covers/pride-and-prejudice.jpg',
    fileAspect: 874 / 600,
    spine: [0.435, 0.565],
    height: 1.26,
  },
];

/**
 * The app's thickness rule: the spine scales with √(pages / 300), clamped,
 * so a 69-page book stands visibly thinner than a 767-page one.
 */
export const thickness = (pages: number) => Math.min(1.7, Math.max(0.55, Math.sqrt(pages / 300)));

/** 203px of spine per 1200px of cover height, at thickness 1. */
const SPINE_PER_HEIGHT = 203 / 1200;

export type BookDims = { w: number; h: number; t: number };

/**
 * A book's size, taken from its own cover file so nothing is stretched: the
 * front cover's proportions set its width, the page count its spine. A cover
 * that wasn't built to the spec has a spine drawn at whatever width its
 * designer chose, so there the page-count spine is held within 30% of the
 * drawn one — close to honest thickness, without smearing the spine's art.
 */
export function dimsFor(b: ShelfBook): BookDims {
  const h = b.height;
  const [f1, f2] = b.spine;
  const w = h * f1 * b.fileAspect;
  const byPages = h * SPINE_PER_HEIGHT * thickness(b.pages);
  if (b.calibrated) return { w, h, t: byPages };
  const drawn = h * (f2 - f1) * b.fileAspect;
  const t = drawn * Math.min(1.3, Math.max(0.8, byPages / drawn));
  return { w, h, t };
}
