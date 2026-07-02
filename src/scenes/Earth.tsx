import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  Box3,
  Vector3,
  Quaternion,
  Color,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  type Mesh,
} from 'three';
import { GLOBE_RADIUS } from '../lib/geo';
import { sunViewDirection } from '../lib/sun';

const MODEL_URL = '/models/earth_hq.glb';

/**
 * Spin the model about its polar axis so the baked continents line up with the
 * lat/lng pin convention (lng=0 / lat=0 → +Z). Tune if the journey routes drift
 * off their countries.
 */
// Calibrated so the baked continents line up with the lat/lng pin convention for
// this model (markers land on their real cities — NYC, LA, Tel Aviv, etc.). The
// model's texture pole is tilted vs the geometry +Y axis, so alignment needs a
// spin (Y) plus a small latitude tilt (X). Verified against NY, LA and Israel.
const MODEL_SPIN = 2.74; // radians about +Y
const MODEL_TILT_X = 0.1; // radians about X (latitude correction)
const MODEL_TILT_Z = 0; // radians about Z

/**
 * The Earth: a Blender-exported glb (surface + clouds + atmosphere spheres),
 * auto-centred and scaled so its solid surface sphere matches GLOBE_RADIUS — the
 * same radius the journey pins and arcs are built against, so they stay glued to
 * the ground rather than floating over the atmosphere shell.
 */
export default function Earth() {
  const { scene } = useGLTF(MODEL_URL); // plain glb (Draco decoded at build)
  const model = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as MeshStandardMaterial;
      if (!mat) return;

      // Hide the atmosphere shell — it's a large, transmissive/translucent sphere
      // that either haloes the globe (we draw our own soft halo) or renders black
      // in Safari (KHR_materials_transmission). Detect it by name or transmission.
      const phys = mat as MeshPhysicalMaterial;
      const isAtmosphere =
        o.name.toLowerCase().includes('atmosphere') ||
        mat.name?.toLowerCase().includes('atmosphere') ||
        ('transmission' in phys && phys.transmission > 0);
      if (isAtmosphere) {
        mesh.visible = false;
        return;
      }

      // Rebuild every surface/cloud material as a plain MeshStandardMaterial that
      // keeps only the core maps. The Blender glb ships MeshPhysicalMaterials with
      // KHR_materials_specular + 5 stacked maps, which Safari/WebKit's shader
      // compiler renders BLACK. A standard material with map + emissive + normal
      // is cross-browser and looks the same. Preserve sRGB/colour-space and
      // transparency that GLTFLoader already configured on the source textures.
      const isSurface = !!mat.emissiveMap; // the surface has the night-lights map
      const std = new MeshStandardMaterial({
        map: mat.map ?? null,
        normalMap: mat.normalMap ?? null,
        emissive: isSurface ? new Color(0xffffff) : new Color(0x000000),
        emissiveMap: mat.emissiveMap ?? null,
        emissiveIntensity: isSurface ? 2.4 : 0,
        roughness: 1,
        metalness: 0,
        transparent: mat.transparent,
        opacity: mat.opacity,
        alphaMap: mat.alphaMap ?? null,
        depthWrite: mat.depthWrite,
        side: mat.side,
      });

      // Mask the city lights to the night side: fade the emissive out wherever
      // the surface faces the sun, so the day side shows the daytime texture and
      // only the dark hemisphere lights up. The sun direction (view space) is the
      // shared `sunViewDirection`, updated each frame by GlobeScene.
      if (isSurface) {
        std.onBeforeCompile = (shader) => {
          shader.uniforms.uSunView = { value: sunViewDirection };
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <common>',
              '#include <common>\nuniform vec3 uSunView;',
            )
            .replace(
              '#include <emissivemap_fragment>',
              `#include <emissivemap_fragment>
               float _day = dot(normalize(vNormal), normalize(uSunView));
               // Smooth, wide terminator so the city lights fade in gently.
               float _night = smoothstep(0.16, -0.12, _day);
               totalEmissiveRadiance *= _night;
               // Warm dusk/atmospheric band along the terminator for realism.
               float _dusk = smoothstep(-0.16, 0.02, _day) *
                             (1.0 - smoothstep(0.02, 0.34, _day));
               totalEmissiveRadiance += vec3(1.0, 0.42, 0.16) * _dusk * 0.22;`,
            );
        };
      }
      mesh.material = std;
    });
    return m;
  }, [scene]);

  // Scale/centre on the *surface sphere* (the node named "Earth"). We measure its
  // bounding SPHERE in the model's own transformed space and scale so its radius
  // becomes exactly GLOBE_RADIUS — the radius the pins, arcs and atmosphere are
  // all built against, so they sit right on the surface rather than floating.
  const { scale, offset } = useMemo(() => {
    model.updateMatrixWorld(true);
    let target: Mesh | null = null;
    model.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh && o.name.toLowerCase().includes('earth')) target = mesh;
    });
    const surface = target as Mesh | null;
    // World-space radius of the surface = its geometry radius × the world scale
    // baked into its matrixWorld. Using the geometry's bounding SPHERE (not an
    // AABB of the whole subtree) avoids the nested-transform miscount that made
    // the globe render ~1.28× too big and float the pins/atmosphere off it.
    let radius = 1;
    let center = new Vector3();
    if (surface && surface.geometry) {
      surface.geometry.computeBoundingSphere();
      const bs = surface.geometry.boundingSphere;
      const ws = new Vector3();
      surface.matrixWorld.decompose(new Vector3(), new Quaternion(), ws);
      if (bs) {
        radius = bs.radius * Math.max(ws.x, ws.y, ws.z);
        center = bs.center.clone().applyMatrix4(surface.matrixWorld);
      }
    } else {
      const box = new Box3().setFromObject(model);
      center = box.getCenter(new Vector3());
      radius = box.getSize(new Vector3()).length() / 2 || 1;
    }
    return { scale: GLOBE_RADIUS / radius, offset: center };
  }, [model]);

  return (
    // Outer group applies the tilt correction (about world X/Z) after the inner
    // spin, so the model's texture pole aligns with the geometry +Y that the pins
    // use. Pins/arcs live outside Earth and stay on the true lat/lng convention.
    <group rotation={[MODEL_TILT_X, 0, MODEL_TILT_Z]}>
      <group rotation={[0, MODEL_SPIN, 0]} scale={scale}>
        <primitive object={model} position={[-offset.x, -offset.y, -offset.z]} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
