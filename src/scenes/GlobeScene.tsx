import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { isLowMemory } from '../lib/env';
import { Group, Quaternion, Euler, type DirectionalLight } from 'three';
import { makeSpaceEnv } from './hub/spaceEnv';
import Earth from './Earth';
import Atmosphere, { atmoGlow } from './Atmosphere';
import JourneyArcs from './JourneyArcs';
import OrbitHub from './hub/OrbitHub';
import { JOURNEY } from '../data/journey';
import { useScene, pathPosition, journeyAnim, userRotate } from '../state/useScene';
import { latLngToVector3, easeInOut, easeOutCubic, clamp01, lerp } from '../lib/geo';
import {
  updateSunDirection,
  localSunDirection,
  worldSunDirection,
  sunViewDirection,
} from '../lib/sun';

const tmpQuat = new Quaternion();
const tmpUserQuat = new Quaternion();
const tmpEuler = new Euler();

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
  const hubAnim = useRef(0);
  const sectionAnim = useRef(0);
  const hubSpin = useRef(0);
  const lightRef = useRef<DirectionalLight>(null);
  const hubFillRef = useRef<DirectionalLight>(null);
  const camera = useThree((s) => s.camera);
  // Bloom only on capable devices — it lifts the city lights, arcs and sunlit
  // limb without touching the daytime surface (which stays below threshold).
  const [bloom] = useState(() => !isLowMemory());
  // Space environment for reflections/refraction on the crystal ball.
  const env = useMemo(makeSpaceEnv, []);

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

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const phase = useScene.getState().phase;

    // 0) One choreographed Earth transform across the phases: intro zoom-in →
    // hero (journey) → shrink to the hub centre → dock tiny in the top-left when
    // a section opens. Everything is damped so it reads as one motion.
    const outer = outerRef.current;
    if (outer) {
      if (introStart.current === null) introStart.current = state.clock.elapsedTime;
      const introE = easeOutCubic(
        clamp01((state.clock.elapsedTime - introStart.current) / 1.7),
      );
      const kh = 1 - Math.exp(-4 * Math.min(delta, 0.05));
      hubAnim.current += ((phase === 'journey' ? 0 : 1) - hubAnim.current) * kh;
      sectionAnim.current +=
        ((phase === 'section' ? 1 : 0) - sectionAnim.current) *
        (1 - Math.exp(-5 * Math.min(delta, 0.05)));
      const h = easeInOut(hubAnim.current);
      const s = easeInOut(sectionAnim.current);

      // journey: hero. hub: shrink to centre. section: fly up and away (the
      // opened sphere becomes the top-left emblem, so Earth clears out).
      const heroScale = 0.25 + 0.75 * introE;
      const earthScale = lerp(heroScale, lerp(0.4, 0.02, s), h);
      outer.scale.setScalar(earthScale);
      outer.position.set(0, h * 3.6 * s, (1 - h) * -3.2 * (1 - introE));
      // Keep the atmosphere glow proportional to the shrinking Earth so Bloom
      // doesn't leave an oversized halo around the tiny hub planet.
      atmoGlow.mul = Math.min(1, earthScale / 0.85);

      // Steady front-left fill for the hub/section spheres + docked emblem, so
      // they read well regardless of where the rotating real-time sun points.
      // Faded out during the journey so the day/night globe is untouched.
      if (hubFillRef.current) hubFillRef.current.intensity = h * 1.7;
    }

    // 1) Orientation. During the journey the globe faces the scrolled-to stop;
    // in the hub/section it drifts on a slow tilted spin (Earth = home button).
    if (phase === 'journey') {
      const target = pathPosition(useScene.getState().journeyT);
      const k = 1 - Math.exp(-9 * Math.min(delta, 0.05));
      journeyAnim.pos += (target - journeyAnim.pos) * k;
      if (Math.abs(target - journeyAnim.pos) < 0.008) journeyAnim.pos = target;
      const pos = journeyAnim.pos;
      const i = Math.min(Math.floor(pos), stopQuats.length - 1);
      const frac = pos - i;
      if (i >= stopQuats.length - 1) {
        group.quaternion.copy(stopQuats[stopQuats.length - 1]);
      } else {
        tmpQuat.copy(stopQuats[i]).slerp(stopQuats[i + 1], easeInOut(frac));
        group.quaternion.copy(tmpQuat);
      }
      if (userRotate.x !== 0 || userRotate.y !== 0) {
        tmpUserQuat.setFromEuler(tmpEuler.set(userRotate.x, userRotate.y, 0, 'YXZ'));
        group.quaternion.premultiply(tmpUserQuat);
      }
    } else {
      hubSpin.current += delta * 0.06;
      group.rotation.set(0.28, hubSpin.current, 0);
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
      <ambientLight intensity={0.16} />
      <directionalLight ref={lightRef} intensity={2.9} color="#fff4e6" />
      {/* Soft fixed fill so the orbiting spheres read from every angle. */}
      <directionalLight position={[2.5, 3, 4]} intensity={0.55} color="#bcd2ff" />
      {/* Front-left key for the hub spheres + docked emblem (ramped in useFrame
          so it only lights the hub/section, not the journey globe). */}
      <directionalLight
        ref={hubFillRef}
        position={[-2.5, 2, 4.5]}
        intensity={0}
        color="#eef3ff"
      />
      {/* IBL for the crystal ball's reflections/refraction (no visible bg). */}
      <Environment map={env} />

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

      {/* Project spheres orbiting Earth — fly in as it shrinks to the hub. */}
      <OrbitHub />

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
