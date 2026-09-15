import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useScene } from '../state/useScene';
import { SPHERES } from '../data/spheres';
import { dockedEmblemBox, dockScroll } from '../lib/dock';
import ProjectPage from './ProjectPage';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const GAP = 28; // breathing room between the emblem's edge and the column
const EDGE = 48; // right-hand margin the column stops at

/** Viewport size, tracked so the layout can be pinned to the docked emblem's
 * live on-screen box (which is derived from it — see lib/dock). */
function useViewport() {
  const [v, setV] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () =>
      setV({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return v;
}

/** The one repeated mark this page opens groups with: a hairline rule and a
 * tracked micro-label, instead of boxes or headings. */
function Kicker({ color, children }: { color: string; children: string }) {
  return (
    <div
      className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em]"
      style={{ color }}
    >
      <span className="h-px w-7" style={{ background: color }} />
      {children}
    </div>
  );
}

/**
 * 2D layer for the orbital hub: a pointer cursor over spheres, and — when a
 * section is open — its content laid over the 3D scene, with the opened
 * sphere docked top-left as the rotating home emblem.
 *
 * Laid out as an orbital dossier rather than a document: the emblem anchors
 * a single column (shared left edge, running to the right margin), the title
 * sits beside it, and the page itself — the live window into the project's
 * 3D scene, its address and facts, three interactive snippets, the pages to
 * read — runs down that column (see ProjectPage). Concentric dashed rings
 * centred on the emblem echo the hub's orbits, since this is literally the
 * sphere that just flew in from one.
 */
export default function HubOverlay() {
  const phase = useScene((s) => s.phase);
  const hovered = useScene((s) => s.hovered);
  const activeSection = useScene((s) => s.activeSection);
  const openSection = useScene((s) => s.openSection);
  const active = SPHERES.find((s) => s.id === activeSection);
  const vp = useViewport();
  const box = dockedEmblemBox(vp.w, vp.h);

  useEffect(() => {
    document.body.style.cursor = hovered && phase === 'hub' ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered, phase]);

  // The emblem rides the page's scroll (see lib/dock). Back to the top the
  // moment the page closes, so the next one opens with it docked in place.
  useEffect(() => {
    if (phase !== 'section') dockScroll.px = 0;
  }, [phase]);

  // Two edges do the work. The block's left edge is the emblem's own left
  // edge, so one vertical line runs the whole page: emblem → rail → lead
  // copy. The title alone is inset beside the emblem, because the emblem is
  // physically occupying that cell of the top row.
  const blockLeft = Math.max(24, box.cx - box.r);
  const colLeft = box.cx + box.r + GAP;
  const colWidth = Math.max(280, vp.w - colLeft - EDGE);

  // Title scales off the emblem's diameter (matched visual weight) but is
  // capped so a long label can't outgrow the column it heads.
  const label = active?.label ?? '';
  const byDiameter = box.r * 2 * 0.66;
  const byWidth = colWidth / (Math.max(1, label.length) * 0.54);
  const titleSize = Math.max(30, Math.min(byDiameter, byWidth, 150));

  const index = SPHERES.findIndex((s) => s.id === activeSection);
  const indexLabel = `${String(index + 1).padStart(2, '0')} / ${String(
    SPHERES.length,
  ).padStart(2, '0')}`;

  return (
    <AnimatePresence>
      {phase === 'section' && active && (
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="scroll-thin fixed inset-0 z-20 overflow-y-auto"
          onScroll={(e) => {
            dockScroll.px = e.currentTarget.scrollTop;
          }}
        >
          {/* Legibility scrim: an accent-tinted wash behind the emblem fading
              into a deepening vignette, so text reads over the live scene. */}
          <div
            className="pointer-events-none fixed inset-0"
            style={{
              background: `radial-gradient(120% 85% at 14% -8%, ${active.color}26, transparent 48%), linear-gradient(180deg, rgba(3,5,12,0.50) 0%, rgba(3,5,12,0.82) 55%, rgba(3,5,12,0.96) 100%)`,
            }}
          />

          {/* Concentric orbit rings centred on the emblem — the hub's dash
              language, carried through so the page reads as a docked planet.
              Absolute (not fixed): the rings, the emblem's hit-target and
              the hero all belong to the page header and scroll with it. */}
          <svg className="pointer-events-none absolute inset-x-0 top-0 h-screen w-full">
            <g
              transform={`translate(${box.cx} ${box.cy}) rotate(-12)`}
              fill="none"
              stroke={active.color}
              strokeWidth="1"
              strokeDasharray="4 7"
            >
              <ellipse rx={box.r * 2.7} ry={box.r * 1.15} opacity="0.20" />
              <ellipse rx={box.r * 4.4} ry={box.r * 1.85} opacity="0.12" />
              <ellipse rx={box.r * 6.4} ry={box.r * 2.7} opacity="0.06" />
            </g>
          </svg>

          {/* Transparent hit-target over the docked emblem → home, sized and
              placed to exactly cover it (see lib/dock). */}
          <button
            onClick={() => openSection(null)}
            className="absolute z-40 rounded-full"
            style={{
              left: box.cx - box.r,
              top: box.cy - box.r,
              width: box.r * 2,
              height: box.r * 2,
            }}
            aria-label={`Leave ${active.label}, back to the orbit`}
            title="Back to the orbit"
          />

          {/* Visible back control, top-right (clear of the emblem). */}
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            onClick={() => openSection(null)}
            className="group fixed right-5 top-5 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-dim backdrop-blur-md transition hover:border-white/20 hover:text-ink sm:right-8 sm:top-7"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            Back to orbit
          </motion.button>

          {/* ── Hero: title sits flush beside the emblem, vertically centred
              on it (translateY(-50%) against its own auto height holds that
              however many lines the label wraps to). Absolute, not fixed: it
              belongs to the page and scrolls off with it — and so does the
              emblem itself (OrbitHub lifts it by the page's scroll). ───── */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="absolute z-[32]"
            style={{
              left: colLeft,
              top: box.cy,
              transform: 'translateY(-50%)',
              maxWidth: colWidth,
            }}
          >
            <motion.div variants={item} className="flex items-center gap-4">
              <span
                className="font-mono text-[10px] tracking-[0.2em] text-ink-dim/50"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {indexLabel}
              </span>
              <Kicker color={active.color}>{active.tagline}</Kicker>
            </motion.div>

            <motion.h1
              variants={item}
              className="bg-gradient-to-br from-white via-white to-white/50 bg-clip-text font-bold leading-[0.92] text-transparent"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: titleSize,
                letterSpacing: '-0.02em',
                marginTop: '0.22em',
              }}
            >
              {active.label}
            </motion.h1>
          </motion.div>

          {/* ── The page: window, address, snippets, pages (see ProjectPage).
              Padded to the emblem's left edge and the right margin, starting
              just below the hero. ──────────────────────────────────────── */}
          <ProjectPage
            def={active}
            paddingTop={box.cy + box.r + 64}
            paddingLeft={blockLeft}
            paddingRight={EDGE}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
