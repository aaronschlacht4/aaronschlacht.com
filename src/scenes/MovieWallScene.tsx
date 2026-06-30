import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, MathUtils, TextureLoader, type Mesh } from 'three';
import { MOVIES, type Movie } from '../data/movies';
import { DPR_RANGE } from '../lib/env';

const COLS = 4;
const CARD_W = 2;
const CARD_H = 3;
const GAP_X = 0.5;
const GAP_Y = 0.7;

/**
 * A wall of movie "posters" (planes) in a grid, with a slight per-row depth
 * offset for parallax. Hovering lifts and scales a poster and reveals its title +
 * one-line take. Fixed camera with gentle mouse parallax. Posters with art in
 * /public/posters use it; the rest fall back to a tinted gradient.
 */
export default function MovieWallScene() {
  return (
    <Canvas
      dpr={DPR_RANGE}
      camera={{ position: [0, 0, 11], fov: 42 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => gl.setClearColor('#070b12', 1)}
    >
      <Suspense fallback={null}>
        <Wall />
      </Suspense>
    </Canvas>
  );
}

function Wall() {
  const group = useRef<Group>(null);

  const layout = useMemo(() => {
    const rows = Math.ceil(MOVIES.length / COLS);
    const totalW = COLS * CARD_W + (COLS - 1) * GAP_X;
    const totalH = rows * CARD_H + (rows - 1) * GAP_Y;
    return MOVIES.map((movie, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = col * (CARD_W + GAP_X) - totalW / 2 + CARD_W / 2;
      const y = -(row * (CARD_H + GAP_Y)) + totalH / 2 - CARD_H / 2;
      const z = (row % 2 === 0 ? 0 : -0.8); // per-row depth offset
      return { movie, x, y, z };
    });
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = MathUtils.lerp(
      group.current.rotation.y,
      state.pointer.x * 0.12,
      0.05,
    );
    group.current.rotation.x = MathUtils.lerp(
      group.current.rotation.x,
      state.pointer.y * 0.08,
      0.05,
    );
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 3, 8]} intensity={1.1} />
      <pointLight position={[-6, 4, 6]} intensity={30} color="#5fb2ff" />
      <pointLight position={[6, -4, 6]} intensity={20} color="#f06b9b" />

      <group ref={group}>
        {layout.map((it) => (
          <Poster key={it.movie.title} movie={it.movie} pos={[it.x, it.y, it.z]} />
        ))}
      </group>
    </>
  );
}

function Poster({
  movie,
  pos,
}: {
  movie: Movie;
  pos: [number, number, number];
}) {
  const mesh = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!mesh.current) return;
    const targetZ = hovered ? 1.0 : 0;
    const targetScale = hovered ? 1.08 : 1;
    mesh.current.position.z = MathUtils.lerp(
      mesh.current.position.z,
      targetZ,
      0.15,
    );
    const s = MathUtils.lerp(mesh.current.scale.x, targetScale, 0.15);
    mesh.current.scale.setScalar(s);
  });

  return (
    <group position={pos}>
      <mesh
        ref={mesh}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = '';
        }}
      >
        <planeGeometry args={[CARD_W, CARD_H]} />
        {movie.poster ? (
          <PosterArt url={movie.poster} />
        ) : (
          <meshStandardMaterial color={movie.tint} roughness={0.6} />
        )}

        {/* always-on title strip via DOM (no font dependency) */}
        <Html
          position={[0, -CARD_H / 2 + 0.05, 0.02]}
          transform
          distanceFactor={9}
          pointerEvents="none"
        >
          <div
            style={{
              width: 150,
              textAlign: 'center',
              color: '#f3f6fb',
              fontSize: 13,
              fontWeight: 700,
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              userSelect: 'none',
            }}
          >
            {movie.title}
            <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>
              {movie.year}
            </div>
          </div>
        </Html>
      </mesh>

      {hovered && (
        <Html position={[0, CARD_H / 2 + 0.2, 1.1]} center distanceFactor={9}>
          <div
            style={{
              width: 190,
              background: 'rgba(8,13,22,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '8px 12px',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ color: '#f0c46b', fontSize: 13 }}>
              {'★'.repeat(movie.rating)}
            </div>
            <div style={{ color: '#cdd8e6', fontSize: 12, lineHeight: 1.4 }}>
              {movie.take}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/** Lazily loads poster art; suspends within the scene's <Suspense>. */
function PosterArt({ url }: { url: string }) {
  const tex = useLoader(TextureLoader, url);
  return <meshStandardMaterial map={tex} roughness={0.5} />;
}
