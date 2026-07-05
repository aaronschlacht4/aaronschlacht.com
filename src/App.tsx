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

  // Gesture stepping: while the journey leads, ONE scroll gesture (however big)
  // advances exactly ONE stop — separate gestures move separate stops. We drive
  // the scroll position to each stop and let the damped globe play the transition;
  // at the last stop one more gesture releases to the sections below.
  useEffect(() => {
    if (useFallback) return;
    const N = JOURNEY.length;
    // A "gesture" is a burst of wheel/touch events with gaps under GAP ms; only
    // its FIRST event steps (and no sooner than MIN_INTERVAL after the last step),
    // so one flick = one stop no matter how far it scrolls, and separate flicks
    // move separate stops. Deterministic (timestamp-based), no racy timers.
    const GAP = 220;
    const MIN_INTERVAL = 480;
    let lastEvent = 0;
    let lastStep = -1e9;
    let step = 0; // explicit current stop (not derived from the lagging scrollY)
    let released = false;
    const dist = () =>
      Math.max(1, (JOURNEY_VH / 100) * window.innerHeight - window.innerHeight);
    const stepY = (s: number) => (N > 1 ? (0.76 * s) / (N - 1) : 0) * dist();
    // Instant jump — CSS scroll-behavior is smooth, which would lag scrollY; the
    // globe's own damping animates the visual transition instead.
    const jump = (y: number) =>
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    const advance = (dir: number) => {
      if (dir > 0) {
        if (step < N - 1) jump(stepY(++step));
        else {
          released = true; // one more gesture past the last stop → leave
          jump(dist());
        }
      } else if (step > 0) {
        jump(stepY(--step));
      }
    };
    const gesture = (dir: number, e: Event) => {
      if (released) {
        // Scrolled back up into the journey → re-engage at the last stop.
        if (window.scrollY < stepY(N - 1) - window.innerHeight * 0.2) {
          released = false;
          step = N - 1;
          jump(stepY(step));
          lastStep = Date.now();
        }
        return; // otherwise let the sections scroll natively
      }
      e.preventDefault();
      const now = Date.now();
      const newGesture = now - lastEvent > GAP;
      lastEvent = now;
      if (!newGesture || now - lastStep < MIN_INTERVAL) return;
      lastStep = now;
      advance(dir);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 1) return;
      gesture(e.deltaY > 0 ? 1 : -1, e);
    };
    const onKey = (e: KeyboardEvent) => {
      const down = ['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key);
      const up = ['ArrowUp', 'PageUp'].includes(e.key);
      if (down || up) gesture(down ? 1 : -1, e);
    };
    // Touch: one swipe = one stop.
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!released && e.cancelable) e.preventDefault(); // block native scroll while stepping
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      if (Math.abs(dy) > 34) gesture(dy > 0 ? 1 : -1, e);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [useFallback]);

  // Drag anywhere over the globe (while the journey leads) to spin it around.
  useEffect(() => {
    if (useFallback) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // touch = stepping; mouse = spin
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
