import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useScene } from '../state/useScene';
import { SPHERES } from '../data/spheres';
import { dockedEmblemBox } from '../lib/dock';

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
 * a single column (shared left edge, running to the right margin), a
 * full-width spec rail carries the facts and the primary action, and the
 * body splits into lead copy and a ruled, numbered highlight list — so the
 * full width is used and every edge lines up with something. Concentric
 * dashed rings centred on the emblem echo the hub's orbits, since this is
 * literally the sphere that just flew in from one.
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
              language, carried through so the page reads as a docked planet. */}
          <svg className="pointer-events-none fixed inset-0 h-full w-full">
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
            className="fixed z-40 rounded-full"
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
              however many lines the label wraps to). ───────────────────── */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="fixed z-30"
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

          {/* ── Body: one column from the emblem's edge to the right margin.
              A full-width spec rail (facts left, action right) sets the
              horizontal geometry; the copy and the numbered highlights split
              it below, so nothing is left floating in dead space. ──────── */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="relative z-30 pb-24"
            style={{
              paddingTop: box.cy + box.r + 76,
              paddingLeft: blockLeft,
              paddingRight: EDGE,
            }}
          >
            {/* Spec rail */}
            <motion.div
              variants={item}
              className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-y border-white/10 py-6"
            >
              <dl className="flex flex-wrap items-start">
                {active.meta.map((m, i) => (
                  <div
                    key={m.k}
                    className={
                      i === 0
                        ? 'pr-10'
                        : 'border-l border-white/10 pl-10 pr-10'
                    }
                  >
                    <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-dim/55">
                      {m.k}
                    </dt>
                    <dd className="mt-2.5 text-[15px] font-medium text-ink/90">
                      {m.v}
                    </dd>
                  </div>
                ))}
              </dl>

              {active.link && (
                <a
                  href={active.link.href}
                  className="group inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-semibold text-[#05070d] transition hover:brightness-110"
                  style={{
                    background: active.color,
                    boxShadow: `0 12px 34px -10px ${active.color}80`,
                  }}
                >
                  {active.link.label}
                  <span
                    aria-hidden
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </a>
              )}
            </motion.div>

            {/* Lead + highlights */}
            <div className="mt-20 grid gap-x-16 gap-y-12 lg:grid-cols-12">
              <motion.p
                variants={item}
                className="text-2xl font-light leading-[1.5] text-ink/85 lg:col-span-7 xl:text-[30px]"
              >
                {active.blurb}
              </motion.p>

              <motion.div variants={item} className="lg:col-span-5">
                <Kicker color={active.color}>Highlights</Kicker>
                <ul className="mt-6">
                  {active.highlights.map((h, i) => (
                    <li
                      key={h}
                      className="flex gap-5 border-t border-white/[0.08] py-[18px]"
                    >
                      <span
                        className="pt-[3px] font-mono text-[11px]"
                        style={{
                          color: active.color,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[15px] leading-relaxed text-ink/80">
                        {h}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Closing rule: mirrors the spec rail's, so the composition is
                framed top and bottom on the same two edges instead of
                trailing off into the vignette. */}
            <motion.div
              variants={item}
              className="mt-24 border-t border-white/10"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
