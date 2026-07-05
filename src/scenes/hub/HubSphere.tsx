import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { useScene } from '../../state/useScene';
import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  Color,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  CatmullRomCurve3,
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
         _gf = pow(clamp(_gf, 0.0, 1.0), 1.6);
         totalEmissiveRadiance += uGold * _gf * uGlowAmt * 1.15;`,
      );
  };
  mat.needsUpdate = true;
}

/** Fibrous thread bump texture — fine lengthwise strands for a wool look. */
function threadTexture(): CanvasTexture {
  const w = 128, h = 32;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);
  let seed = 91;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 70; i++) {
    const y = rnd() * h;
    ctx.strokeStyle = `rgba(${rnd() < 0.5 ? '210,210,210' : '70,70,70'},${0.3 + rnd() * 0.4})`;
    ctx.lineWidth = 0.6 + rnd();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + rnd() * 3 - 1.5, w * 0.6, y + rnd() * 3 - 1.5, w, y + rnd() * 2 - 1);
    ctx.stroke();
  }
  const tex = new CanvasTexture(cv);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(8, 1);
  return tex;
}

/** Wound-yarn surface: the whole sphere covered in fine wound fibre (map+bump). */
function yarnSurfaceTexture(color: string): { map: CanvasTexture; bump: CanvasTexture } {
  const s = 512;
  const colCv = document.createElement('canvas');
  const bumpCv = document.createElement('canvas');
  colCv.width = colCv.height = bumpCv.width = bumpCv.height = s;
  const c = colCv.getContext('2d')!;
  const bctx = bumpCv.getContext('2d')!;
  const base = new Color(color);
  const hex = (col: Color) =>
    `rgb(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0})`;
  c.fillStyle = hex(base.clone().multiplyScalar(0.42));
  c.fillRect(0, 0, s, s);
  bctx.fillStyle = '#7d7d7d';
  bctx.fillRect(0, 0, s, s);
  let seed = 33;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  // fine fibres, wound at a slight diagonal with per-strand waviness
  for (let i = 0; i < 1600; i++) {
    const y0 = rnd() * s * 1.3 - s * 0.15;
    const shade = 0.5 + rnd() * 0.8;
    const strand = base.clone().multiplyScalar(shade);
    c.strokeStyle = hex(strand);
    c.lineWidth = 0.8 + rnd() * 1.4;
    bctx.strokeStyle = shade > 0.95 ? 'rgba(225,225,225,0.5)' : 'rgba(55,55,55,0.5)';
    bctx.lineWidth = c.lineWidth;
    const slope = 0.22;
    const wav = 2 + rnd() * 3;
    c.beginPath();
    bctx.beginPath();
    for (let x = 0; x <= s; x += 14) {
      const yy = y0 + x * slope + Math.sin(x * 0.04 + i) * wav;
      if (x === 0) {
        c.moveTo(x, yy);
        bctx.moveTo(x, yy);
      } else {
        c.lineTo(x, yy);
        bctx.lineTo(x, yy);
      }
    }
    c.stroke();
    bctx.stroke();
  }
  const map = new CanvasTexture(colCv);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(2, 2);
  const bump = new CanvasTexture(bumpCv);
  bump.wrapS = bump.wrapT = RepeatWrapping;
  bump.repeat.set(2, 2);
  return { map, bump };
}

/** A high-quality ball of wound yarn: a fibrous core wrapped in dense strands. */
function YarnBall({ color, glow }: { color: string; glow: { value: number } }) {
  const fibreBump = useMemo(threadTexture, []);
  const surface = useMemo(() => yarnSurfaceTexture(color), [color]);
  // The core sphere carries the golden inner glow; it reads through the gaps in
  // the wound strands as light rising from inside the ball.
  const coreMat = useMemo(() => {
    const m = new MeshStandardMaterial({
      map: surface.map,
      bumpMap: surface.bump,
      bumpScale: 0.02,
      roughness: 0.95,
    });
    addGoldGlow(m, glow);
    return m;
  }, [surface, glow]);
  const { threads, loose } = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const up = new Vector3(0, 1, 0);
    const out: { curve: CatmullRomCurve3; shade: number }[] = [];
    // three shells of winding for depth and density
    for (let shell = 0; shell < 3; shell++) {
      for (let i = 0; i < 20; i++) {
        const axis = new Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
        const a = new Vector3().crossVectors(axis, up);
        if (a.lengthSq() < 1e-3) a.set(1, 0, 0);
        a.normalize();
        const b = new Vector3().crossVectors(axis, a).normalize();
        const pts: Vector3[] = [];
        const rr = R * (0.9 + shell * 0.05 + rnd() * 0.04);
        for (let k = 0; k <= 30; k++) {
          const t = (k / 30) * Math.PI * 2;
          pts.push(
            a.clone().multiplyScalar(Math.cos(t) * rr).addScaledVector(b, Math.sin(t) * rr),
          );
        }
        out.push({ curve: new CatmullRomCurve3(pts, true), shade: 0.78 + rnd() * 0.34 });
      }
    }
    const looseCurve = new CatmullRomCurve3([
      new Vector3(R * 0.95, R * 0.2, 0),
      new Vector3(R * 1.3, R * 0.05, R * 0.15),
      new Vector3(R * 1.55, -R * 0.3, -R * 0.1),
      new Vector3(R * 1.78, -R * 0.72, R * 0.05),
    ]);
    return { threads: out, loose: looseCurve };
  }, []);

  const base = new Color(color);
  return (
    <group>
      {/* fibrous base so the gaps between strands read as wound yarn, not a ball */}
      <mesh material={coreMat}>
        <sphereGeometry args={[R * 0.96, 64, 64]} />
      </mesh>
      {threads.map((t, i) => (
        <mesh key={i}>
          <tubeGeometry args={[t.curve, 56, R * 0.026, 7, true]} />
          <meshStandardMaterial
            color={base.clone().multiplyScalar(t.shade)}
            roughness={0.92}
            bumpMap={fibreBump}
            bumpScale={0.006}
          />
        </mesh>
      ))}
      <mesh>
        <tubeGeometry args={[loose, 24, R * 0.026, 7, false]} />
        <meshStandardMaterial color={base} roughness={0.92} bumpMap={fibreBump} bumpScale={0.006} />
      </mesh>
    </group>
  );
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
        {def.kind === 'yarn' && <YarnBall color={def.color} glow={glow} />}
      </group>
    </group>
  );
}

useGLTF.preload('/models/mercury_mr.glb');
useGLTF.preload('/models/pool_ball_mr.glb');
