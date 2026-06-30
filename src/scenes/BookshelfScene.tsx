import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, MathUtils, type Mesh } from 'three';
import { BOOKS, type Book } from '../data/books';
import { DPR_RANGE } from '../lib/env';

/**
 * A real 3D bookshelf: each book is a box of slightly varied dimensions standing
 * on a plank. Hovering slides a book out and tilts it, revealing a tooltip with
 * the one-line take + rating. The "currently reading" book is pulled out and
 * laid forward so it stands apart. Fixed camera with gentle mouse parallax.
 */
export default function BookshelfScene() {
  return (
    <Canvas
      dpr={DPR_RANGE}
      camera={{ position: [0, 0.6, 9], fov: 40 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => gl.setClearColor('#070b12', 1)}
    >
      <Suspense fallback={null}>
        <Shelf />
      </Suspense>
    </Canvas>
  );
}

function Shelf() {
  const group = useRef<Group>(null);

  // Lay the books out left→right with varied sizes derived from their content
  // (stable, no randomness needed).
  const layout = useMemo(() => {
    const gap = 0.06;
    let x = 0;
    const items = BOOKS.map((book, i) => {
      const width = 0.42 + (book.title.length % 5) * 0.05;
      const height = 2.0 + ((i * 7) % 5) * 0.14;
      const depth = 1.5;
      const item = { book, width, height, depth, x: 0 };
      item.x = x + width / 2;
      x += width + gap;
      return item;
    });
    const totalW = x - gap;
    // centre the row
    items.forEach((it) => (it.x -= totalW / 2));
    return items;
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    // gentle parallax toward the pointer
    group.current.rotation.y = MathUtils.lerp(
      group.current.rotation.y,
      state.pointer.x * 0.18,
      0.06,
    );
    group.current.rotation.x = MathUtils.lerp(
      group.current.rotation.x,
      -state.pointer.y * 0.08,
      0.06,
    );
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 6, 5]} intensity={1.4} />
      <directionalLight position={[-5, 2, 3]} intensity={0.5} color="#9fc4ff" />

      <group ref={group}>
        {/* shelf plank */}
        <mesh position={[0, -0.15, 0]} receiveShadow>
          <boxGeometry args={[layout.length * 0.9 + 1.5, 0.3, 2]} />
          <meshStandardMaterial color="#2a2018" roughness={0.8} />
        </mesh>
        {/* back panel */}
        <mesh position={[0, 1.2, -0.95]}>
          <boxGeometry args={[layout.length * 0.9 + 1.5, 3, 0.1]} />
          <meshStandardMaterial color="#1a140e" roughness={0.95} />
        </mesh>

        {layout.map((it) => (
          <BookMesh
            key={it.book.title}
            book={it.book}
            x={it.x}
            width={it.width}
            height={it.height}
            depth={it.depth}
          />
        ))}
      </group>
    </>
  );
}

function BookMesh({
  book,
  x,
  width,
  height,
  depth,
}: {
  book: Book;
  x: number;
  width: number;
  height: number;
  depth: number;
}) {
  const mesh = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const reading = book.status === 'reading';
  const baseY = height / 2;

  useFrame(() => {
    if (!mesh.current) return;
    // reading book always sits out; hovered books slide out further
    const outZ = (reading ? 0.9 : 0) + (hovered ? 0.7 : 0);
    const tilt = reading ? -0.25 : hovered ? -0.12 : 0;
    mesh.current.position.z = MathUtils.lerp(mesh.current.position.z, outZ, 0.15);
    mesh.current.rotation.x = MathUtils.lerp(
      mesh.current.rotation.x,
      tilt,
      0.15,
    );
  });

  return (
    <group position={[x, baseY, 0]}>
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
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={book.spineColor}
          roughness={0.55}
          metalness={0.05}
        />
        {/* spine title — vertical DOM text, no font dependency */}
        <Html
          position={[0, 0, depth / 2 + 0.01]}
          transform
          distanceFactor={6}
          pointerEvents="none"
        >
          <div
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              color: '#f3ead8',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              userSelect: 'none',
            }}
          >
            {book.title}
          </div>
        </Html>
      </mesh>

      {/* hover / reading tooltip */}
      {(hovered || reading) && (
        <Html position={[0, height / 2 + 0.5, 0.8]} center distanceFactor={8}>
          <div
            style={{
              width: 200,
              transform: 'translateY(-50%)',
              background: 'rgba(8,13,22,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '10px 12px',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          >
            {reading && (
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#5fb2ff',
                  marginBottom: 4,
                }}
              >
                Currently reading
              </div>
            )}
            <div style={{ fontWeight: 700, color: '#e8eef6', fontSize: 14 }}>
              {book.title}
            </div>
            <div style={{ color: '#9aa7b8', fontSize: 12, marginBottom: 6 }}>
              {book.author}
            </div>
            <div style={{ color: '#cdd8e6', fontSize: 12, lineHeight: 1.4 }}>
              {book.take}
            </div>
            {book.rating > 0 && (
              <div style={{ color: '#f0c46b', fontSize: 13, marginTop: 6 }}>
                {'★'.repeat(book.rating)}
                <span style={{ color: '#3a4252' }}>
                  {'★'.repeat(5 - book.rating)}
                </span>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
