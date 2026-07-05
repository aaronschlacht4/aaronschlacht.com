import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScene } from '../state/useScene';
import { SPHERES } from '../data/spheres';

/**
 * 2D layer for the orbital hub: a pointer cursor over spheres, and — when a
 * section is open — its content as a full scrollable page, with the opened
 * sphere docked top-left as the section's rotating emblem (click it to go home).
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
          transition={{ duration: 0.5, delay: 0.3 }}
          className="fixed inset-0 z-20 overflow-y-auto"
        >
          {/* Transparent hit-target over the docked emblem sphere → home. */}
          <button
            onClick={() => openSection(null)}
            className="fixed left-3 top-24 z-40 h-24 w-24 rounded-full sm:left-8 sm:top-28 sm:h-28 sm:w-28"
            aria-label={`Leave ${active.label}, back to the orbit`}
            title="Back to the orbit"
          />
          <div className="min-h-screen px-6 pb-28 pt-[22vh] sm:px-16 sm:pt-[24vh]">
            {/* Header clears the top-left emblem sphere */}
            <div className="pl-[8.5rem] sm:pl-44">
              <p
                className="text-xs uppercase tracking-[0.35em]"
                style={{ color: active.color }}
              >
                {active.tagline}
              </p>
              <h1
                className="mt-2 text-4xl font-bold sm:text-6xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {active.label}
              </h1>
            </div>

            <div className="mx-auto mt-12 max-w-3xl">
              <p className="text-lg leading-relaxed text-ink/80">
                {/* TODO: real content per section. */}
                This is the {active.label} section. Its content lives here as a
                normal scrollable page.
              </p>
              <p className="mt-6 text-sm text-ink-dim">
                Click the spinning {active.label.toLowerCase()} sphere in the
                top-left to return to the orbit.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
