import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { useScene } from '../../state/useScene';
import {
  Color,
  type Material,
  MeshPhysicalMaterial,
  type MeshStandardMaterial,
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
import { easeInOut } from '../../lib/geo';

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
  blackhole: '/models/black_hole.glb',
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

// Measured off black_hole.glb's own ring vertices (least-variance axis): the
// artist baked a 21.5° roll about Z into the geometry, so the disk arrives
// lying diagonally. This is its true plane normal, in mesh-local space.
const DISK_NORMAL = new Vector3(-0.3661, 0.9306, 0).normalize();
const UP = new Vector3(0, 1, 0);
const ELEVATION = 0.34; // rad: off edge-on enough to open the disk into an ellipse
const DISK_SPIN = 0.28; // rad/s about its own axis

// Radii measured from the same file, in its native units: the shadow core
// sits at ~176 and the disk layers run out to ~1210.
const SHADOW_R = 380; // model units; the shadow sphere below is fitted to this
// The light ramp across the disk. Deliberately loose: a narrow ramp packs the
// whole disk into one tight, hot band right against the shadow, which reads as
// a compressed ring rather than something with depth. Starting the rise later,
// widening the hot band and holding the falloff off until further out spreads
// the light across most of the disk's span.
const DISK_IN = 640; // centre of the hot band, well clear of the shadow
const DISK_WIDTH = 340; // how far that band spreads (gaussian sigma)
const DISK_FADE = 900; // where the outer falloff begins
const DISK_OUT = 1250;

// Overall size in the hub, as a multiple of the base sphere radius. Much
// larger than the solid spheres because it isn't one — it anchors the system,
// and it sits a long way further back, so it needs the size to read at all.
// Capped by clearance: the outer disk has to stay clear of the nearest orbit
// at closest approach (see the anchor note in spheres.ts).
const DISK_SPAN = R * 5.6;
// Shrink factor that takes the docked emblem back to the standard radius R.
const EMBLEM_SCALE = (R * 2) / DISK_SPAN;

// The wide outer ring shells and the stray planet are what made this read as
// Saturn; `distortion` ships at opacity 0 and never draws.
const HIDDEN = new Set([
  'ring',
  'ring2',
  'Planet',
  'black_hole_distortion',
  'black_hole_center',
]);
// The innermost disk shell — its centre is the hole's centre, and the
// shells are not concentric with the overall bounding box.
const INNER_MAT = 'black_hole_light2';

/**
 * Repaint one of the model's disk shells as accretion-disk light.
 *
 * The file's own look is a stack of flat, differently-coloured ring shells —
 * blue, green, red, pink — which is why it reads as a rainbow Saturn rather
 * than a black hole. Its colour is baked into the textures, so no amount of
 * hiding or reorienting fixes it; the only way to use this geometry is to
 * throw its shading away and light it ourselves.
 *
 * So: drop the maps, and drive emission purely off radius in the disk plane
 * (object space, so it is unaffected by however the disk is rotated) — white
 * hot just off the shadow, falling through amber and out to nothing. One
 * ramp shared by every shell is what replaces the banding with a single
 * coherent disk. The inner edge runs above 1.0 so Bloom catches it.
 *
 * On top of the ramp, spiral arms wind inward and sweep faster the deeper
 * they get, so the disk reads as matter falling in rather than a lit ring
 * turning on the spot — the one cue that sells the thing as gravity. The
 * arms are computed in the disk plane from `uTime`, mutated per frame.
 */
function paintDisk(
  mat: MeshStandardMaterial,
  glow: { value: number },
  time: { value: number },
) {
  mat.map = null;
  mat.emissiveMap = null;
  mat.color.setRGB(0, 0, 0); // emissive-only; nothing here is lit by the scene
  mat.emissive.setRGB(1, 1, 1);
  mat.emissiveIntensity = 1;
  mat.toneMapped = false;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader: any, renderer: any) => {
    prev?.(shader, renderer);
    shader.uniforms.uAmber = { value: new Color('#ffb066') };
    shader.uniforms.uNormal = { value: DISK_NORMAL };
    shader.uniforms.uGlow = glow;
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vObjPos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vObjPos = position;`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vObjPos;
uniform vec3 uAmber;
uniform vec3 uNormal;
uniform float uGlow;
uniform float uTime;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         // radius within the disk plane (distance from the spin axis)
         vec3 _axial = dot(vObjPos, uNormal) * uNormal;
         vec3 _inPlane = vObjPos - _axial;
         float _rr = length(_inPlane);
         float _in = smoothstep(${SHADOW_R}.0, ${DISK_IN}.0, _rr);
         float _out = 1.0 - smoothstep(${DISK_FADE}.0, ${DISK_OUT}.0, _rr);
         float _hot = exp(-pow((_rr - ${DISK_IN}.0) / ${DISK_WIDTH}.0, 2.0));

         // Spiral infall. A basis in the disk plane gives an angle; winding it
         // against radius makes arms, and shearing the sweep by 1/r makes the
         // inner disk outrun the outer — differential rotation, the look of
         // matter spiralling down rather than a ring turning rigidly.
         vec3 _t1 = normalize(cross(uNormal, vec3(0.0, 0.0, 1.0)));
         vec3 _t2 = cross(uNormal, _t1);
         float _ang = atan(dot(_inPlane, _t2), dot(_inPlane, _t1));
         float _shear = uTime * (1.4 + 900.0 / max(_rr, 300.0));
         float _arms = sin(_ang * 2.0 + _rr * 0.011 - _shear);
         // Never dip to black: this modulates the disk, it doesn't gate it.
         float _flow = 0.78 + 0.22 * _arms;

         vec3 _col = mix(uAmber, vec3(1.0), _hot * 0.6) * (0.28 + 1.25 * _hot);
         totalEmissiveRadiance =
           _col * _in * _out * _flow * (1.0 + uGlow * 0.9);`,
      );
  };
  mat.needsUpdate = true;
}

