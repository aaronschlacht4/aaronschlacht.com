import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { DPR_RANGE } from '../../lib/env';
import Bookcase, { type CameraDrive } from './Bookcase';
import ReaderShell from './reader/ReaderShell';
import { SHELF } from './shelf';
import { DRAG_THRESHOLD_PX, SHELF_CATEGORIES } from './shelfLayout';
import type { Scenario } from './scenarios';

/**
 * The demo's left half: The Modern Salon's bookcase in a canvas, and its
 * reader in DOM over it. The stage number (from BooksWindow's timeline) is
 * the whole contract: 0 on the shelf · 1 taken down · 2 open · 3 highlighted
 * · 4 discussion · 5 VIP · 6 asked Claude · 7 closing.
 *
 * Dragging vertically browses the bookcase the way the app's wheel does
 * (1:1, no easing); the wheel itself is left to the page, since this sits in
 * a scrolling document. Clicking a book with a story opens it.
 */
export default function SalonStage({
  scenario,
  stage,
  vip,
  reduced,
  pickable,
  onPick,
  shown = 0,
  words = 0,
  onReady,
}: {
  scenario: Scenario;
  stage: number;
  vip: boolean;
  reduced: boolean;
  /** books that have a scenario, so can be clicked */
  pickable: string[];
  onPick: (bookId: string) => void;
  /** replies revealed so far */
  shown?: number;
  /** answer words streamed so far */
  words?: number;
  /** fires once the models are in and every cover is on its book */
  onReady?: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [cell, setCell] = useState({ w: 0, h: 0 });
  const [readerOpaque, setReaderOpaque] = useState(false);
  const [section, setSection] = useState(0);
  const [run, setRun] = useState(0);
  const drive = useRef<CameraDrive>({
    y: NaN,
    max: 0,
    visibleH: 5.94,
    dragging: false,
    moved: false,
    startY: 0,
    startCamY: 0,
    releasedAt: 0,
  });

  // Only draw while the window is on screen.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The reader is laid out at the app's own size and scaled to the cell.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setCell({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Once the reader is fully opaque nothing under it is visible, so the canvas
  // stops drawing; it starts again the instant the reader begins to fade.
  useEffect(() => {
    if (stage < 2 || stage > 6) {
      setReaderOpaque(false);
      return;
    }
    if (reduced) {
      setReaderOpaque(true);
      return;
    }
    const id = window.setTimeout(() => setReaderOpaque(true), 470);
    return () => clearTimeout(id);
  }, [stage, reduced]);

  // Keyed into the sheets so their page-turn animation replays every loop.
  useEffect(() => {
    if (stage === 2 || (reduced && stage === 6)) setRun((r) => r + 1);
  }, [stage, reduced]);

  // Vertical drag pans the bookcase. Listeners live on the window so a drag
  // that leaves the cell still ends cleanly, and the canvas keeps its own
  // native click (a captured pointer would take that away).
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drive.current;
      if (!d.dragging) return;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
      d.moved = true;
      const cellH = wrap.current?.clientHeight || 1;
      d.y = Math.max(0, Math.min(d.max, d.startCamY + (dy * d.visibleH) / cellH));
    };
    const up = () => {
      const d = drive.current;
      if (!d.dragging) return;
      d.dragging = false;
      d.releasedAt = performance.now();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  return (
    <div
      ref={wrap}
      className="absolute inset-0 touch-pan-y select-none"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const d = drive.current;
        d.dragging = true;
        d.moved = false;
        d.startY = e.clientY;
        d.startCamY = Number.isFinite(d.y) ? d.y : d.max;
      }}
    >
      <Canvas
        shadows
        dpr={DPR_RANGE}
        frameloop={visible && !readerOpaque ? 'always' : 'never'}
        camera={{ fov: 50, near: 0.5, far: 60, position: [0, 15, 6.4] }}
        gl={{
          antialias: true,
          outputColorSpace: SRGBColorSpace,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          powerPreference: 'high-performance',
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Bookcase
          books={SHELF}
          pickable={pickable}
          onPick={onPick}
          stage={stage}
          activeBookId={scenario.bookId}
          reduced={reduced}
          drive={drive}
          onSection={setSection}
          onReady={onReady}
        />
      </Canvas>

      <ScrollIndicator activeIdx={section} />

      {stage >= 2 && cell.w > 0 && cell.h > 0 && (
        <motion.div
          className="absolute inset-0 z-10 overflow-hidden"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: stage === 7 ? 0 : 1 }}
          transition={{ duration: reduced ? 0 : stage === 7 ? 0.3 : 0.32 }}
        >
          <ReaderShell
            scenario={scenario}
            run={run}
            stage={stage}
            vip={vip}
            reduced={reduced}
            shown={shown}
            words={words}
            cellW={cell.w}
            cellH={cell.h}
          />
        </motion.div>
      )}
    </div>
  );
}

/** The app's thin section indicator down the left edge of the bookcase. */
function ScrollIndicator({ activeIdx }: { activeIdx: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {SHELF_CATEGORIES.map((sec, i) => (
        <div
          key={sec.name}
          title={sec.name}
          style={{
            flex: 1,
            background: i === activeIdx ? 'rgba(255, 195, 90, 0.80)' : 'rgba(255, 195, 90, 0.10)',
            transition: 'background 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}
