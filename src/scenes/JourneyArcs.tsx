import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Group,
  Vector3,
  Quaternion,
  Color,
  BufferGeometry,
  BufferAttribute,
  Line as ThreeLine,
  ShaderMaterial,
  AdditiveBlending,
  MeshStandardMaterial,
  type Mesh,
} from 'three';
import { JOURNEY } from '../data/journey';
import { useScene, pathPosition } from '../state/useScene';
import { greatCircleArc, latLngToVector3 } from '../lib/geo';

const SEG = 120; // points per arc
const MARKER_ALT = 1.006;
const Y = new Vector3(0, 1, 0);
const ACCENT = new Color('#5fb2ff');
const tmpTangent = new Vector3();
const tmpQuat = new Quaternion();

/**
 * The faint background track — a facing-faded thin line so it dissolves into the
 * limb as the globe rotates rather than beaming straight across the disc.
 */
function makeTrackMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color('#3f74a8') } },
    vertexShader: /* glsl */ `
      varying float vFacing;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normalize(position));
        vFacing = dot(n, normalize(-mv.xyz));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vFacing;
      void main() {
        float a = smoothstep(0.05, 0.4, vFacing) * 0.35;
        if (a <= 0.002) discard;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
}

/**
 * The bright route — a glowing comet-streak. Brightest at the leading tip
 * (uTip), fading down a cyan→blue trail behind it, and faded toward the limb by
 * facing so it dives over the horizon. Additive, so Bloom turns it into light.
 */
function makeStreakMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: AdditiveBlending,
    uniforms: {
      uHead: { value: new Color('#eaffff') },
      uTrail: { value: new Color('#49b8ff') },
      uTip: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      varying float vFacing;
      varying float vT;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normalize(position));
        vFacing = dot(n, normalize(-mv.xyz));
        vT = aT;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uHead;
      uniform vec3 uTrail;
      uniform float uTip;
      varying float vFacing;
      varying float vT;
      void main() {
        float fade = smoothstep(0.04, 0.42, vFacing);     // dive into the limb
        float d = uTip - vT;                              // distance behind the tip
        if (d < 0.0) discard;                             // ahead of the tip = undrawn
        float head = exp(-pow(d / 0.05, 2.0));            // bright comet head
        float trail = (1.0 - clamp(d / 0.7, 0.0, 1.0));   // long fading tail
        float b = fade * (0.4 * trail + 1.6 * head);
        vec3 col = mix(uTrail, uHead, head);
        if (b <= 0.002) discard;
        gl_FragColor = vec4(col * b, b);
      }
    `,
  });
}

type Arc = {
  points: Vector3[];
  count: number;
  track: ThreeLine;
  streak: ThreeLine;
  streakGeom: BufferGeometry;
  streakMat: ShaderMaterial;
};

/**
 * The route between life stops: a faint track, a bright comet-streak that draws
 * in as you scroll with a glowing head riding its tip, and a marker at each stop.
 * All children of the rotating globe group, so they stay glued to the map.
 */
export default function JourneyArcs() {
  const arcs: Arc[] = useMemo(() => {
    const out: Arc[] = [];
    for (let i = 0; i < JOURNEY.length - 1; i++) {
      const a = JOURNEY[i];
      const b = JOURNEY[i + 1];
      const points = greatCircleArc(a.lat, a.lng, b.lat, b.lng, SEG);
      const n = points.length;

      const trackGeom = new BufferGeometry().setFromPoints(points);
      const track = new ThreeLine(trackGeom, makeTrackMaterial());

      const streakGeom = new BufferGeometry().setFromPoints(points);
      const aT = new Float32Array(n);
      for (let k = 0; k < n; k++) aT[k] = k / (n - 1);
      streakGeom.setAttribute('aT', new BufferAttribute(aT, 1));
      streakGeom.setDrawRange(0, 0);
      const streakMat = makeStreakMaterial();
      const streak = new ThreeLine(streakGeom, streakMat);

      out.push({ points, count: n, track, streak, streakGeom, streakMat });
    }
    return out;
  }, []);

  const markerPositions = useMemo(
    () => JOURNEY.map((s) => latLngToVector3(s.lat, s.lng, MARKER_ALT)),
    [],
  );

  const markerRefs = useRef<(Mesh | null)[]>([]);
  const cometRef = useRef<Group>(null);
  const cometCoreRef = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pos = pathPosition(useScene.getState().journeyT);

    let cometPlaced = false;
    for (let i = 0; i < arcs.length; i++) {
      const segProgress = Math.max(0, Math.min(1, pos - i));
      const drawn = Math.round(segProgress * (arcs[i].count - 1)) + 1;
      arcs[i].streakGeom.setDrawRange(0, segProgress > 0 ? drawn : 0);
      arcs[i].streakMat.uniforms.uTip.value = segProgress;

      // The glowing comet head rides the tip of the first in-progress segment.
      if (!cometPlaced && segProgress > 0 && segProgress < 1 && cometRef.current) {
        const pts = arcs[i].points;
        const idx = Math.max(1, Math.floor(segProgress * (pts.length - 1)));
        const tip = pts[idx];
        tmpTangent.copy(tip).sub(pts[idx - 1]).normalize();
        tmpQuat.setFromUnitVectors(Y, tmpTangent);
        cometRef.current.position.copy(tip);
        cometRef.current.quaternion.copy(tmpQuat);
        cometRef.current.visible = true;
        cometPlaced = true;
      }
    }
    if (!cometPlaced && cometRef.current) cometRef.current.visible = false;
    if (cometCoreRef.current) {
      const s = 1 + Math.sin(t * 7) * 0.18; // gentle twinkle
      cometCoreRef.current.scale.setScalar(s);
    }

    // Markers: brighten + pulse once the route has reached them.
    for (let i = 0; i < markerRefs.current.length; i++) {
      const m = markerRefs.current[i];
      if (!m) continue;
      const reached = pos >= i - 0.02;
      const pulse = 1 + Math.sin(t * 2.4 + i) * 0.15;
      const targetScale = reached ? pulse : 0.6;
      m.scale.setScalar(m.scale.x + (targetScale - m.scale.x) * 0.15);
      const mat = m.material as MeshStandardMaterial;
      const wantGlow = reached ? 2.6 : 0.4;
      mat.emissiveIntensity += (wantGlow - mat.emissiveIntensity) * 0.15;
    }
  });

  return (
    <group>
      {arcs.map((arc, i) => (
        <group key={`arc-${i}`}>
          <primitive object={arc.track} />
          <primitive object={arc.streak} />
        </group>
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

      {/* Glowing comet head riding the active arc tip: a bright core inside a
          soft halo — Bloom turns it into a travelling light. */}
      <group ref={cometRef} visible={false}>
        <mesh ref={cometCoreRef}>
          <sphereGeometry args={[0.02, 20, 20]} />
          <meshBasicMaterial color="#eaffff" toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.045, 20, 20]} />
          <meshBasicMaterial
            color="#7fd6ff"
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
