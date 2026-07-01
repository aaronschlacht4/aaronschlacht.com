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
import { latLngToVector3, easeInOut } from '../lib/geo';

const tmpQuat = new Quaternion();

/**
 * The globe. Its orientation is driven entirely by scroll: each life stop has a
 * quaternion that brings it to face the camera, and we slerp between them along
 * the scroll path. The key light + night-lights shader follow the real-time
 * sub-solar point (recomputed each second), rotated into the globe's frame.
 */
export default function GlobeScene() {
  const groupRef = useRef<Group>(null);
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

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

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

  });

  return (
    <>
      {/* Front-key + blue sky fill so the camera-facing hemisphere reads as a
          bright blue Earth (rather than the real-time night side). */}
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#8bb4e8', '#0a1424', 0.6]} />
      <directionalLight
        ref={lightRef}
        position={[3, 2, 4.5]}
        intensity={2.6}
      />
      <Stars
        radius={90}
        depth={50}
        count={5000}
        factor={3.5}
        saturation={0}
        fade
        speed={0.3}
      />

      <group ref={groupRef}>
        <Earth />
        <JourneyArcs />
      </group>

      {/* Beautiful blue glow: an additive fresnel rim plus a soft, broad halo
          that blend into one luminous atmosphere (bloom spreads it further). */}
      <Atmosphere color="#4aa3ff" scale={1.15} intensity={1.3} power={3.0} />
      <Atmosphere color="#79c2ff" scale={1.3} intensity={0.6} power={1.5} />

      {bloom && (
        <EffectComposer>
          <Bloom
            intensity={0.75}
            luminanceThreshold={0.5}
            luminanceSmoothing={0.3}
            mipmapBlur
            radius={0.62}
          />
        </EffectComposer>
      )}
    </>
  );
}
