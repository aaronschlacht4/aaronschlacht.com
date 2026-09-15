import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScene } from '../state/useScene';
import { SPHERES } from '../data/spheres';
import ProjectPage from './ProjectPage';

/**
 * 2D layer for the orbital hub: a pointer cursor over spheres, and — when a
 * section is open — that project's page, an opaque off-white document laid
 * over the (faded-out) 3D scene. Nothing from the scene shows through it;
 * the page is a page.
 */
export default function HubOverlay() {
  const phase = useScene((s) => s.phase);
  const hovered = useScene((s) => s.hovered);
  const activeSection = useScene((s) => s.activeSection);
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
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-20 overflow-y-auto bg-[#f5f3ee] text-[#15171c]"
          style={{ colorScheme: 'light' }}
        >
          <ProjectPage def={active} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
