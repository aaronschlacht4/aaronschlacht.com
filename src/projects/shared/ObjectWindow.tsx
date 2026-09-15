import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { Box3, Vector3, type Mesh, type MeshPhysicalMaterial } from 'three';
import type { SphereDef, SphereKind } from '../../data/spheres';
import { DPR_RANGE } from '../../lib/env';
import { makeSpaceEnv } from '../../scenes/hub/spaceEnv';
import WindowFrame from './WindowFrame';

/**
 * A window for projects without a live scene of their own yet: the project's
 * object from the hub, up close and free to spin. Drag to turn it; it idles
 * round on its own otherwise.
 */
const MODEL_URL: Partial<Record<SphereKind, string>> = {
  mercury: '/models/mercury_mr.glb',
  crystal: '/models/pool_ball_mr.glb',
  paper: '/models/crumpled_paper.glb',
};

function Fitted({ url, polish }: { url: string; polish?: boolean }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const m = scene.clone(true);
    m.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(m);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const sc = 2 / maxDim; // radius 1
    m.scale.setScalar(sc);
    m.position.set(-center.x * sc, -center.y * sc, -center.z * sc);
    m.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const mat = (mesh.material as MeshPhysicalMaterial).clone();
      mat.transparent = false;
      mat.opacity = 1;
      if (polish) {
        mat.roughness = Math.min(mat.roughness ?? 1, 0.12);
        mat.metalness = 0;
        mat.envMapIntensity = 1.5;
        mat.clearcoat = 1;
        mat.clearcoatRoughness = 0.06;
      }
      mesh.material = mat;
    });
    return m;
  }, [scene, polish]);
  return <primitive object={obj} />;
}

export default function ObjectWindow({ def }: { def: SphereDef }) {
  const url = MODEL_URL[def.kind];
  const env = useMemo(makeSpaceEnv, []);
  return (
    <WindowFrame tone={def.tone} label={`${def.label} · preview`}>
      <div className="relative aspect-[16/9] max-h-[68vh] w-full cursor-grab bg-[#0a0c12] active:cursor-grabbing">
        {url && (
          <Canvas
            dpr={DPR_RANGE}
            camera={{ position: [0, 0.2, 4.6], fov: 32 }}
            gl={{ antialias: true, alpha: true }}
            onCreated={({ gl }) => gl.setClearColor('#000000', 0)}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={0.45} color="#eaf1ff" />
              <directionalLight position={[2.5, 3, 4]} intensity={1.6} />
              <directionalLight position={[-4, -1, 2]} intensity={0.9} color={def.color} />
              <Environment map={env} />
              <Fitted url={url} polish={def.kind === 'crystal'} />
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                autoRotate
                autoRotateSpeed={0.9}
                enableDamping
                dampingFactor={0.08}
                minPolarAngle={Math.PI * 0.25}
                maxPolarAngle={Math.PI * 0.75}
              />
            </Suspense>
          </Canvas>
        )}
        <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
          <span className="h-px w-6 bg-white/50" />
          drag to turn it
        </div>
      </div>
    </WindowFrame>
  );
}
