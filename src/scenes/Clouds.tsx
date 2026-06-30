import { useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { GLOBE_RADIUS } from '../lib/geo';

/**
 * A slightly larger transparent sphere carrying the cloud texture in its alpha,
 * rotating independently and a touch faster than the globe for a parallax sense
 * of depth. Cheap: a single transparent mesh.
 */
export default function Clouds({ paused = false }: { paused?: boolean }) {
  const ref = useRef<Mesh>(null);
  const cloudMap = useTexture('/textures/earth_clouds.webp');

  useFrame((_, delta) => {
    if (ref.current && !paused) {
      ref.current.rotation.y += delta * 0.012;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[GLOBE_RADIUS * 1.01, 64, 64]} />
      <meshStandardMaterial
        map={cloudMap}
        transparent
        opacity={0.7}
        depthWrite={false}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}
