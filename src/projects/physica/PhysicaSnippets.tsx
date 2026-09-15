import { useEffect, useState, type ReactNode } from 'react';
import type { SphereDef } from '../../data/spheres';
import Dial, { Toggle } from '../shared/Dial';
import SnippetCard from '../shared/SnippetCard';
import { usePhysica, type PhysicaInit } from './usePhysica';
import { B_CRIT, HORIZON, shadowAngle } from './renderer';

/**
 * Three small live renders, each isolating one idea from the write-up with
 * a single control — the parts of the site you'd point at to explain it.
 * Cheap on purpose: fewer integration steps, capped resolution, no drag,
 * and each pauses when scrolled out of view.
 */

const SNIPPET_OPTS = { drag: false, drift: 0, maxQuality: 0.6, minQuality: 0.25 };

function MiniRender({
  init,
  apply,
  overlay = false,
  children,
}: {
  init: PhysicaInit;
  /** called whenever the live values change, to push them into the renderer */
  apply: (r: NonNullable<ReturnType<typeof usePhysica>['rendererRef']['current']>) => void;
  overlay?: boolean;
  children?: ReactNode;
}) {
  const { hostRef, canvasRef, overlayRef, rendererRef, ready, error } = usePhysica(
    { steps: 420, quality: 0.5, ...init },
    SNIPPET_OPTS,
  );
  const r = rendererRef.current;
  useEffect(() => {
    if (r) apply(r);
  });
  return (
    <div ref={hostRef} className="relative aspect-[4/3] w-full bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
      {overlay && (
        <canvas
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 block h-full w-full"
          aria-hidden
        />
      )}
      {!ready && !error && (
        <div className="absolute inset-0 animate-pulse bg-white/[0.02]" />
      )}
      {error && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-xs text-ink-dim">
          Needs WebGL2.
        </div>
      )}
      {children}
    </div>
  );
}

function BeamingSnippet({ def }: { def: SphereDef }) {
  const [on, setOn] = useState(true);
  return (
    <SnippetCard
      index={1}
      color={def.color}
      title="Beaming"
      caption="The gas orbits at half the speed of light. Brightness goes as the fourth power of the Doppler shift, so the side sweeping toward you floods and the other sinks. Switch it off to see the disk as if the gas sat still."
      control={<Toggle label="Doppler beaming" on={on} onChange={setOn} color={def.color} />}
    >
      <MiniRender
        init={{ distance: 30, inclination: 10, diskOuter: 15, showStars: false, exposure: 0.62 }}
        apply={(r) => {
          r.beaming = on;
        }}
      />
    </SnippetCard>
  );
}

function ShadowSnippet({ def }: { def: SphereDef }) {
  const [dist, setDist] = useState(24);
  const deg = (shadowAngle(dist) * 180) / Math.PI;
  return (
    <SnippetCard
      index={2}
      color={def.color}
      title="Shadow ÷ horizon"
      caption={`The dark patch is ${(B_CRIT / HORIZON).toFixed(2)}× the horizon. A photon doesn't have to hit the hole to be lost: anything aimed inside b = 3√3 M spirals in, so the hole captures a disc of sky far wider than itself.`}
      control={
        <Dial
          label="Distance"
          value={dist}
          min={12}
          max={80}
          step={0.5}
          format={(v) => `${v.toFixed(0)} M · shadow ${deg.toFixed(1)}°`}
          onChange={setDist}
          color={def.color}
          compact
        />
      }
    >
      <MiniRender
        init={{ distance: 24, inclination: 78, diskOuter: 12, showMarkers: true, showStars: false, exposure: 0.5 }}
        overlay
        apply={(r) => {
          r.distance = dist;
        }}
      />
    </SnippetCard>
  );
}

function OverTheTopSnippet({ def }: { def: SphereDef }) {
  const [incl, setIncl] = useState(6);
  return (
    <SnippetCard
      index={3}
      color={def.color}
      title="Over the top"
      caption="At a shallow angle the disk seems to pass over the hole. It doesn't: that's the far side of the disk, behind the hole, with its light bent up and over toward you. Tilt the view and watch it fold."
      control={
        <Dial
          label="Inclination"
          value={incl}
          min={-89}
          max={89}
          format={(v) => `${v.toFixed(0)}°`}
          onChange={setIncl}
          color={def.color}
          compact
        />
      }
    >
      <MiniRender
        init={{ distance: 34, inclination: 6, diskOuter: 16, exposure: 0.6 }}
        apply={(r) => {
          r.inclination = incl;
        }}
      />
    </SnippetCard>
  );
}

export default function PhysicaSnippets({ def }: { def: SphereDef }) {
  return (
    <>
      <BeamingSnippet def={def} />
      <ShadowSnippet def={def} />
      <OverTheTopSnippet def={def} />
    </>
  );
}
