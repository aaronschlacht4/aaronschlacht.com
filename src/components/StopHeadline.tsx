import { AnimatePresence, motion } from 'framer-motion';
import { useScene, focusedStopIndex } from '../state/useScene';

/**
 * The big headline for the current stop, sitting BEHIND the globe. Each stop has
 * a short phrase + where it is; the text "draws" itself in (an outline wipes on,
 * then the fill fades up) and appears at a different scattered spot each stop.
 * Fades out with the globe as the sections take over.
 */

type Stop = { phrase: string; where: string };
const STOPS: Stop[] = [
  { phrase: 'Born Here', where: 'New York City' },
  { phrase: 'Grew Up Here', where: 'Los Angeles' },
  { phrase: 'Gap Yeared Here', where: 'Tel Aviv District' },
  { phrase: 'Study Here', where: 'Columbia University' },
];

// One corner per stop so the headline sits in the clear space around the centred
// globe (not behind it) and lands somewhere different each stop. It wraps within
// `maxWidth` so full words never disappear behind the planet.
const POS = [
  { style: { left: '3%', top: '5%' }, align: 'left', rotate: -2 },
  { style: { left: '3%', bottom: '7%' }, align: 'left', rotate: 2 },
  { style: { right: '3%', top: '5%' }, align: 'right', rotate: 2 },
  { style: { right: '3%', bottom: '7%' }, align: 'right', rotate: -2 },
] as const;

const EASE = [0.33, 1, 0.68, 1] as const;
const PHRASE_SIZE = 'clamp(2rem, 6.5vw, 6.5rem)';

export default function StopHeadline() {
  const index = useScene((s) => focusedStopIndex(s.journeyT));
  const globeOpacity = useScene((s) => s.globeOpacity);
  const stop = STOPS[index] ?? STOPS[0];
  const p = POS[index % POS.length];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ opacity: globeOpacity }}
      aria-hidden
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="absolute"
          style={{
            ...p.style,
            maxWidth: '34vw',
            textAlign: p.align,
            rotate: `${p.rotate}deg`,
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            lineHeight: 0.92,
            letterSpacing: '-0.02em',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          {/* Big phrase — outline draws on, fill fades up under it */}
          <div className="relative">
            <motion.div
              style={{
                fontSize: PHRASE_SIZE,
                WebkitTextStroke: '1.4px rgba(190,220,255,0.9)',
                color: 'transparent',
              }}
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 1.2, ease: EASE }}
            >
              {stop.phrase}
            </motion.div>
            <motion.div
              className="absolute inset-0"
              style={{ fontSize: PHRASE_SIZE, color: 'rgba(155,205,255,0.22)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.7 }}
            >
              {stop.phrase}
            </motion.div>
          </div>

          {/* Where it is — smaller, draws on just after */}
          <motion.div
            className="mt-2"
            style={{
              fontSize: 'clamp(1rem, 2.6vw, 2.2rem)',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: 'rgba(130,185,245,0.6)',
            }}
            initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
            animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
            transition={{ duration: 0.85, ease: EASE, delay: 0.45 }}
          >
            {stop.where}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
