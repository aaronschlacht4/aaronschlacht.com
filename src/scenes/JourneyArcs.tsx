import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Group,
  Vector3,
  Quaternion,
  Color,
  CatmullRomCurve3,
  TubeGeometry,
  BufferGeometry,
  Line as ThreeLine,
  ShaderMaterial,
  AdditiveBlending,
  MeshStandardMaterial,
  Mesh,
} from 'three';
import { JOURNEY } from '../data/journey';
import { journeyAnim } from '../state/useScene';
import { greatCircleArc, latLngToVector3 } from '../lib/geo';

const SEG = 140; // points per arc
const MARKER_ALT = 1.004;
const Y = new Vector3(0, 1, 0);
const ACCENT = new Color('#5fb2ff');
const tmpTangent = new Vector3();
const tmpQuat = new Quaternion();
const tmpA = new Vector3();
const tmpB = new Vector3();
const tmpC = new Vector3();

/** Faint full-path track so the route reads before the streak draws over it. */
function makeTrackMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color('#37628f') } },
    vertexShader: /* glsl */ `
      varying float vFacing;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFacing = dot(normalize(normalMatrix * normalize(position)), normalize(-mv.xyz));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vFacing;
      void main() {
        float a = smoothstep(0.06, 0.4, vFacing) * 0.3;
        if (a <= 0.002) discard;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
}

/**
 * The bright route — a glowing energy tube. Brightest at the leading tip (uTip)
 * with a white-hot head, streaming a cyan trail with a flowing pulse, and faded
 * toward the limb by facing so it dives over the horizon. Additive → Bloom turns
 * it into light. `vT` (uv.x) runs 0→1 along the tube.
 */
function makeStreakMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: AdditiveBlending,
    uniforms: {
      uHead: { value: new Color('#f2ffff') },
      uTrail: { value: new Color('#3aa8ff') },
      uTip: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying float vFacing;
      varying float vT;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFacing = dot(normalize(normalMatrix * normalize(position)), normalize(-mv.xyz));
        vT = uv.x;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uHead;
      uniform vec3 uTrail;
      uniform float uTip;
      uniform float uTime;
      varying float vFacing;
      varying float vT;
      void main() {
        if (vT > uTip) discard;                       // not yet drawn
        float fade = smoothstep(0.03, 0.4, vFacing);  // dive into the limb
        if (fade <= 0.001) discard;
        float d = uTip - vT;                          // distance behind the tip
        float head = exp(-pow(d / 0.03, 2.0));        // white-hot comet head
        float body = 0.3 + 0.45 * (1.0 - clamp(d / 0.9, 0.0, 1.0));
        float flow = 0.65 + 0.35 * sin(vT * 55.0 - uTime * 5.0); // energy pulse
        float b = fade * (body * flow + head * 2.4);
        vec3 col = mix(uTrail, uHead, clamp(head, 0.0, 1.0));
        gl_FragColor = vec4(col * b, b);
      }
    `,
  });
}

type Arc = {
  points: Vector3[];
  track: ThreeLine;
  tube: Mesh;
  mat: ShaderMaterial;
};

/**
 * The route between life stops: a faint track, a bright energy tube that draws in
 * as you scroll with a glowing comet head riding its tip, and a marker at each
 * stop. All children of the rotating globe group, so they stay glued to the map.
 */
export default function JourneyArcs() {
  const camera = useThree((s) => s.camera);
  const rootRef = useRef<Group>(null);

  const arcs: Arc[] = useMemo(() => {
    const out: Arc[] = [];
    for (let i = 0; i < JOURNEY.length - 1; i++) {
      const a = JOURNEY[i];
      const b = JOURNEY[i + 1];
      const points = greatCircleArc(a.lat, a.lng, b.lat, b.lng, SEG);

      const track = new ThreeLine(
        new BufferGeometry().setFromPoints(points),
        makeTrackMaterial(),
      );

      const curve = new CatmullRomCurve3(points);
      const geom = new TubeGeometry(curve, SEG, 0.0055, 8, false);
      const mat = makeStreakMaterial();
      const tube = new Mesh(geom, mat);

      out.push({ points, track, tube, mat });
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
    const pos = journeyAnim.pos; // smoothed, in sync with the globe rotation

    // Globe centre + camera direction in world, for limb culling (so nothing
    // floats off the silhouette as the globe rotates/moves during transitions).
    const center = rootRef.current
      ? rootRef.current.getWorldPosition(tmpC)
      : tmpC.set(0, 0, 0);
    const camDir = tmpA.copy(camera.position).sub(center).normalize();

    let cometPlaced = false;
    for (let i = 0; i < arcs.length; i++) {
      const segProgress = Math.max(0, Math.min(1, pos - i));
      arcs[i].mat.uniforms.uTip.value = segProgress;
      arcs[i].mat.uniforms.uTime.value = t;

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
      cometCoreRef.current.scale.setScalar(1 + Math.sin(t * 7) * 0.18);
    }

    // Markers: brighten once reached, and fade out past the limb so they never
    // hover off the globe's edge.
    for (let i = 0; i < markerRefs.current.length; i++) {
      const m = markerRefs.current[i];
      if (!m) continue;
      const reached = pos >= i - 0.02;
      const facing = m.getWorldPosition(tmpB).sub(center).normalize().dot(camDir);
      const front = Math.max(0, Math.min(1, (facing - 0.08) / 0.25));
      const pulse = 1 + Math.sin(t * 2.4 + i) * 0.15;
      const targetScale = (reached ? pulse : 0.55) * front;
      m.scale.setScalar(m.scale.x + (targetScale - m.scale.x) * 0.2);
      const mat = m.material as MeshStandardMaterial;
      const wantGlow = (reached ? 2.6 : 0.5) * front;
      mat.emissiveIntensity += (wantGlow - mat.emissiveIntensity) * 0.2;
    }
  });

  return (
    <group ref={rootRef}>
      {arcs.map((arc, i) => (
        <group key={`arc-${i}`}>
          <primitive object={arc.track} />
          <primitive object={arc.tube} />
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
          <meshBasicMaterial color="#f2ffff" toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.05, 20, 20]} />
          <meshBasicMaterial
            color="#7fd6ff"
            transparent
            opacity={0.32}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
