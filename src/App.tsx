import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import GlobeScene from './scenes/GlobeScene';
import Starfield from './components/Starfield';
import StopHeadline from './components/StopHeadline';
import CursorTrail from './components/CursorTrail';
import JourneyOverlay from './components/JourneyOverlay';
import Sections from './components/Sections';
import MobileFallback from './components/MobileFallback';

import { useScene, userRotate } from './state/useScene';
import { JOURNEY } from './data/journey';
import { clamp01 } from './lib/geo';
import { DPR_RANGE, isLowMemory, isSmallScreen } from './lib/env';

// Scroll distance (in vh) for the whole journey. Each stop gets a comfortable
// chunk of scroll; crossing into it triggers the (auto-playing) transition.
const JOURNEY_VH = (JOURNEY.length + 1) * 44;

export default function App() {
  const setScroll = useScene((s) => s.setScroll);
  const markScrolled = useScene((s) => s.markScrolled);
  const globeOpacity = useScene((s) => s.globeOpacity);

  // Decide the rendering path once. Phones / low-power → 2D fallback.
  const [useFallback] = useState(() => isSmallScreen() || isLowMemory());
  const stepRef = useRef(0);

  useEffect(() => {
    if (useFallback) return;
    const N = JOURNEY.length;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const vh = window.innerHeight;
        const journeyPx = (JOURNEY_VH / 100) * vh;
        const journeyDistance = Math.max(1, journeyPx - vh);

        // Snap to the nearest stop: scrolling a chunk advances one stop and the
        // transition plays itself (the arc isn't scrubbed by the raw scroll). The
        // steps finish by 76% of the journey scroll, leaving room to rest on the
        // last stop before the globe lifts away.
        const raw = clamp01(y / journeyDistance);
        const step = Math.round(clamp01(raw / 0.76) * (N - 1));
        if (step !== stepRef.current) {
          stepRef.current = step;
          userRotate.x = 0; // re-centre the new city (drop any manual spin)
          userRotate.y = 0;
        }
        const journeyT = N > 1 ? step / (N - 1) : 0;

        // Globe lifts away only after the last stop, over the final stretch.
        const fadeStart = journeyDistance * 0.86;
        const fadeDist = journeyDistance * 0.14;
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

  // Drag anywhere over the globe (while the journey leads) to spin it around.
  useEffect(() => {
    if (useFallback) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      if (useScene.getState().globeOpacity < 0.5) return; // only during the journey
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      userRotate.y += (e.clientX - lastX) * 0.006;
      userRotate.x = Math.max(
        -1.1,
        Math.min(1.1, userRotate.x + (e.clientY - lastY) * 0.006),
      );
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [useFallback]);

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

      {/* Full-page starfield behind everything (persists through the sections). */}
      <Starfield />

      {/* Big per-stop headline, BEHIND the globe (globe canvas is transparent, so
          it shows around and through the planet). */}
      <StopHeadline />

      {/* Fixed globe; its transparent canvas lets the headline + starfield show
          around and behind the planet. Fades/​lifts out into the sections. */}
      <div
        className="fixed inset-0 z-0"
        style={{ opacity: 1, pointerEvents: 'none' }}
        aria-hidden={globeOpacity < 0.05}
      >
        <Canvas
          dpr={DPR_RANGE}
          camera={{ position: [0, 0.35, 3.4], fov: 42, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => gl.setClearColor('#02030a', 0)}
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
