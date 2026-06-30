import { useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  Group,
  Vector3,
  Quaternion,
  Color,
  MeshStandardMaterial,
  type Mesh,
} from 'three';
import type { Line2 } from 'three-stdlib';
import { JOURNEY } from '../data/journey';
import { useScene, pathPosition } from '../state/useScene';
import { greatCircleArc, latLngToVector3 } from '../lib/geo';

const SEG = 72; // points per arc → SEG-1 drawable sub-segments
const MARKER_ALT = 1.012;
const Y = new Vector3(0, 1, 0);
const ACCENT = new Color('#5fb2ff');
const tmpTangent = new Vector3();
const tmpQuat = new Quaternion();

type Segment = { points: Vector3[]; count: number };

/**
 * The animated route between life stops, plus a glowing marker at each stop and
 * a single arrowhead that rides the tip of the currently-drawing arc. Everything
 * is a child of the rotating globe group, so the routes stay glued to the map.
 *
 * Drawing is animated by clamping each fat-line's `instanceCount` from the scroll
 * store inside useFrame — no geometry rebuilds, no React re-renders per scroll.
 */
export default function JourneyArcs() {
  const segments: Segment[] = useMemo(() => {
    const out: Segment[] = [];
    for (let i = 0; i < JOURNEY.length - 1; i++) {
      const a = JOURNEY[i];
      const b = JOURNEY[i + 1];
      const points = greatCircleArc(a.lat, a.lng, b.lat, b.lng, SEG);
      out.push({ points, count: points.length - 1 });
    }
    return out;
  }, []);

  const markerPositions = useMemo(
    () =>
      JOURNEY.map((s) => latLngToVector3(s.lat, s.lng, MARKER_ALT)),
    [],
  );

  const brightRefs = useRef<(Line2 | null)[]>([]);
  const markerRefs = useRef<(Mesh | null)[]>([]);
  const arrowRef = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pos = pathPosition(useScene.getState().journeyT);

    // Draw each segment up to its local progress.
    let arrowPlaced = false;
    for (let i = 0; i < segments.length; i++) {
      const segProgress = Math.max(0, Math.min(1, pos - i));
      const line = brightRefs.current[i];
      if (line) {
        const drawn = Math.floor(segProgress * segments[i].count);
        (line.geometry as unknown as { instanceCount: number }).instanceCount =
          drawn;
      }

      // Place the arrowhead at the tip of the first partially-drawn segment.
      if (!arrowPlaced && segProgress > 0 && segProgress < 1 && arrowRef.current) {
        const pts = segments[i].points;
        const idx = Math.max(1, Math.floor(segProgress * (pts.length - 1)));
        const tip = pts[idx];
        tmpTangent.copy(tip).sub(pts[idx - 1]).normalize();
        tmpQuat.setFromUnitVectors(Y, tmpTangent);
        arrowRef.current.position.copy(tip);
        arrowRef.current.quaternion.copy(tmpQuat);
        arrowRef.current.visible = true;
        arrowPlaced = true;
      }
    }
    if (!arrowPlaced && arrowRef.current) arrowRef.current.visible = false;

    // Markers: brighten + pulse once the route has reached them.
    for (let i = 0; i < markerRefs.current.length; i++) {
      const m = markerRefs.current[i];
      if (!m) continue;
      const reached = pos >= i - 0.02;
      const pulse = 1 + Math.sin(t * 2.4 + i) * 0.15;
      const targetScale = reached ? pulse : 0.6;
      m.scale.setScalar(m.scale.x + (targetScale - m.scale.x) * 0.15);
      const mat = m.material as MeshStandardMaterial;
      const wantGlow = reached ? 2.4 : 0.4;
      mat.emissiveIntensity += (wantGlow - mat.emissiveIntensity) * 0.15;
    }
  });

  return (
    <group>
      {/* Faint full tracks for context */}
      {segments.map((s, i) => (
        <Line
          key={`track-${i}`}
          points={s.points}
          color="#2a4a6a"
          lineWidth={1}
          transparent
          opacity={0.35}
        />
      ))}

      {/* Bright animated routes */}
      {segments.map((s, i) => (
        <Line
          key={`bright-${i}`}
          ref={(el) => {
            brightRefs.current[i] = el as unknown as Line2 | null;
          }}
          points={s.points}
          color="#7fc4ff"
          lineWidth={2.5}
          transparent
          opacity={0.95}
        />
      ))}

      {/* Stop markers */}
      {markerPositions.map((p, i) => (
        <mesh
          key={`marker-${i}`}
          ref={(el) => {
            markerRefs.current[i] = el;
          }}
          position={p}
        >
          <sphereGeometry args={[0.016, 18, 18]} />
          <meshStandardMaterial
            color={ACCENT}
            emissive={ACCENT}
            emissiveIntensity={0.4}
            transparent
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Single arrowhead riding the active arc tip */}
      <group ref={arrowRef} visible={false}>
        <mesh>
          <coneGeometry args={[0.02, 0.05, 14]} />
          <meshStandardMaterial
            color={'#bfe0ff'}
            emissive={'#bfe0ff'}
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
