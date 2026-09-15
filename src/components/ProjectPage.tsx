import { Suspense } from 'react';
import { motion, type Variants } from 'framer-motion';
import type { SphereDef } from '../data/spheres';
import { projectUI } from '../projects/registry';
import { isExternal, siteLabel, whereLabel } from '../lib/links';
import Loader from './Loader';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const external = { target: '_blank', rel: 'noreferrer' } as const;

/** The page's one repeated mark: a hairline and a tracked micro-label. */
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
 * A project's page, below its title: the live window first and largest (the
 * project's own 3D scene, running here), then the address and the facts,
 * then three interactive snippets cut from it, then the three pages to read.
 * Four bands on the same two edges — the emblem's left edge and the right
 * margin — so the column reads as one instrument panel.
 */
export default function ProjectPage({
  def,
  paddingTop,
  paddingLeft,
  paddingRight,
}: {
  def: SphereDef;
  paddingTop: number;
  paddingLeft: number;
  paddingRight: number;
}) {
  const { Window, Snippets } = projectUI(def.id);
  const live = isExternal(def.link.href);
  const site = siteLabel(def.link.href);

  return (
    <motion.div
      key={def.id}
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-30 pb-28"
      style={{ paddingTop, paddingLeft, paddingRight }}
    >
      {/* ── The window ─────────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <Suspense
          fallback={
            <div className="grid aspect-[16/9] max-h-[68vh] w-full place-items-center rounded-2xl border border-white/10 bg-[#04060c]">
              <Loader label={def.label} />
            </div>
          }
        >
          <Window def={def} />
        </Suspense>
      </motion.div>

      {/* ── Address + facts ────────────────────────────────────────────── */}
      <motion.div
        variants={item}
        className="mt-12 grid items-end gap-x-12 gap-y-8 border-b border-white/10 pb-10 lg:grid-cols-12"
      >
        <div className="min-w-0 lg:col-span-7">
          <Kicker color={def.color}>{live ? 'Live site' : 'Coming soon'}</Kicker>
          {live ? (
            <a
              href={def.link.href}
              {...external}
              className="group mt-4 inline-flex max-w-full items-baseline gap-3"
              aria-label={def.link.label}
            >
              <span
                className="truncate bg-gradient-to-r from-white to-white/70 bg-clip-text text-[clamp(26px,3.4vw,50px)] font-semibold leading-none tracking-tight text-transparent underline decoration-white/15 decoration-1 underline-offset-[0.18em] transition group-hover:decoration-[var(--c)]"
                style={{ fontFamily: 'var(--font-display)', ['--c' as string]: def.color }}
              >
                {site ?? def.link.label}
              </span>
              <span
                aria-hidden
                className="shrink-0 text-2xl transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                style={{ color: def.color }}
              >
                ↗
              </span>
            </a>
          ) : (
            // No site yet: say so in the same type, but it's not a link to
            // nowhere.
            <p
              className="mt-4 bg-gradient-to-r from-white/80 to-white/45 bg-clip-text text-[clamp(26px,3.4vw,50px)] font-semibold leading-none tracking-tight text-transparent"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {def.link.label}
            </p>
          )}
          <p className="mt-5 max-w-[40rem] text-[17px] font-light leading-[1.6] text-ink/80 xl:text-[19px]">
            {def.blurb}
          </p>
        </div>

        <dl className="flex flex-wrap gap-y-5 lg:col-span-5 lg:justify-end">
          {def.meta.map((m, i) => (
            <div
              key={m.k}
              className={i === 0 ? 'pr-9' : 'border-l border-white/10 pl-9 pr-9 last:pr-0'}
            >
              <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-dim/55">
                {m.k}
              </dt>
              <dd className="mt-2.5 text-[15px] font-medium text-ink/90">{m.v}</dd>
            </div>
          ))}
        </dl>
      </motion.div>

      {/* ── Snippets ───────────────────────────────────────────────────── */}
      <motion.div variants={item} className="mt-14 flex items-baseline justify-between gap-6">
        <Kicker color={def.color}>Interactive · three pieces of it</Kicker>
        {site && (
          <span className="hidden font-mono text-[10px] tracking-[0.2em] text-ink-dim/45 sm:block">
            {site}
          </span>
        )}
      </motion.div>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <Suspense
          fallback={[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]"
            />
          ))}
        >
          <Snippets def={def} />
        </Suspense>
      </div>

      {/* ── Pages to read ──────────────────────────────────────────────── */}
      <motion.div variants={item} className="mt-16">
        <Kicker color={def.color}>Read</Kicker>
        <ul className="mt-4 border-t border-white/10">
          {def.pages.map((pg, i) => {
            const pageLive = isExternal(pg.href);
            const where = whereLabel(pg.href);
            // A row is only a link when there's somewhere to go.
            const Row = pageLive ? 'a' : 'div';
            return (
              <li key={pg.title} className="border-b border-white/[0.08]">
                <Row
                  {...(pageLive ? { href: pg.href, ...external } : {})}
                  className={`group grid items-baseline gap-x-6 gap-y-1 py-4 sm:grid-cols-12 ${
                    pageLive ? 'transition-colors hover:bg-white/[0.02]' : ''
                  }`}
                >
                  <span
                    className="font-mono text-[11px] sm:col-span-1"
                    style={{ color: def.color, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="text-[17px] font-semibold tracking-tight text-white sm:col-span-3"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {pg.title}
                  </span>
                  <span className="text-[14px] leading-relaxed text-ink/70 sm:col-span-6">
                    {pg.blurb}
                  </span>
                  <span className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim/70 sm:col-span-2 sm:justify-end">
                    <span className="truncate">{where ?? 'Soon'}</span>
                    {pageLive && (
                      <span
                        aria-hidden
                        className="shrink-0 transition-transform group-hover:translate-x-1"
                        style={{ color: def.color }}
                      >
                        ↗
                      </span>
                    )}
                  </span>
                </Row>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </motion.div>
  );
}
