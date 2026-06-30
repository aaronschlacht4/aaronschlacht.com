import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import GlobeScene from './scenes/GlobeScene';
import CursorTrail from './components/CursorTrail';
import JourneyOverlay from './components/JourneyOverlay';
import Sections from './components/Sections';
import MobileFallback from './components/MobileFallback';

import { useScene } from './state/useScene';
import { JOURNEY } from './data/journey';
import { clamp01 } from './lib/geo';
import { DPR_RANGE, isLowMemory, isSmallScreen } from './lib/env';

// Scroll distance (in vh) given to the globe journey before the sections begin.
const JOURNEY_VH = (JOURNEY.length + 1) * 95;

export default function App() {
  const setScroll = useScene((s) => s.setScroll);
  const markScrolled = useScene((s) => s.markScrolled);
  const globeOpacity = useScene((s) => s.globeOpacity);

  // Decide the rendering path once. Phones / low-power → 2D fallback.
  const [useFallback] = useState(() => isSmallScreen() || isLowMemory());

  useEffect(() => {
    if (useFallback) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const vh = window.innerHeight;
        const journeyPx = (JOURNEY_VH / 100) * vh;
        const journeyDistance = Math.max(1, journeyPx - vh);

        const journeyT = clamp01(y / journeyDistance);
        // Globe fades out over the last stretch as the sections take over.
        const fadeStart = journeyDistance * 0.88;
        const fadeDist = vh * 0.7;
        const globeOp = 1 - clamp01((y - fadeStart) / fadeDist);

        setScroll(journeyT, globeOp);
        if (y > 4) markScrolled();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [useFallback, setScroll, markScrolled]);

  if (useFallback) {
    return (
      <>
        <CursorTrail />
        <MobileFallback />
      </>
    );
  }

  return (
    <>
      <CursorTrail />

      {/* Fixed globe behind everything; fades out into the sections. */}
      <div
        className="fixed inset-0 z-0"
        style={{ opacity: globeOpacity, pointerEvents: 'none' }}
        aria-hidden={globeOpacity < 0.05}
      >
        <Canvas
          dpr={DPR_RANGE}
          camera={{ position: [0, 0.35, 3.0], fov: 42, near: 0.1, far: 100 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => gl.setClearColor('#02030a', 1)}
        >
          <Suspense fallback={null}>
            <GlobeScene />
          </Suspense>
        </Canvas>
      </div>

      <JourneyOverlay />

      {/* Scrolling content. The journey spacer is transparent so the globe shows
          through; the sections that follow are opaque and scroll over it. */}
      <div className="relative z-10">
        <div style={{ height: `${JOURNEY_VH}vh` }} aria-hidden />
        <main id="main-content" tabIndex={-1}>
          <Sections />
        </main>
      </div>
    </>
  );
}
