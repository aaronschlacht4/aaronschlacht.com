import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { useScene } from '../../state/useScene';
import {
  Color,
  GLSL3,
  LinearFilter,
  type Material,
  Mesh,
  MeshPhysicalMaterial,
  Box3,
  Vector3,
  Vector2,
  Matrix3,
  Matrix4,
  OrthographicCamera,
  PlaneGeometry,
  Quaternion,
  RawShaderMaterial,
  Scene,
  SRGBColorSpace,
  WebGLRenderTarget,
  Group,
} from 'three';
import type { SphereDef } from '../../data/spheres';
import { easeInOut } from '../../lib/geo';
import { FRAGMENT_SOURCE } from '../../projects/physica/shader';
import { ISCO, shadowAngle } from '../../projects/physica/renderer';

/** A sphere's live billboard-correction uniforms (see addBillboardCorrection),
 * recomputed every frame in HubSphere from the group's actual world position. */
type Billboard = { rot: { value: Matrix3 }; ndc: { value: Vector2 } };

const R = 0.2; // base sphere radius (world units)

/** Just the bits of a three Material these shader patches touch. Taken from
 * Material itself so onBeforeCompile's arity stays in step with three — a
 * hand-written one-arg signature here is what broke `tsc -b`. */
type Patchable = Pick<Material, 'onBeforeCompile' | 'needsUpdate'>;

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
 * - `paper` → matte, unreflective and warm off-white, so the creases read as
 *   folds in a sheet rather than bumps on a tan plastic ball.
 * - `innerGlow` → a fresnel emissive baked INTO the object's own material, so the
 *   planet's limb glows that colour and fades inward (like Earth's atmosphere,
 *   but on the surface itself).
 */
