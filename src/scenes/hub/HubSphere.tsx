import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { useScene } from '../../state/useScene';
import {
  Color,
  MeshPhysicalMaterial,
  Box3,
  Vector3,
  Vector2,
  Matrix3,
  Matrix4,
  Quaternion,
  Group,
  type Mesh,
} from 'three';
import type { SphereDef } from '../../data/spheres';

/** A sphere's live billboard-correction uniforms (see addBillboardCorrection),
 * recomputed every frame in HubSphere from the group's actual world position. */
type Billboard = { rot: { value: Matrix3 }; ndc: { value: Vector2 } };

const R = 0.2; // base sphere radius (world units)

// Scratch objects for the billboard-correction math in HubSphere's useFrame
// (module-level so nothing allocates per sphere per frame).
const _bcWorldPos = new Vector3();
const _bcViewPos = new Vector3();
const _bcDir = new Vector3();
const _bcNdc = new Vector3();
const _bcQuat = new Quaternion();
const _bcMat4 = new Matrix4();
const _bcForward = new Vector3(0, 0, -1);

const MODEL_URL: Record<string, string> = {
  mercury: '/models/mercury_mr.glb',
  crystal: '/models/pool_ball_mr.glb', // the eight ball
  paper: '/models/crumpled_paper.glb',
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
  billboard,
}: {
  url: string;
  polish?: boolean;
  glow: { value: number };
  billboard: Billboard;
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
      // Both planets are solid, opaque objects: force them to write depth so the
      // transparent dotted orbit rings are correctly occluded when a sphere is in
      // front (glb materials sometimes ship transparent, which skips depth).
      mat.transparent = false;
      mat.opacity = 1;
      mat.depthWrite = true;
      mat.depthTest = true;
      if (polish) {
        mat.roughness = Math.min(mat.roughness ?? 1, 0.12);
        mat.metalness = 0;
        mat.envMapIntensity = 1.5;
        mat.clearcoat = 1;
        mat.clearcoatRoughness = 0.06;
      }
      addGoldGlow(mat, glow);
      addBillboardCorrection(mat, billboard);
      mesh.material = mat;
    });
    return m;
  }, [scene, polish, glow, billboard]);
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

/**
 * Keeps a sphere reading as a true circle no matter where it sits on screen.
 *
 * A perspective camera only projects a sphere as a circle when it's centred
 * on the view axis — off to the side (as these orbiting spheres constantly
 * are) it projects as a slight ellipse, worse the closer and more off-axis it
 * gets (the pulled-back hub camera in GlobeScene already shrinks this a lot,
 * but can't remove it: it's inherent to a single shared perspective camera).
 *
 * The fix: re-render the sphere as if the camera were looking straight at it
 * — which any sphere always projects as a circle under — then shift the
 * *whole* result sideways in clip space (a per-vertex offset scaled by each
 * vertex's own `w`, so after the perspective divide it's a constant screen
 * offset regardless of depth) back to the position it actually belongs at.
 * `uBCRot` is that "look straight at it" rotation, expressed directly in view
 * space so it can apply straight to the standard mvPosition with no matrix
 * juggling; `uBCNdc` is the true on-screen position to shift back to (a
 * point placed via unproject(ndc) always reprojects to that same ndc, so —
 * as it happens — this needs no camera math either; see HubSphere's useFrame).
 * Both are mutated in place every frame, not reassigned, so this compile-time
 * patch only runs once per material.
 *
 * Only gl_Position is touched — normals and the true (uncorrected)
 * mvPosition-derived vViewPosition, set right after this chunk runs, are
 * left alone, so lighting/fresnel/reflections stay physically accurate to
 * the sphere's real position; only its silhouette is corrected.
 */
function addBillboardCorrection(
  mat: { onBeforeCompile?: (s: any) => void; needsUpdate: boolean },
  billboard: Billboard,
) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader: any) => {
    prev?.(shader);
    shader.uniforms.uBCRot = billboard.rot; // shared refs, mutated each frame
    shader.uniforms.uBCNdc = billboard.ndc;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform mat3 uBCRot;\nuniform vec2 uBCNdc;',
      )
      .replace(
        '#include <project_vertex>',
        `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
vec3 _bcPos = uBCRot * mvPosition.xyz;
gl_Position = projectionMatrix * vec4(_bcPos, mvPosition.w);
gl_Position.xy += uBCNdc * gl_Position.w;`,
      );
  };
  mat.needsUpdate = true;
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
  const groupRef = useRef<Group>(null);
  const spinRef = useRef<Group>(null);
  const hovered = useScene((s) => s.hovered);
  const activeSection = useScene((s) => s.activeSection);
  // Shared 0..1 strength for the golden inner glow, damped so it eases in/out.
  const glow = useMemo(() => ({ value: 0 }), []);
  // Shared billboard-correction uniforms (see addBillboardCorrection) — kept
  // as one persistent object per sphere and mutated in place every frame,
  // never reassigned, so the material's onBeforeCompile patch runs once.
  const billboard = useMemo<Billboard>(
    () => ({ rot: { value: new Matrix3() }, ndc: { value: new Vector2() } }),
    [],
  );

  useFrame(({ camera }, delta) => {
    // Keep spinning except while hovered in the hub; the docked section sphere
    // (activeSection) keeps rotating on the top-left.
    const paused = hovered === def.id && activeSection === null;
    if (spinRef.current && !paused) spinRef.current.rotation.y += delta * 0.25;
    // Golden inner glow only while hovered in the hub (not on the docked emblem).
    const to = hovered === def.id && !activeSection ? 1 : 0;
    glow.value += (to - glow.value) * (1 - Math.exp(-9 * Math.min(delta, 0.05)));

    // Billboard correction: rotation (in view space) that maps "direction
    // from camera to this sphere" onto "straight ahead", plus the sphere's
    // true screen position to shift back to. See addBillboardCorrection.
    if (groupRef.current) {
      groupRef.current.getWorldPosition(_bcWorldPos);
      _bcViewPos.copy(_bcWorldPos).applyMatrix4(camera.matrixWorldInverse);
      if (_bcViewPos.lengthSq() > 1e-8) {
        _bcDir.copy(_bcViewPos).normalize();
        _bcQuat.setFromUnitVectors(_bcDir, _bcForward);
        billboard.rot.value.setFromMatrix4(_bcMat4.makeRotationFromQuaternion(_bcQuat));
      }
      _bcNdc.copy(_bcWorldPos).project(camera);
      billboard.ndc.value.set(_bcNdc.x, _bcNdc.y);
    }
  });

  return (
    <group
      ref={groupRef}
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
          <GltfSphere url={MODEL_URL.mercury} glow={glow} billboard={billboard} />
        )}
        {def.kind === 'crystal' && (
          <GltfSphere url={MODEL_URL.crystal} polish glow={glow} billboard={billboard} />
        )}
        {def.kind === 'paper' && (
          <GltfSphere url={MODEL_URL.paper} glow={glow} billboard={billboard} />
        )}
      </group>
    </group>
  );
}

useGLTF.preload('/models/mercury_mr.glb');
useGLTF.preload('/models/pool_ball_mr.glb');
useGLTF.preload('/models/crumpled_paper.glb');
