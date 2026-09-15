import { Suspense, lazy } from 'react';
import type { SphereDef } from '../../data/spheres';
import WindowFrame from '../shared/WindowFrame';

const BookshelfScene = lazy(() => import('../../scenes/BookshelfScene'));

// Level camera (explicit rotation, so R3F doesn't aim it at the origin),
// at spine height, close enough that the shelf fills a 16:9 frame.
const WINDOW_CAMERA = {
  position: [0, 1.5, 7.8] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  fov: 36,
};

/** The 3D shelf, framed. Hover a spine to pull the book out. */
export default function BooksWindow({ def }: { def: SphereDef }) {
  return (
    <WindowFrame tone={def.tone} label="The shelf · live scene">
      <div className="relative aspect-[16/9] max-h-[68vh] w-full bg-[#070b12]">
        <Suspense fallback={null}>
          <BookshelfScene camera={WINDOW_CAMERA} />
        </Suspense>
        <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
          <span className="h-px w-6 bg-white/50" />
          hover a spine
        </div>
      </div>
    </WindowFrame>
  );
}
