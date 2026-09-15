import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useScene } from '../state/useScene';
import { SPHERES } from '../data/spheres';
import { dockedEmblemBox } from '../lib/dock';
import { isExternal, siteLabel, whereLabel } from '../lib/links';

/** Live project links open in a new tab; placeholders ('#') stay put. */
const external = { target: '_blank', rel: 'noreferrer' } as const;

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
 * a single column (shared left edge, running to the right margin). Down that
 * column: the project's address as the one big link (facts beside it), the
 * lead copy, then three cards that each open one page of the project — so
 * the full width is used and every edge lines up with something. Concentric
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

  // The project's own address, shown as text (`physica.fyi`) when it's a real
  // URL; a '#' placeholder falls back to the link's label and doesn't open a tab.
  const live = active ? isExternal(active.link.href) : false;
  const site = active ? siteLabel(active.link.href) : null;

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

          {/* Scrolled content dissolves as it passes under the emblem zone at
              the top, so the docked sphere and the back control never sit on
              top of live copy. Above the body, below the hero (which scrolls
              away with the page) and the fixed controls. */}
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[31]"
            style={{
              height: box.cy + box.r + 48,
              background:
                'linear-gradient(180deg, rgba(3,5,12,0.94) 0%, rgba(3,5,12,0.72) 55%, rgba(3,5,12,0) 100%)',
            }}
          />

          {/* ── Hero: title sits flush beside the emblem, vertically centred
              on it (translateY(-50%) against its own auto height holds that
              however many lines the label wraps to). Absolute, not fixed: it
              belongs to the page and scrolls off with it, while the emblem
              stays put as the persistent way home. ────────────────────── */}
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

          {/* ── Body: one column from the emblem's edge to the right margin.
              Three bands, top to bottom: the address rail (the project's
              URL as the page's one big action, with the facts beside it),
              the lead copy, and three cards that each open one page of the
              project. Every band shares the same two edges. ────────────── */}
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
            {/* Address rail */}
            <motion.div
              variants={item}
              className="grid items-end gap-x-12 gap-y-8 border-y border-white/10 py-7 lg:grid-cols-12"
            >
              <div className="min-w-0 lg:col-span-7">
                <Kicker color={active.color}>
                  {live ? 'Live site' : 'Coming soon'}
                </Kicker>
                <a
                  href={active.link.href}
                  {...(live ? external : {})}
                  className="group mt-4 inline-flex max-w-full items-baseline gap-3"
                  aria-label={active.link.label}
                >
                  <span
                    className="truncate bg-gradient-to-r from-white to-white/70 bg-clip-text text-[clamp(26px,3.6vw,54px)] font-semibold leading-none tracking-tight text-transparent underline decoration-white/15 decoration-1 underline-offset-[0.18em] transition group-hover:decoration-[var(--c)]"
                    style={{
                      fontFamily: 'var(--font-display)',
                      ['--c' as string]: active.color,
                    }}
                  >
                    {site ?? active.link.label}
                  </span>
                  <span
                    aria-hidden
                    className="shrink-0 text-2xl transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    style={{ color: active.color }}
                  >
                    {live ? '↗' : '→'}
                  </span>
                </a>
                {site && (
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-dim/55">
                    {active.link.label}
                  </p>
                )}
              </div>

              <dl className="flex flex-wrap gap-y-5 lg:col-span-5 lg:justify-end">
                {active.meta.map((m, i) => (
                  <div
                    key={m.k}
                    className={
                      i === 0 ? 'pr-9' : 'border-l border-white/10 pl-9 pr-9 last:pr-0'
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
            </motion.div>

            {/* Lead */}
            <motion.p
              variants={item}
              className="mt-16 max-w-[54rem] text-2xl font-light leading-[1.5] text-ink/85 xl:text-[30px]"
            >
              {active.blurb}
            </motion.p>

            {/* Pages: three doors into the project, each one card. */}
            <motion.div
              variants={item}
              className="mt-20 flex items-baseline justify-between gap-6"
            >
              <Kicker color={active.color}>Three ways in</Kicker>
              {site && (
                <span className="hidden font-mono text-[10px] tracking-[0.2em] text-ink-dim/45 sm:block">
                  {site}
                </span>
              )}
            </motion.div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {active.pages.map((pg, i) => {
                const pageLive = isExternal(pg.href);
                const where = whereLabel(pg.href);
                return (
                  <motion.a
                    key={pg.title}
                    variants={item}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    href={pg.href}
                    {...(pageLive ? external : {})}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-colors hover:border-[var(--c)] hover:bg-white/[0.05]"
                    style={{ ['--c' as string]: `${active.color}66` }}
                  >
                    {/* Accent hairline along the top edge; grows on hover. */}
                    <span
                      aria-hidden
                      className="absolute left-6 top-0 h-px w-8 transition-all duration-500 ease-out group-hover:w-[calc(100%-3rem)]"
                      style={{ background: active.color }}
                    />
                    <span
                      className="font-mono text-[11px]"
                      style={{
                        color: active.color,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3
                      className="mt-7 text-[22px] font-semibold leading-tight tracking-tight text-white"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {pg.title}
                    </h3>
                    <p className="mt-2.5 flex-1 text-[14.5px] leading-relaxed text-ink/70">
                      {pg.blurb}
                    </p>
                    <span className="mt-8 flex items-center justify-between gap-4 border-t border-white/[0.08] pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim/70">
                      <span className="truncate">{where ?? 'Soon'}</span>
                      <span
                        aria-hidden
                        className="shrink-0 transition-transform group-hover:translate-x-1"
                        style={{ color: active.color }}
                      >
                        {pageLive ? '↗' : '→'}
                      </span>
                    </span>
                  </motion.a>
                );
              })}
            </div>

            {/* Closing rule: mirrors the address rail's, so the composition is
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
