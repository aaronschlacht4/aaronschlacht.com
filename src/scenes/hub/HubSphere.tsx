import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { useScene } from '../../state/useScene';
import {
  CanvasTexture,
  RepeatWrapping,
  Color,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  IcosahedronGeometry,
  Box3,
  Vector3,
  Group,
  type Mesh,
} from 'three';
import type { SphereDef } from '../../data/spheres';

const R = 0.2; // base sphere radius (world units)

const MODEL_URL: Record<string, string> = {
  mercury: '/models/mercury_mr.glb',
  crystal: '/models/pool_ball_mr.glb', // the eight ball
};

/**
 * A user-supplied glb, auto-scaled so its bounding sphere fits radius R and
 * centred at the origin.
 * - `polish` → a glossy clearcoat + space-env reflections (lacquered pool ball).
 * - `innerGlow` → a fresnel emissive baked INTO the object's own material, so the
 *   planet's limb glows that colour and fades inward (like Earth's atmosphere,
 *   but on the surface itself).
 */
function GltfSphere({
  url,
  polish,
  glow,
}: {
  url: string;
  polish?: boolean;
  glow: { value: number };
}) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const m = scene.clone(true);
    m.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(m);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const sc = (R * 2) / maxDim;
    m.scale.setScalar(sc);
    m.position.set(-center.x * sc, -center.y * sc, -center.z * sc);
    m.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const mat = (mesh.material as MeshPhysicalMaterial).clone();
      if (polish) {
        mat.roughness = Math.min(mat.roughness ?? 1, 0.12);
        mat.metalness = 0;
        mat.envMapIntensity = 1.5;
        mat.clearcoat = 1;
        mat.clearcoatRoughness = 0.06;
        mat.transparent = false; // a pool ball is solid, not glass
        mat.opacity = 1;
        mat.depthWrite = true;
      }
      addGoldGlow(mat, glow);
      mesh.material = mat;
    });
    return m;
  }, [scene, polish, glow]);
  return <primitive object={obj} />;
}

const GOLD = new Color('#ffd27a');

/**
 * Bake a soft golden fresnel emissive into a standard/physical material, its
 * strength driven live by the shared `glow` uniform (0..1, damped on hover in
 * HubSphere). A low fresnel power keeps it broad and soft — a warm inner glow
 * rising from the limb rather than a hard rim. Composes with any existing
 * onBeforeCompile (e.g. the Earth's day/night patch isn't affected here).
 */