function GltfSphere({
  url,
  polish,
  paper,
  glow,
  billboard,
}: {
  url: string;
  polish?: boolean;
  paper?: boolean;
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
      if (paper) {
        mat.map = null;
        mat.roughnessMap = null; // the file's maps are what made it shine like foil
        mat.metalnessMap = null;
        mat.normalMap = null;
        mat.color.set('#d8cfba');
        mat.roughness = 1;
        mat.metalness = 0;
        mat.envMapIntensity = 0; // no reflections at all: paper, not foil
        // The file's material may be Standard, not Physical: only touch
        // what both have.
        if ('clearcoat' in mat) mat.clearcoat = 0;
        mat.flatShading = false; // facets read as foil; smooth creases read as paper
      }
      addGoldGlow(mat, glow);
      addBillboardCorrection(mat, billboard);
      mesh.material = mat;
    });
    return m;
  }, [scene, polish, paper, glow, billboard]);
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
function addGoldGlow(mat: Patchable, glow: { value: number }) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader: any, renderer: any) => {
    prev?.(shader, renderer);
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
function addBillboardCorrection(mat: Patchable, billboard: Billboard) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader: any, renderer: any) => {
    prev?.(shader, renderer);
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

// ── The black hole ──────────────────────────────────────────────────────
// Not a model. The physica.fyi ray tracer (src/projects/physica/shader.ts)
// renders the hole to a small offscreen texture every frame — the lensed
// disk, the photon ring, the Doppler-bright side — and that picture is put
// in the hub as an additive sprite: its black adds nothing, so only the
// light shows, over a plain black sphere that stands in for the shadow and
// occludes what's behind it. The disk's near side crosses in front of the
// shadow in the picture itself, so the sprite sits a little in front of
// the sphere and nothing is clipped.
const BH_RES = 224; // texture size (px) — cheap: ~50K rays a frame
const BH_STEPS = 320; // integration steps per ray; plenty at this size
const BH_DIST = 54; // camera radius, in M — far enough that the lensed far side fits
const BH_INCL = 12; // degrees above the disk
const BH_FOV = 50; // degrees
const BH_DISK_OUT = 12; // M
const BH_SPIN = 2.2; // azimuth drift, degrees per second
// Overall size in the hub, as a multiple of the base sphere radius. Much
// larger than the solid spheres because most of it is thin disk — it anchors
// the system and sits a long way back, so it needs the size to read at all.
// Capped by clearance: the outer disk stays clear of the nearest orbit at
// closest approach (see the anchor note in spheres.ts).
const DISK_SPAN = R * 5.6;
// The sprite's edge-to-edge size: the disk fills about half the frame, so
// the arc bent over the top has room and nothing hits the picture's edge.
const BH_SPRITE = DISK_SPAN * 1.05;
// Shrink factor that takes the docked emblem back to the standard radius R.
const EMBLEM_SCALE = (R * 2) / DISK_SPAN;
const BH_TAN_HALF = Math.tan((BH_FOV * Math.PI) / 360);
// Apparent radius of the shadow in the picture, as a fraction of its
// half-height — so the black sphere is exactly the size of the hole.
const BH_SHADOW_FRAC = Math.tan(shadowAngle(BH_DIST)) / BH_TAN_HALF;

const BH_VERTEX = `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

function BlackHole({ id, glow }: { id: string; glow: { value: number } }) {
  const dockRef = useRef<Group>(null);
  const docked = useRef(0);
  const azimuth = useRef(0);

  const { target, scene, camera, material } = useMemo(() => {
    const target = new WebGLRenderTarget(BH_RES, BH_RES, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
      // Physica's shader writes gamma-encoded colour. Say so, or three
      // gamma-encodes it a second time on output and the amber disk comes
      // out as washed grey-white.
      colorSpace: SRGBColorSpace,
    });
    const material = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: BH_VERTEX,
      // Physica writes an opaque picture; here its black has to be see-
      // through, so alpha is the brightest channel — black is clear, the disk
      // is solid, and it composites normally over the stars behind it.
      fragmentShader: FRAGMENT_SOURCE.replace('#version 300 es', '').replace(
        'fragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);',
        'vec3 _c = pow(color, vec3(1.0 / 2.2)); fragColor = vec4(_c, max(_c.r, max(_c.g, _c.b)));',
      ),
      uniforms: {
        uRes: { value: new Vector2(BH_RES, BH_RES) },
        uCam: { value: new Vector3() },
        uBasis: { value: new Matrix3() },
        uTanHalfFov: { value: BH_TAN_HALF },
        uDiskIn: { value: ISCO },
        uDiskOut: { value: BH_DISK_OUT },
        uShowDisk: { value: 1 },
        uShowStars: { value: 0 },
        uBeaming: { value: 1 },
        uTime: { value: 0 },
        uExposure: { value: 0.55 },
        uSteps: { value: BH_STEPS },
      },
      depthTest: false,
      depthWrite: false,
    });
    const scene = new Scene();
    scene.add(new Mesh(new PlaneGeometry(2, 2), material));
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { target, scene, camera, material };
  }, []);

  useEffect(
    () => () => {
      target.dispose();
      material.dispose();
    },
    [target, material],
  );

  useFrame(({ gl }, delta) => {
    const { hovered, activeSection } = useScene.getState();

    // Ease down to emblem size while this section is open. Matched to the
    // damping rate OrbitHub moves the emblem to the corner with, so the
    // shrink and the flight land together.
    const k = 1 - Math.exp(-5 * Math.min(delta, 0.05));
    docked.current += ((activeSection === id ? 1 : 0) - docked.current) * k;
    if (dockRef.current) {
      const t = easeInOut(docked.current);
      dockRef.current.scale.setScalar(1 + (EMBLEM_SCALE - 1) * t);
    }

    const paused = hovered === id && activeSection === null;
    if (!paused) {
      azimuth.current += delta * BH_SPIN;
      material.uniforms.uTime.value += delta;
    }
    // Hovering brightens the disk rather than washing the object in gold
    // like the solid spheres; nothing lands on a black hole.
    // Kept low: the hub also blooms, and a small bright disk reads as a
    // white blob at physica's page exposure.
    material.uniforms.uExposure.value = 0.55 + 0.3 * glow.value;

    // Camera on a ring round the hole, looking straight at it (physica's view()).
    const inc = (BH_INCL * Math.PI) / 180;
    const az = (azimuth.current * Math.PI) / 180;
    const pos = material.uniforms.uCam.value as Vector3;
    pos.set(BH_DIST * Math.cos(inc) * Math.cos(az), BH_DIST * Math.sin(inc), BH_DIST * Math.cos(inc) * Math.sin(az));
    _bhFwd.copy(pos).negate().normalize();
    _bhRight.crossVectors(_bhFwd, _bhUp).normalize();
    _bhUp2.crossVectors(_bhRight, _bhFwd);
    (material.uniforms.uBasis.value as Matrix3).set(
      _bhRight.x, _bhUp2.x, _bhFwd.x,
      _bhRight.y, _bhUp2.y, _bhFwd.y,
      _bhRight.z, _bhUp2.z, _bhFwd.z,
    );

    const prev = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(prev);
  });

  const shadowR = (BH_SPRITE / 2) * BH_SHADOW_FRAC;
  return (
    <group ref={dockRef}>
      {/* The shadow: unlit black, writes depth, so the stars and Earth
          behind the hole are swallowed exactly where the picture is black. */}
      <mesh>
        <sphereGeometry args={[shadowR, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* The light: the ray-traced picture, added on top. Set a touch toward
          the camera so the sphere never clips the disk's near side. */}
      <sprite scale={[BH_SPRITE, BH_SPRITE, 1]} position={[0, 0, shadowR * 1.15]}>
        <spriteMaterial
          map={target.texture}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

const _bhUp = new Vector3(0, 1, 0);
const _bhFwd = new Vector3();
const _bhRight = new Vector3();
const _bhUp2 = new Vector3();

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
  // Hover target (and the label's anchor height). The black hole is much wider
  // than a sphere, but most of that width is thin, mostly-empty outer disk —
  // sizing the target to the whole span would swallow pointer events over
  // nothing, so it covers the shadow and the bright inner disk only.
  const hitR = def.kind === 'blackhole' ? R * 1.7 : R * 1.25;
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
        <sphereGeometry args={[hitR, 8, 8]} />
      </mesh>

      {/* Hover label card, anchored to the sphere. */}
      {hovered === def.id && !activeSection && (
        <Html
          position={[0, hitR, 0]}
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
          <GltfSphere url={MODEL_URL.paper} paper glow={glow} billboard={billboard} />
        )}
      </group>
      {def.kind === 'blackhole' && (
        <BlackHole id={def.id} glow={glow} />
      )}
    </group>
  );
}

useGLTF.preload('/models/mercury_mr.glb');
useGLTF.preload('/models/pool_ball_mr.glb');
useGLTF.preload('/models/crumpled_paper.glb');