/**
 * The black hole, built on the supplied black_hole.glb. The file arrived at
 * 534K triangles / 31MB with its colour in the deprecated spec/gloss
 * extension (which three.js no longer reads at all — it loads plain white);
 * it's been converted to metal/rough, simplified to 43K triangles with mesh
 * borders locked so the thin shells don't tear, and its textures resized and
 * WebP'd, to 2.7MB.
 *
 * Its geometry is reused; its shading is not (see paintDisk). The baked roll
 * is undone so the disk lies flat, it's viewed near edge-on from a slight
 * elevation, and it turns on its own axis — the object holds a fixed point in
 * the hub (OrbitHub anchors it), so its own rotation and the infall in the
 * disk are the only things moving, and without them it would read as a prop.
 * Hovering brightens the disk rather than washing the object in gold like the
 * solid spheres; nothing lands on a black hole.
 *
 * No billboard correction here: that trick keeps *spheres* circular off-axis,
 * and applying it to a flat disk would shear its tilt.
 *
 * Docking needs one extra step the solid spheres don't. OrbitHub's dock scale
 * assumes an emblem of the standard radius R, and this thing is DISK_SPAN/2
 * across — so on its own it would dock several times oversized and run off the
 * corner, straight through the section title. EMBLEM_SCALE shrinks it back to
 * exactly R as it docks, which is the radius HubOverlay's dockedEmblemBox lays
 * the title and its dashed rings out against.
 */
function BlackHole({ id, glow }: { id: string; glow: { value: number } }) {
  const { scene } = useGLTF(MODEL_URL.blackhole);
  const spinRef = useRef<Group>(null);
  const dockRef = useRef<Group>(null);
  const docked = useRef(0);
  // Disk-clock for the spiral infall, shared by every shell's material and
  // mutated in place each frame (never reassigned) so the patch compiles once.
  const time = useMemo(() => ({ value: 0 }), []);
  const { obj, shadowR } = useMemo(() => {
    const m = scene.clone(true);
    m.quaternion.setFromUnitVectors(DISK_NORMAL, UP); // disk into XZ, spin about Y
    m.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as MeshStandardMaterial;
      if (HIDDEN.has(src.name)) {
        mesh.visible = false;
        return;
      }
      const mat = src.clone();
      paintDisk(mat, glow, time);
      mesh.material = mat;
    });
    // Fit on what actually draws — Box3.setFromObject would count the hidden
    // outer shells and shrink the disk to make room for them.
    m.updateWorldMatrix(true, true);
    const box = new Box3();
    const shadowBox = new Box3();
    m.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      box.expandByObject(mesh);
      if ((mesh.material as MeshStandardMaterial).name === INNER_MAT) {
        shadowBox.expandByObject(mesh);
      }
    });
    const size = box.getSize(new Vector3());
    const sc = DISK_SPAN / (Math.max(size.x, size.y, size.z) || 1);
    m.scale.setScalar(sc);
    // Centre on the innermost shell, not the bounding box: the shells are not
    // concentric with each other, so centring on the box leaves the hole
    // sitting off to one side of its own disk.
    const center = shadowBox.isEmpty()
      ? box.getCenter(new Vector3())
      : shadowBox.getCenter(new Vector3());
    m.position.set(-center.x * sc, -center.y * sc, -center.z * sc);
    // Derive the shadow's world radius from the fit rather than hard-coding a
    // multiple of R: the two stay locked together however DISK_SPAN is tuned.
    return { obj: m, shadowR: SHADOW_R * sc };
  }, [scene, glow, time]);

  useFrame((_, delta) => {
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
    if (paused) return;
    if (spinRef.current) spinRef.current.rotation.y += delta * DISK_SPIN;
    time.value += delta;
  });

  return (
    <group ref={dockRef} rotation={[ELEVATION, 0, 0]}>
      {/* The shadow. Unlit black so there is no shading to give away that
          it is a sphere, and it writes depth so the far half of the disk is
          correctly hidden behind it while the near half crosses in front. */}
      <mesh>
        <sphereGeometry args={[shadowR, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <group ref={spinRef}>
        <primitive object={obj} />
      </group>
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
          <GltfSphere url={MODEL_URL.paper} glow={glow} billboard={billboard} />
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
useGLTF.preload('/models/black_hole.glb');
