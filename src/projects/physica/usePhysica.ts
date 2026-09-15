import { useEffect, useRef, useState } from 'react';
import { PhysicaRenderer, type RendererOptions } from './renderer';

/**
 * Mounts a PhysicaRenderer onto a host div + canvas (+ optional overlay
 * canvas for the measured circles), applies the initial camera/disk settings,
 * and tears it down on unmount. Returns the refs to attach and the live
 * renderer, which callers mutate directly (it reads its fields every frame).
 */
export type PhysicaInit = Partial<
  Pick<
    PhysicaRenderer,
    | 'distance' | 'inclination' | 'azimuth' | 'fov' | 'showDisk' | 'showStars'
    | 'beaming' | 'showMarkers' | 'diskOuter' | 'exposure' | 'steps' | 'quality'
  >
>;

export function usePhysica(init: PhysicaInit, opts: RendererOptions) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PhysicaRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Initial settings are applied once; later changes go straight to the
  // renderer through the ref, so the effect deliberately doesn't depend on them.
  const initRef = useRef(init);
  const optsRef = useRef(opts);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let r: PhysicaRenderer;
    try {
      r = new PhysicaRenderer(host, canvas, overlayRef.current, optsRef.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    Object.assign(r, initRef.current);
    rendererRef.current = r;
    setReady(true);
    return () => {
      r.dispose();
      rendererRef.current = null;
    };
  }, []);

  return { hostRef, canvasRef, overlayRef, rendererRef, ready, error };
}
