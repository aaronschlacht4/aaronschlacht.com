import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { isLowMemory } from '../lib/env';
import {
  Group,
  Vector3,
  Quaternion,
  type DirectionalLight,
} from 'three';
import Earth from './Earth';
import JourneyArcs from './JourneyArcs';
import { JOURNEY } from '../data/journey';
import { useScene, pathPosition } from '../state/useScene';
import { latLngToVector3, easeInOut } from '../lib/geo';
import { localSunDirection, worldSunDirection, updateSunDirection } from '../lib/sun';

const tmpQuat = new Quaternion();
const tmpVec = new Vector3();

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

  const sunClock = useRef(0);

  useFrame((_, delta) => {
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

    // 2) Real-time sun. Recompute the sub-solar point ~1x/sec; rotate it into
    //    world space by the globe's current orientation every frame.
    sunClock.current += delta;
    if (sunClock.current > 1 || worldSunDirection.lengthSq() < 0.5) {
      sunClock.current = 0;
      updateSunDirection(new Date());
    }
    worldSunDirection.copy(localSunDirection).applyQuaternion(group.quaternion);
    if (lightRef.current) {
      tmpVec.copy(worldSunDirection).multiplyScalar(5);
      lightRef.current.position.copy(tmpVec);
    }
  });

  return (
    <>
      <ambientLight intensity={0.16} />
      <directionalLight ref={lightRef} position={[5, 2, 4]} intensity={2.2} />
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

      {bloom && (
        <EffectComposer>
          <Bloom
            intensity={0.55}
            luminanceThreshold={0.62}
            luminanceSmoothing={0.28}
            mipmapBlur
            radius={0.55}
          />
        </EffectComposer>
      )}
    </>
  );
}
