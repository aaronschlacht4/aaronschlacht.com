import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  Box3,
  Vector3,
  MeshStandardMaterial,
  type Object3D,
  type Mesh,
} from 'three';
import { GLOBE_RADIUS } from '../lib/geo';

const MODEL_URL = '/models/earth.glb';

/**
 * Spin the model about its polar axis so the baked continents line up with the
 * lat/lng pin convention (lng=0 / lat=0 → +Z). The glb ships its own surface,
 * cloud, and atmosphere spheres, so GlobeScene no longer adds separate layers.
 * Tune this if the journey routes drift off their countries.
 */
const MODEL_SPIN = Math.PI; // radians about +Y

/**
 * The Earth: the `earth.glb` Sketchfab model (surface + clouds + atmosphere),
 * auto-centred and scaled so its solid surface sphere matches GLOBE_RADIUS — the
 * same radius the journey pins and arcs are built against, so they stay glued to
 * the ground rather than floating over the atmosphere shell.
 */
export default function Earth() {
  const { scene } = useGLTF(MODEL_URL);
  const model = useMemo(() => {
    const m = scene.clone(true);
    // The Sketchfab surface is slightly metallic (renders dark) with an
    // always-on white emissive (city lights that also wash the day side). Make
    // it a clean diffuse Earth so the front-lit hemisphere reads bright & blue,
    // keeping only a gentle emissive for night-side city glow.
    m.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as MeshStandardMaterial;
      if (!mat || !('metalness' in mat)) return;
      if (o.name.includes('pSphere1')) {
        mat.metalness = 0;
        mat.roughness = 1;
        mat.envMapIntensity = 0;
        mat.emissiveIntensity = 0.35;
      }
    });
    return m;
  }, [scene]);

  // Scale/centre on the *surface* sphere (pSphere1), not the whole model — the
  // outer atmosphere shell is larger and would otherwise shrink the globe.
  const { scale, offset } = useMemo(() => {
    let target: Object3D = model;
    model.traverse((o) => {
      if ((o as Mesh).isMesh && o.name.includes('pSphere1')) target = o;
    });
    const box = new Box3().setFromObject(target);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { scale: (GLOBE_RADIUS * 2) / maxDim, offset: center };
  }, [model]);

  return (
    <group rotation={[0, MODEL_SPIN, 0]} scale={scale}>
      <primitive object={model} position={[-offset.x, -offset.y, -offset.z]} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
