import { useEffect, useRef } from 'react';
import { isTouchDevice, prefersReducedMotion } from '../lib/env';

type Point = { x: number; y: number; age: number };

/**
 * Site-wide cursor trail: a fixed, full-screen, pointer-events-none canvas drawn
 * above everything. Tracks recent cursor positions and renders a smooth fading
 * poly-line plus a soft leading glow. Palette-matched and intentionally subtle.
 *
 * Fully disabled on touch devices and under prefers-reduced-motion (renders
 * nothing, attaches no listeners, runs no RAF loop).
 */
export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isTouchDevice() || prefersReducedMotion()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const points: Point[] = [];
    const MAX = 22;
    let mouseInside = false;

    const onMove = (e: PointerEvent) => {
      mouseInside = true;
      points.push({ x: e.clientX, y: e.clientY, age: 0 });
      if (points.length > MAX) points.shift();
    };
    const onLeave = () => {
      mouseInside = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerout', onLeave);

    // Accent blue, matched to --color-accent (#5fb2ff).
    const R = 95;
    const G = 178;
    const B = 255;

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      // Age + cull points so the tail dissolves even when the mouse is still.
      for (let i = points.length - 1; i >= 0; i--) {
        points[i].age += 1;
        if (points[i].age > MAX) points.splice(i, 1);
      }

      if (points.length >= 2) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Draw the trail as overlapping segments with decreasing alpha/width.
        for (let i = 1; i < points.length; i++) {
          const t = i / points.length; // 0 (oldest) → 1 (newest)
          const alpha = t * 0.5;
          ctx.strokeStyle = `rgba(${R},${G},${B},${alpha})`;
          ctx.lineWidth = 0.5 + t * 2.5;
          ctx.beginPath();
          ctx.moveTo(points[i - 1].x, points[i - 1].y);
          ctx.lineTo(points[i].x, points[i].y);
          ctx.stroke();
        }

        // Soft leading glow on the most recent point.
        if (mouseInside) {
          const head = points[points.length - 1];
          const grad = ctx.createRadialGradient(
            head.x,
            head.y,
            0,
            head.x,
            head.y,
            14,
          );
          grad.addColorStop(0, `rgba(${R},${G},${B},0.35)`);
          grad.addColorStop(1, `rgba(${R},${G},${B},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerout', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    />
  );
}