function addGoldGlow(
  mat: { onBeforeCompile?: (s: any) => void; needsUpdate: boolean },
  glow: { value: number },
) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader: any) => {
    prev?.(shader);
    shader.uniforms.uGold = { value: GOLD };
    shader.uniforms.uGlowAmt = glow; // shared ref, mutated each frame
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uGold;\nuniform float uGlowAmt;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float _gf = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
         _gf = pow(clamp(_gf, 0.0, 1.0), 3.2);
         totalEmissiveRadiance += uGold * _gf * uGlowAmt * 1.3;`,
      );
  };
  mat.needsUpdate = true;
}

/** Fine paper-tooth speckle for a subtle fibrous bump on the paper surface. */
function paperBumpTexture(): CanvasTexture {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, s, s);
  let seed = 17;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 12000; i++) {
    const v = (110 + rnd() * 60) | 0;
    ctx.fillStyle = `rgba(${v},${v},${v},0.45)`;
    ctx.fillRect(rnd() * s, rnd() * s, 1, 1);
  }
  const tex = new CanvasTexture(cv);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/**
 * A crumpled ball of paper: an icosphere whose vertices are pushed along a set
 * of random triangle-wave "fold planes" to carve sharp creases, rendered flat-
 * shaded so the facets read as wadded paper. Cream, matte, with a faint tooth.
 */
function PaperBall({ glow }: { glow: { value: number } }) {
  const bump = useMemo(paperBumpTexture, []);
  const geometry = useMemo(() => {
    // Coarse-ish icosphere so each flat facet reads as a paper plane.
    const g = new IcosahedronGeometry(R, 9);
    let seed = 3;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    // random creasing planes: triangle waves make sharp ridges/valleys. A few
    // low-freq folds wad the ball; higher-freq ones add finer crumple.
    const folds = Array.from({ length: 11 }, (_, k) => ({
      dir: new Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize(),
      freq: k < 5 ? 2 + rnd() * 3 : 6 + rnd() * 8,
      amp: k < 5 ? 0.05 + rnd() * 0.06 : 0.02 + rnd() * 0.03,
    }));
    const pos = g.attributes.position;
    const p = new Vector3();
    const n = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      n.copy(p).normalize();
      let d = 0;
      for (const f of folds) {
        const t = p.dot(f.dir) * f.freq;
        const tw = Math.abs((((t % 2) + 2) % 2) - 1) * 2 - 1; // triangle wave [-1,1]
        d += tw * f.amp;
      }
      p.addScaledVector(n, d * R);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;
    return g;
  }, []);
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: new Color('#e9e2cf'), // warm paper cream
      roughness: 0.97,
      metalness: 0,
      flatShading: true, // hard facets → crumpled-paper look
      bumpMap: bump,
      bumpScale: 0.003,
    });
    addGoldGlow(m, glow);
    return m;
  }, [bump, glow]);
  return <mesh geometry={geometry} material={material} />;
}

/**
 * One orbiting section sphere. `spin` self-rotation is applied here; the orbit
 * position + hover scaling are driven by the parent OrbitHub. Pointer events
 * bubble up via the passed handlers.
 */
export default function HubSphere({
  def,
  onOver,
  onOut,
  onClick,
}: {
  def: SphereDef;
  onOver: (id: string) => void;
  onOut: (id: string) => void;
  onClick: (id: string | null) => void;
}) {
  const spinRef = useRef<Group>(null);
  const hovered = useScene((s) => s.hovered);
  const activeSection = useScene((s) => s.activeSection);
  // Shared 0..1 strength for the golden inner glow, damped so it eases in/out.
  const glow = useMemo(() => ({ value: 0 }), []);

  useFrame((_, delta) => {
    // Keep spinning except while hovered in the hub; the docked section sphere
    // (activeSection) keeps rotating on the top-left.
    const paused = hovered === def.id && activeSection === null;
    if (spinRef.current && !paused) spinRef.current.rotation.y += delta * 0.25;
    // Golden inner glow only while hovered in the hub (not on the docked emblem).
    const to = hovered === def.id && !activeSection ? 1 : 0;
    glow.value += (to - glow.value) * (1 - Math.exp(-9 * Math.min(delta, 0.05)));
  });

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!activeSection) onOver(def.id);
      }}
      onPointerOut={() => onOut(def.id)}
      onPointerDown={(e) => {
        e.stopPropagation();
        // clicking the already-open sphere sends you home
        onClick(activeSection === def.id ? null : def.id);
      }}
    >
      {/* invisible slightly-larger hit sphere for comfortable hovering */}
      <mesh visible={false}>
        <sphereGeometry args={[R * 1.25, 8, 8]} />
      </mesh>

      {/* Hover label card, anchored to the sphere. */}
      {hovered === def.id && !activeSection && (
        <Html
          position={[0, R * 1.25, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              // Sit fully above the anchor so the card never overlaps the sphere.
              transform: 'translateY(-100%)',
              whiteSpace: 'nowrap',
              padding: '6px 11px',
              borderRadius: 999,
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              background: 'rgba(10,14,24,0.55)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 22px rgba(0,0,0,0.35)',
              fontFamily: 'var(--font-display, sans-serif)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: def.color,
                boxShadow: `0 0 8px ${def.color}`,
                alignSelf: 'center',
              }}
            />
            <span style={{ fontWeight: 700, fontSize: 11, color: '#f0f5ff' }}>
              {def.label}
            </span>
            <span style={{ fontSize: 9.5, color: '#93a6c6' }}>{def.tagline}</span>
          </div>
        </Html>
      )}
      <group ref={spinRef}>
        {def.kind === 'mercury' && (
          <GltfSphere url={MODEL_URL.mercury} glow={glow} />
        )}
        {def.kind === 'crystal' && (
          <GltfSphere url={MODEL_URL.crystal} polish glow={glow} />
        )}
        {def.kind === 'paper' && <PaperBall glow={glow} />}
      </group>
    </group>
  );
}

useGLTF.preload('/models/mercury_mr.glb');
useGLTF.preload('/models/pool_ball_mr.glb');
