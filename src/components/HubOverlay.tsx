import { useEffect } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useScene } from '../state/useScene';
import { SPHERES } from '../data/spheres';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.18 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * 2D layer for the orbital hub: a pointer cursor over spheres, and — when a
 * section is open — its content as a sleek full-page overlay that floats over
 * the 3D scene, with the opened sphere docked top-left as the rotating home
 * emblem. Content is data-driven from SPHERES.
 */
export default function HubOverlay() {
  const phase = useScene((s) => s.phase);
  const hovered = useScene((s) => s.hovered);
  const activeSection = useScene((s) => s.activeSection);
  const openSection = useScene((s) => s.openSection);
  const active = SPHERES.find((s) => s.id === activeSection);

  useEffect(() => {
    document.body.style.cursor = hovered && phase === 'hub' ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered, phase]);

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
          {/* Legibility scrim: an accent-tinted wash top-left fading into a
              deepening vignette toward the bottom, so text reads over the scene. */}
          <div
            className="pointer-events-none fixed inset-0"
            style={{
              background: `radial-gradient(115% 80% at 12% -5%, ${active.color}22, transparent 46%), linear-gradient(180deg, rgba(3,5,12,0.45) 0%, rgba(3,5,12,0.80) 55%, rgba(3,5,12,0.96) 100%)`,
            }}
          />

          {/* Transparent hit-target over the docked emblem → home. */}
          <button
            onClick={() => openSection(null)}
            className="fixed left-3 top-3 z-40 h-24 w-24 rounded-full sm:left-8 sm:top-6 sm:h-28 sm:w-28"
            aria-label={`Leave ${active.label}, back to the orbit`}
            title="Back to the orbit"
          />

          {/* Visible back control, top-right (clear of the emblem). */}
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            onClick={() => openSection(null)}
            className="group fixed right-5 top-5 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-ink-dim backdrop-blur-md transition hover:border-white/20 hover:text-ink sm:right-8 sm:top-7"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            Back to orbit
          </motion.button>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="relative z-30 mx-auto max-w-5xl px-6 pb-32 pt-[32vh] sm:px-10 sm:pt-[34vh]"
          >
            {/* ── Hero ───────────────────────────────────────────────── */}
            <motion.div
              variants={item}
              className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.32em]"
              style={{ color: active.color }}
            >
              <span
                className="h-px w-8"
                style={{ background: active.color }}
              />
              {active.tagline}
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-4 bg-gradient-to-br from-white via-white to-white/55 bg-clip-text text-5xl font-bold leading-[0.95] text-transparent sm:text-7xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {active.label}
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-dim sm:text-xl"
            >
              {active.blurb}
            </motion.p>

            {/* CTA + meta chips */}
            <motion.div
              variants={item}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              {active.link && (
                <a
                  href={active.link.href}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[#05070d] shadow-lg transition hover:brightness-110"
                  style={{
                    background: active.color,
                    boxShadow: `0 10px 30px -8px ${active.color}66`,
                  }}
                >
                  {active.link.label}
                  <span aria-hidden>→</span>
                </a>
              )}
              {active.meta.map((m) => (
                <span
                  key={m.k}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-ink-dim backdrop-blur-md"
                >
                  <span className="text-ink-dim/60">{m.k}</span>
                  <span className="mx-1.5 text-white/20">·</span>
                  <span className="text-ink">{m.v}</span>
                </span>
              ))}
            </motion.div>

            {/* ── Content grid ───────────────────────────────────────── */}
            <div className="mt-16 grid gap-5 md:grid-cols-5">
              <motion.section
                variants={item}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md md:col-span-3"
              >
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-dim">
                  Overview
                </h2>
                <p className="mt-4 leading-relaxed text-ink/85">
                  {/* TODO: real overview copy. */}
                  {active.blurb} There’s more to write here — this panel is ready
                  for the full story, screenshots, and links whenever you are.
                </p>
                <p className="mt-4 leading-relaxed text-ink-dim">
                  Drop in sections, media, or a case-study writeup; the layout
                  scrolls as a normal page beneath the floating emblem.
                </p>
              </motion.section>

              <motion.aside
                variants={item}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md md:col-span-2"
              >
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-dim">
                  Highlights
                </h2>
                <ul className="mt-4 space-y-3.5">
                  {active.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background: active.color,
                          boxShadow: `0 0 10px ${active.color}`,
                        }}
                      />
                      <span className="text-sm leading-relaxed text-ink/85">
                        {h}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
