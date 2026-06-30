import { AnimatePresence, motion } from 'framer-motion';
import { useScene, focusedStopIndex } from '../state/useScene';
import { JOURNEY } from '../data/journey';
import { SITE_TITLE } from '../data/sections';
import Clock from './Clock';

/**
 * 2D layer over the globe during the journey: wordmark + live clock, the current
 * stop's caption (crossfading as you scroll), a vertical progress rail, and a
 * scroll hint. The whole layer fades with `globeOpacity` as the sections arrive.
 */
export default function JourneyOverlay() {
  const index = useScene((s) => focusedStopIndex(s.journeyT));
  const globeOpacity = useScene((s) => s.globeOpacity);
  const hasScrolled = useScene((s) => s.hasScrolled);
  const stop = JOURNEY[index];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30"
      style={{ opacity: globeOpacity }}
    >
      {/* Top bar: wordmark + clock */}
      <div className="flex items-start justify-between p-4 sm:p-6">
        <span
          className="text-sm font-semibold tracking-[0.18em] text-ink uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {SITE_TITLE}
        </span>
        <div className="pointer-events-auto rounded-full border border-white/10 bg-[rgba(8,13,22,0.5)] px-3 py-1.5 backdrop-blur-md">
          <Clock />
        </div>
      </div>

      {/* Current stop caption */}
      <div className="absolute bottom-20 left-4 max-w-sm sm:bottom-24 sm:left-10">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">
          {index === 0 ? 'A life in six moves' : `Stop ${index + 1} of ${JOURNEY.length}`}
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={stop.id}
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2
              className="text-4xl font-bold leading-none tracking-tight sm:text-6xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {stop.place}
            </h2>
            <p className="mt-2 text-lg text-ink-dim sm:text-xl">{stop.region}</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-accent)]">
              {stop.when}
            </p>
            {stop.note && (
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink/70">
                {stop.note}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Vertical progress rail */}
      <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex">
        {JOURNEY.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full transition-all duration-300"
              style={{
                background: i <= index ? 'var(--color-accent)' : '#33425a',
                transform: i === index ? 'scale(1.6)' : 'scale(1)',
                boxShadow:
                  i === index ? '0 0 10px var(--color-accent)' : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Scroll hint */}
      <AnimatePresence>
        {!hasScrolled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs tracking-[0.3em] text-ink-dim uppercase"
          >
            <div className="mb-2">scroll to travel</div>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto h-2 w-2 rotate-45 border-b border-r border-ink-dim"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
