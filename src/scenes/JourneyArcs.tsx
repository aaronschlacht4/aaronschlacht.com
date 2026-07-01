import { useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  Group,
  Vector3,
  Quaternion,
  Color,
  MeshStandardMaterial,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  CanvasTexture,
  AdditiveBlending,
  SRGBColorSpace,
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

const COMET_TRAIL = 22; // particles in the flying-star trail
const COMET_LEN = 0.17; // how far the trail streams behind the lead star

/** A soft round glow with a 4-point sparkle cross — one "star". */
function makeStarTexture(): CanvasTexture {
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(210,235,255,0.85)');
  g.addColorStop(0.55, 'rgba(150,200,255,0.3)');
  g.addColorStop(1, 'rgba(120,180,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(s / 2, 3);
  ctx.lineTo(s / 2, s - 3);
  ctx.moveTo(3, s / 2);
  ctx.lineTo(s - 3, s / 2);
  ctx.stroke();
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/**
 * Build the comet: a cloud of `COMET_TRAIL` star points streaming backwards
 * along local -Y (the group is oriented so +Y is the direction of travel), each
 * one dimmer, smaller, and slightly scattered as it trails off. Rendered with a
 * per-point size shader + additive blending so the tip reads as a bright flying
 * star with a sparkly tail (and bloom lifts it further).
 */
function makeComet(): { geometry: BufferGeometry; material: ShaderMaterial } {
  const pos = new Float32Array(COMET_TRAIL * 3);
  const col = new Float32Array(COMET_TRAIL * 3);
  const size = new Float32Array(COMET_TRAIL);
  const head = new Color('#eaf4ff');
  const tail = new Color('#5fb2ff');
  const tmp = new Color();
  for (let i = 0; i < COMET_TRAIL; i++) {
    const t = i / (COMET_TRAIL - 1); // 0 = lead star, 1 = tail
    pos[i * 3] = Math.sin(i * 12.9) * 0.01 * t; // gentle sideways scatter
    pos[i * 3 + 1] = -t * COMET_LEN; // stream behind the tip
    pos[i * 3 + 2] = Math.cos(i * 7.3) * 0.01 * t;
    tmp.copy(head).lerp(tail, t).multiplyScalar(1 - t * 0.7);
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
    size[i] = (1 - t) * 26 + 5;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(pos, 3));
  geometry.setAttribute('aColor', new BufferAttribute(col, 3));
  geometry.setAttribute('aSize', new BufferAttribute(size, 1));

  const material = new ShaderMaterial({
    uniforms: { uTex: { value: makeStarTexture() }, uTwinkle: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    vertexShader: `
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uTwinkle;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uTwinkle * (1.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTex;
      varying vec3 vColor;
      void main() {
        vec4 tex = texture2D(uTex, gl_PointCoord);
        gl_FragColor = vec4(vColor * tex.rgb, tex.a);
      }
    `,
  });
  return { geometry, material };
}

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

  // The flying-star comet that rides the tip of the currently-drawing arc.
  const comet = useMemo(makeComet, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pos = pathPosition(useScene.getState().journeyT);

    // Twinkle the flying star.
    comet.material.uniforms.uTwinkle.value = 1 + Math.sin(t * 6) * 0.25;

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

      {/* Flying star riding the active arc tip, trailing a sparkly comet tail */}
      <group ref={arrowRef} visible={false}>
        <points geometry={comet.geometry} material={comet.material} />
      </group>
    </group>
  );
}
