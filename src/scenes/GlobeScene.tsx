import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { isLowMemory } from '../lib/env';
import { Group, Quaternion, type DirectionalLight } from 'three';
import Earth from './Earth';
import Atmosphere from './Atmosphere';
import JourneyArcs from './JourneyArcs';
import { JOURNEY } from '../data/journey';
import { useScene, pathPosition } from '../state/useScene';
import { latLngToVector3, easeInOut, easeOutCubic, clamp01 } from '../lib/geo';
import {
  updateSunDirection,
  localSunDirection,
  worldSunDirection,
  sunViewDirection,
} from '../lib/sun';

const tmpQuat = new Quaternion();

/**
 * The globe. Its orientation is driven entirely by scroll: each life stop has a
 * quaternion that brings it to face the camera, and we slerp between them along
 * the scroll path. The key light + night-lights shader follow the real-time
 * sub-solar point (recomputed each second), rotated into the globe's frame.
 */
export default function GlobeScene() {
  const groupRef = useRef<Group>(null);
  const outerRef = useRef<Group>(null);
  const introStart = useRef<number | null>(null);
  const lightRef = useRef<DirectionalLight>(null);
  const camera = useThree((s) => s.camera);
  // Bloom only on capable devices — it lifts the city lights, arcs and sunlit
  // limb without touching the daytime surface (which stays below threshold).
  const [bloom] = useState(() => !isLowMemory());

  // Direction from globe centre toward the camera — the spot a stop rotates to.
  const targetDir = useMemo(
    () => camera.position.clone().normalize(),
    [camera],
  );

  // One "facing" quaternion per stop: rotate the stop's surface normal onto the
  // camera direction (minimal-arc, so north stays roughly up).
  const stopQuats = useMemo(() => {
    return JOURNEY.map((s) => {
      const n = latLngToVector3(s.lat, s.lng, 1).normalize();
      return new Quaternion().setFromUnitVectors(n, targetDir);
    });
  }, [targetDir]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    // 0) Fly the whole globe in on load and out as the journey ends — we move the
    // ball toward/away from the camera rather than fading the canvas, so the
    // screen itself never changes. Intro: a one-time zoom-in. Outro: recede into
    // the distance as `globeOpacity` (1 → 0) drops past the journey.
    const outer = outerRef.current;
    if (outer) {
      if (introStart.current === null) introStart.current = state.clock.elapsedTime;
      const introE = easeOutCubic(
        clamp01((state.clock.elapsedTime - introStart.current) / 1.7),
      );
      const exit = 1 - useScene.getState().globeOpacity; // 0 in view, 1 gone
      // Intro: zoom in from far (z −3.2 → 0, scaling up). Outro: the ball lifts up
      // and out of frame to clear the way for the sections, rather than fading.
      outer.position.z = -3.2 * (1 - introE) - 1.4 * exit;
      outer.position.y = 4.6 * exit;
      outer.scale.setScalar((0.25 + 0.75 * introE) * (1 - 0.12 * exit));
    }

    // 1) Orient the globe to the scrolled-to point along the path.
    const pos = pathPosition(useScene.getState().journeyT);
    const i = Math.min(Math.floor(pos), stopQuats.length - 1);
    const frac = pos - i;
    if (i >= stopQuats.length - 1) {
      group.quaternion.copy(stopQuats[stopQuats.length - 1]);
    } else {
      tmpQuat.copy(stopQuats[i]).slerp(stopQuats[i + 1], easeInOut(frac));
      group.quaternion.copy(tmpQuat);
    }

    // 2) Real-time sun: sub-solar point → local dir → rotate into the globe's
    // current orientation (world) → the key light and the night-lights mask.
    updateSunDirection(new Date());
    worldSunDirection.copy(localSunDirection).applyQuaternion(group.quaternion);
    if (lightRef.current) {
      lightRef.current.position.copy(worldSunDirection).multiplyScalar(6);
    }
    // View-space sun for the Earth shader's day/night mask.
    sunViewDirection.copy(worldSunDirection).transformDirection(camera.matrixWorldInverse);
  });

  return (
    <>
      {/* Real sunlight: one key light at the sub-solar point + a low ambient so
          the night side stays dark enough for the city lights to read. */}
      <ambientLight intensity={0.13} />
      <directionalLight ref={lightRef} intensity={2.9} color="#fff4e6" />
      <Stars
        radius={90}
        depth={50}
        count={5000}
        factor={3.5}
        saturation={0}
        fade
        speed={0.3}
      />

      {/* Outer group flies the whole globe in/out (see useFrame). */}
      <group ref={outerRef}>
        <group ref={groupRef}>
          <Earth />
          <JourneyArcs />
        </group>

        {/* Bright cyan atmospheric rim over a soft blue haze, hugging the limb.
            Tight powers keep the glow close to the globe rather than a wide halo. */}
        <Atmosphere
          scale={1.006}
          rimIntensity={1.05}
          rimPower={4.2}
          hazeIntensity={0.36}
          hazePower={2.6}
        />
      </group>

      {bloom && (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.65}
            luminanceSmoothing={0.25}
            mipmapBlur
            radius={0.2}
          />
        </EffectComposer>
      )}
    </>
  );
}
