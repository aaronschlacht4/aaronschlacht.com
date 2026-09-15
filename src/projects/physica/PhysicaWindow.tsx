import { useCallback, useEffect, useState } from 'react';
import type { SphereDef } from '../../data/spheres';
import WindowFrame from '../shared/WindowFrame';
import Dial, { Toggle } from '../shared/Dial';
import { usePhysica } from './usePhysica';

/**
 * The live window into physica.fyi: the site's own shader, running here, with
 * its console (three dials, four toggles, the readouts) under the picture.
 * Drag the picture to move round the hole; left alone, the camera drifts
 * slowly so the frame is never a still.
 */
export default function PhysicaWindow({ def }: { def: SphereDef }) {
  const { hostRef, canvasRef, overlayRef, rendererRef, ready, error } = usePhysica(
    { distance: 42, inclination: 12, diskOuter: 15, steps: 700, quality: 0.5 },
    { drag: true, drift: 1.6, maxQuality: 1, minQuality: 0.3 },
  );

  const [incl, setIncl] = useState(12);
  const [dist, setDist] = useState(42);
  const [outer, setOuter] = useState(15);
  const [disk, setDisk] = useState(true);
  const [beaming, setBeaming] = useState(true);
  const [stars, setStars] = useState(true);
  const [markers, setMarkers] = useState(false);
  const [touched, setTouched] = useState(false);
  const [stats, setStats] = useState({ shadow: 0, fps: 0, quality: 0.5 });

  // Dials → renderer.
  const r = rendererRef.current;
  useEffect(() => {
    if (!r) return;
    r.inclination = incl;
    r.distance = dist;
    r.diskOuter = outer;
    r.showDisk = disk;
    r.beaming = beaming;
    r.showStars = stars;
    r.showMarkers = markers;
  }, [r, incl, dist, outer, disk, beaming, stars, markers]);

  // Drag / drift → dials. Inclination only: drift changes azimuth, which has
  // no dial, and rounding keeps this from re-rendering every frame.
  useEffect(() => {
    if (!ready || !r) return;
    r.onCameraChange = () => {
      const v = Math.round(r.inclination);
      setIncl((cur) => (cur === v ? cur : v));
    };
    const tick = setInterval(() => {
      const s = r.stats();
      setStats({ shadow: s.shadowDegrees, fps: s.fps, quality: s.quality });
    }, 500);
    return () => {
      r.onCameraChange = undefined;
      clearInterval(tick);
    };
  }, [ready, r]);

  const onPointerDown = useCallback(() => setTouched(true), []);
  const tone = def.tone;

  return (
    <WindowFrame
      tone={tone}
      label="Live render"
      site="physica.fyi"
      href="https://physica.fyi"
      console={
        <div className="grid gap-x-8 gap-y-4 lg:grid-cols-12">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3 lg:col-span-8">
            <Dial
              label="Inclination"
              hint="above the disk"
              value={incl}
              min={-89}
              max={89}
              format={(v) => `${v.toFixed(0)}°`}
              onChange={setIncl}
              tone={tone}
              ends={['below', 'above']}
            />
            <Dial
              label="Distance"
              hint="camera radius"
              value={dist}
              min={12}
              max={80}
              step={0.5}
              format={(v) => `${v.toFixed(0)} M`}
              onChange={setDist}
              tone={tone}
              ends={['12 M', '80 M']}
            />
            <Dial
              label="Disk outer edge"
              hint="inner fixed at 6 M"
              value={outer}
              min={9}
              max={28}
              step={0.5}
              format={(v) => `${v.toFixed(0)} M`}
              onChange={setOuter}
              tone={tone}
              ends={['9 M', '28 M']}
            />
          </div>
          <div className="flex flex-wrap items-start gap-2 lg:col-span-4 lg:justify-end">
            <Toggle label="Disk" on={disk} onChange={setDisk} tone={tone} />
            <Toggle label="Beaming" on={beaming} onChange={setBeaming} tone={tone} />
            <Toggle label="Stars" on={stars} onChange={setStars} tone={tone} />
            <Toggle label="Measure" on={markers} onChange={setMarkers} tone={tone} />
          </div>
        </div>
      }
    >
      <div
        ref={hostRef}
        onPointerDown={onPointerDown}
        className="relative aspect-[16/9] max-h-[68vh] w-full cursor-grab touch-none select-none bg-black data-[dragging]:cursor-grabbing"
      >
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
        <canvas
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 block h-full w-full"
          aria-hidden
        />

        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center text-[14px] text-[#9a9ea8]">
            Tracing photons…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-8 text-center text-sm text-[#9a9ea8]">
            This window traces light through curved spacetime on the graphics
            card, and this browser could not start WebGL2.
          </div>
        )}

        {/* Readouts, top-right: the shadow's angular size, and how hard the
            GPU is working. Numbers from the same code the site reports. */}
        {ready && (
          <div
            className="pointer-events-none absolute right-4 top-4 hidden text-right text-[12px] text-white/60 sm:block"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            <div>
              Shadow <span className="text-white/90">{stats.shadow.toFixed(2)}°</span>
            </div>
            <div className="mt-0.5 opacity-70">
              {stats.fps.toFixed(0)} fps · {(stats.quality * 100).toFixed(0)}% res
            </div>
          </div>
        )}

        {/* Drag hint, gone once you have. */}
        {ready && (
          <div
            className="pointer-events-none absolute bottom-4 left-4 text-[13px] text-white/60 transition-opacity duration-700"
            style={{ opacity: touched ? 0 : 1 }}
          >
            Drag to move around it
          </div>
        )}
      </div>
    </WindowFrame>
  );
}
