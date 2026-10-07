import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  JACKET_MATERIAL_PATTERN,
  applyBlankCover,
  applyCoverTexture,
  measureBookBody,
  measureSpineBand,
} from './bookModel';
import {
  BG,
  BOOK_MODEL_URL,
  CAMERA_FOV,
  FULL_CASE_W,
  MAX_ANISOTROPY,
  N_ROWS,
  SHELF_CATEGORIES,
  SHELF_MODEL_URL,
  SPINE_OUT_YAW,
  buildRowLayout,
  frameHeightFit,
  sectionStarts,
  sectionsBottomToTop,
  shelfLayout,
  spineThickness,
  useBookMetrics,
  type Bounds,
} from './shelfLayout';
import type { ShelfBook } from './shelf';

/**
 * The Modern Salon's bookcase, inside the demo's canvas: the app's own
 * `shelfv2.glb` compartment stacked ten high, its `book2.glb` book placed and
 * dressed exactly as the app's ShelfScene places and dresses it, its lights,
 * its environment and its profile-dock framing. The one thing the app's shelf
 * never does — take a book down — is added on top, out of the same wrapper.
 */

const ENV_URL = '/salon/env/lebombo_1k.hdr';

/** How the camera is driven from outside the canvas: a ref, never state. */
export type CameraDrive = {
  /** vertical scroll of the view in world units; NaN until the first frame opens on the top shelf */
  y: number;
  max: number;
  visibleH: number;
  dragging: boolean;
  moved: boolean;
  startY: number;
  startCamY: number;
  releasedAt: number;
};

const step = (cur: number, to: number, dt: number, secs: number) =>
  to > cur ? Math.min(to, cur + dt / secs) : Math.max(to, cur - dt / secs);
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/* ---- Shelf mesh — normalised once, cloned per row ---- */

function useShelfModel() {
  const { scene } = useGLTF(SHELF_MODEL_URL, false, true);
  return useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (!mat) return;
        mat.side = THREE.DoubleSide;
        // Wood grain runs away from the eye at a sharp angle; without this it
        // turns to mush along the shelf.
        for (const tex of [mat.map, mat.normalMap, mat.roughnessMap]) {
          if (tex) {
            tex.anisotropy = MAX_ANISOTROPY;
            tex.needsUpdate = true;
          }
        }
        mat.needsUpdate = true;
      });
    });

    s.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(s);
    let size = box.getSize(new THREE.Vector3());
    if (size.z > size.x) s.rotation.y = Math.PI / 2;

    s.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(s);
    s.position.sub(box.getCenter(new THREE.Vector3()));
    s.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(s);
    s.position.y -= box.min.y;

    s.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(s);
    size = box.getSize(new THREE.Vector3());
    s.scale.setScalar(FULL_CASE_W / Math.max(size.x, 1e-6));

    s.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(s);
    const raw: Bounds = { box, size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) };
    return { template: s, raw };
  }, [scene]);
}

function slimBounds(raw: Bounds, slim: number): Bounds {
  const box = raw.box.clone();
  box.min.x *= slim;
  box.max.x *= slim;
  return { box, size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()) };
}

function ShelfMesh({ template, slim }: { template: THREE.Object3D; slim: number }) {
  const shelf = useMemo(() => template.clone(true), [template]);
  // The narrowing rides on a wrapper group, not on the model, so it slims the
  // case's WIDTH rather than its depth.
  return (
    <group scale={[slim, 1, 1]}>
      <primitive object={shelf} />
    </group>
  );
}

/* ---- Cover textures, shared by every row ---- */

const coverCache = new Map<string, THREE.Texture | null>();
const coverLoads = new Map<string, Promise<THREE.Texture | null>>();

function loadCover(loader: THREE.TextureLoader, url: string): Promise<THREE.Texture | null> {
  let pending = coverLoads.get(url);
  if (!pending) {
    pending = new Promise<THREE.Texture | null>((resolve) => {
      loader.load(
        url,
        (tex) => {
          coverCache.set(url, tex);
          resolve(tex);
        },
        undefined,
        () => {
          coverCache.set(url, null);
          console.warn(`[shelf] cover failed to load: ${url}`);
          resolve(null);
        },
      );
    });
    coverLoads.set(url, pending);
  }
  return pending;
}

/* ---- Books — standing spine-out on the shelf floor, one of them coming down ---- */

// Seconds for the whole trip from the shelf to the hand (and back).
const TAKE_S = 1.2;

function ShelfBooks({
  books,
  bounds,
  rawBounds,
  pickable,
  onPick,
  stage,
  activeBookId,
  reduced,
  drive,
  onReady,
}: {
  books: ShelfBook[];
  bounds: Bounds;
  rawBounds: Bounds;
  pickable: string[];
  onPick: (bookId: string) => void;
  stage: number;
  activeBookId: string;
  reduced: boolean;
  drive: React.MutableRefObject<CameraDrive>;
  onReady?: () => void;
}) {
  const { scene: baseScene } = useGLTF(BOOK_MODEL_URL, false, true);
  const book = useBookMetrics();
  const { gl, size } = useThree();
  const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
  const texLoader = useMemo(() => new THREE.TextureLoader(), []);
  const [hovered, setHovered] = useState<string | null>(null);
  const anims = useRef<Record<string, { out: number }>>({});

  // Scale and resting depth come from the compartment's height and depth,
  // never its width — so they don't change when the case is slimmed.
  const base = useMemo(() => shelfLayout(rawBounds, book), [rawBounds, book]);
  const shelfH = bounds.size.y;

  const bySlot = useMemo(() => {
    const m = new Map<number, ShelfBook>();
    books.forEach((b, i) => m.set(i, b));
    return m;
  }, [books]);
  const layout = useMemo(() => buildRowLayout(bounds, book, bySlot, N_ROWS), [bounds, book, bySlot]);

  const placed = useMemo(() => {
    if (base.width <= 1e-6) return [];
    return books.map((b) => {
      const bookRoot = baseScene.clone(true);
      measureBookBody(bookRoot); // hides the same stray geometry on this clone
      bookRoot.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true;
      });
      // Sit the body's bottom centre on the wrapper's origin, so yaw and scale
      // pivot through the book instead of dragging it off its mark.
      bookRoot.position.x -= book.centre.x;
      bookRoot.position.y -= book.bottom;
      bookRoot.position.z -= book.centre.z;

      const wrapper = new THREE.Group();
      wrapper.add(bookRoot);
      // Quarter turn brings the spine — the model's -X face — round to meet the reader.
      wrapper.rotation.y = SPINE_OUT_YAW;
      // Only the axis that becomes the along-shelf spine width grows or
      // shrinks with the book's own page count.
      const thickness = spineThickness(b.pages);
      wrapper.scale.set(base.scale, base.scale, base.scale * thickness);
      wrapper.updateMatrixWorld(true);

      return { id: b.id, data: b, wrapper, bookRoot, thickness };
    });
  }, [books, base, baseScene, book]);

  /**
   * Which way the front cover faces in the wrapper's own frame, read off the
   * model: the jacket's vertices past the spine band's far edge are the front
   * cover's, and the sign of their z says which side of the book they're on.
   * The take-down yaws the book to put that side toward the camera.
   */
  const faceYaw = useMemo(() => {
    const root = baseScene.clone(true);
    const band = measureSpineBand(root);
    if (!band) return 0;
    root.updateMatrixWorld(true);
    const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const v = new THREE.Vector3();
    let sum = 0;
    let n = 0;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (!mats.some((m) => m && JACKET_MATERIAL_PATTERN.test(m.name ?? ''))) return;
      const rel = new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld);
      const pos = mesh.geometry.getAttribute('position');
      const uv = mesh.geometry.getAttribute('uv');
      if (!uv) return;
      for (let i = 0; i < pos.count; i++) {
        if (uv.getX(i) <= band.u2) continue;
        v.fromBufferAttribute(pos, i).applyMatrix4(rel);
        sum += v.z;
        n++;
      }
    });
    return n && sum / n > 0 ? 0 : Math.PI;
  }, [baseScene]);

  // Dress every clone in its cover. Re-runs whenever the shelf is rebuilt, so
  // a cover that arrives late still lands on a live book. Once every cover
  // has settled the shelf reports ready, so the loop's first take-down never
  // shows a bare book on a cold load.
  useEffect(() => {
    let live = true;
    const pending: Promise<unknown>[] = [];
    placed.forEach((p) => {
      const url = p.data.cover;
      if (!url) {
        applyBlankCover(p.bookRoot, p.data.uuid);
        return;
      }
      const settled = coverCache.get(url);
      if (settled) {
        applyCoverTexture(p.bookRoot, settled, maxAnisotropy, p.thickness, p.data.calibrated);
        return;
      }
      if (settled === null) {
        applyBlankCover(p.bookRoot, p.data.uuid);
        return;
      }
      pending.push(
        loadCover(texLoader, url).then((tex) => {
          if (!live) return;
          if (tex) applyCoverTexture(p.bookRoot, tex, maxAnisotropy, p.thickness, p.data.calibrated);
          else applyBlankCover(p.bookRoot, p.data.uuid);
        }),
      );
    });
    if (placed.length) Promise.all(pending).then(() => live && onReady?.());
    return () => {
      live = false;
    };
  }, [placed, texLoader, maxAnisotropy, onReady]);

  // One sanity check against the app's own numbers, in development only.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const msfm = placed.find((p) => p.id === 'mans-search-for-meaning');
    const band = msfm ? measureSpineBand(msfm.bookRoot) : null;
    console.info('[salon] book', book.size.toArray().map((n) => n.toFixed(4)), 'bottom', book.bottom.toFixed(4), 'layout', {
      scale: base.scale.toFixed(4),
      width: base.width.toFixed(4),
      restY: base.restY.toFixed(4),
      restZ: base.restZ.toFixed(4),
    }, 'band', band && { u1: band.u1.toFixed(4), u2: band.u2.toFixed(4), warp: band.warp.map((w) => +w.toFixed(3)) }, 'faceYaw', faceYaw);
  }, [placed, book, base, faceYaw]);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  const hand = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    // Clamped loosely: the reader opens on the wall clock, so on a slow frame
    // the book must still keep up with it; only a tab switch is thrown away.
    const dt = reduced ? 10 : Math.min(delta, 0.2);
    const d = drive.current;
    const fit = frameHeightFit(size.width / size.height, Number.isFinite(d.y) ? d.y : d.max, bounds);
    // Where a taken-down book is held: in front of the camera, a little
    // below its eye line, close enough to fill most of the frame.
    hand.set(fit.x, fit.y - 0.7, fit.dist - 2.0);

    placed.forEach((p, i) => {
      const slot = layout.get(i);
      if (!slot) {
        p.wrapper.visible = false;
        return;
      }
      p.wrapper.visible = true;
      const homeX = slot.x;
      const homeY = (N_ROWS - 1 - slot.row) * shelfH + base.restY;
      const homeZ = base.restZ;

      const a = (anims.current[p.id] ??= { out: 0 });
      const want = stage >= 1 && stage <= 6 && p.id === activeBookId ? 1 : 0;
      a.out = step(a.out, want, dt, TAKE_S);
      const e = smooth(a.out);

      if (e <= 0) {
        p.wrapper.position.set(homeX, homeY, homeZ);
        p.wrapper.rotation.y = SPINE_OUT_YAW;
        return;
      }
      // Phase A: straight out of the compartment, until the book has cleared
      // the open front. Phase B: carried to the hand on a small lift, turning
      // to show its front cover.
      const za = clamp01(e / 0.3);
      const b = e <= 0.25 ? 0 : smooth(clamp01((e - 0.25) / 0.75));
      const zOut = homeZ + (1.25 - homeZ) * za;
      p.wrapper.position.set(
        homeX + (hand.x - homeX) * b,
        homeY + (hand.y - homeY) * b + 0.15 * Math.sin(Math.PI * b),
        zOut + (hand.z - zOut) * b,
      );
      p.wrapper.rotation.y = SPINE_OUT_YAW + (faceYaw - SPINE_OUT_YAW) * b;
    });
  });

  return (
    <group>
      {placed.map((p) => {
        const live = pickable.includes(p.id);
        return (
          <group
            key={p.id}
            onPointerOver={
              live
                ? (e: ThreeEvent<PointerEvent>) => {
                    e.stopPropagation();
                    setHovered(p.id);
                  }
                : undefined
            }
            onPointerOut={
              live
                ? (e: ThreeEvent<PointerEvent>) => {
                    e.stopPropagation();
                    setHovered((h) => (h === p.id ? null : h));
                  }
                : undefined
            }
            onClick={
              live
                ? (e: ThreeEvent<MouseEvent>) => {
                    e.stopPropagation();
                    // A drag that ended over a book is not a click on it.
                    if (drive.current.moved) return;
                    onPick(p.id);
                  }
                : undefined
            }
          >
            <primitive object={p.wrapper} />
          </group>
        );
      })}
    </group>
  );
}

/* ---- Camera: the profile dock's framing, scrolled by the drag ---- */

function DemoCamera({
  bounds,
  drive,
  reduced,
  onSection,
}: {
  bounds: Bounds;
  drive: React.MutableRefObject<CameraDrive>;
  reduced: boolean;
  onSection: (idx: number) => void;
}) {
  const { camera, size } = useThree();
  const last = useRef(-1);

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const d = drive.current;
    const extent = frameHeightFit(aspect, 0, bounds);
    d.max = extent.maxScrollY;
    d.visibleH = extent.visibleH;
    // Open on the top shelf, where the reading order starts.
    if (!Number.isFinite(d.y)) d.y = d.max;
    d.y = Math.max(0, Math.min(d.max, d.y));
    // Left alone for a while, the view drifts back up to the top shelf so the
    // loop's next book is always in frame.
    if (!d.dragging && d.y !== d.max && performance.now() - d.releasedAt > 2500) {
      const k = reduced ? 1 : 1 - Math.exp(-2.4 * Math.min(delta, 0.05));
      d.y += (d.max - d.y) * k;
      if (Math.abs(d.max - d.y) < 1e-3) d.y = d.max;
    }

    const fit = frameHeightFit(aspect, d.y, bounds);
    const far = fit.dist + N_ROWS * bounds.size.y + 20;
    if (cam.fov !== CAMERA_FOV || cam.near !== 0.5 || Math.abs(cam.far - far) > 1e-3) {
      cam.fov = CAMERA_FOV;
      // The depth buffer's precision is spent across near..far; bracketing the
      // scene tightly keeps the jacket and the binding trim apart on the spine.
      cam.near = 0.5;
      cam.far = far;
      cam.updateProjectionMatrix();
    }
    cam.position.set(fit.x, fit.y, bounds.center.z + fit.dist);
    cam.lookAt(fit.x, fit.y, bounds.center.z);

    // Which category the view is closest to, for the strip at the left edge.
    let rowsAbove = 0;
    let best = 0;
    let bestDist = Infinity;
    SHELF_CATEGORIES.forEach((cat, i) => {
      const target = Math.max(0, d.max - rowsAbove * bounds.size.y);
      const dist = Math.abs(d.y - target);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
      rowsAbove += cat.rows;
    });
    if (best !== last.current) {
      last.current = best;
      onSection(best);
    }
  });

  return null;
}

/* ---- Rows, labels, and the books ---- */

const labelStyle: React.CSSProperties = {
  color: 'rgba(255, 225, 170, 0.95)',
  fontSize: '10px',
  fontWeight: '700',
  letterSpacing: '4px',
  textTransform: 'uppercase',
  fontFamily: 'system-ui',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
  textShadow: [
    '0 0 6px rgba(255,190,80,0.95)',
    '0 0 14px rgba(255,160,40,0.7)',
    '0 0 28px rgba(255,140,20,0.4)',
    '0 1px 3px rgba(0,0,0,0.95)',
  ].join(', '),
};

type LibraryProps = {
  books: ShelfBook[];
  pickable: string[];
  onPick: (bookId: string) => void;
  stage: number;
  activeBookId: string;
  reduced: boolean;
  drive: React.MutableRefObject<CameraDrive>;
  onSection: (idx: number) => void;
  onReady?: () => void;
};

function Library(props: LibraryProps) {
  const { books, pickable, onPick, activeBookId, drive, onSection, onReady } = props;
  const { template, raw } = useShelfModel();
  const { size } = useThree();
  const { stage, reduced } = props;

  // With fit="height" the case is slimmed to the panel rather than shown at a
  // fixed width: the camera holds the rows at the library's own distance, so
  // how much shelf fits across the view is decided by the viewport's aspect —
  // and the case is narrowed to exactly that much.
  const slim = frameHeightFit(size.width / Math.max(size.height, 1), 0, raw).effSlim;
  const bounds = useMemo(() => slimBounds(raw, slim), [raw, slim]);
  const shelfH = bounds.size.y;

  return (
    <>
      <DemoCamera bounds={bounds} drive={drive} reduced={reduced} onSection={onSection} />

      {Array.from({ length: N_ROWS }, (_, idx) => (
        <group key={idx} position={[0, idx * shelfH, 0]}>
          <ShelfMesh template={template} slim={slim} />
        </group>
      ))}

      <ShelfBooks
        books={books}
        bounds={bounds}
        rawBounds={raw}
        pickable={pickable}
        onPick={onPick}
        stage={stage}
        activeBookId={activeBookId}
        reduced={reduced}
        drive={drive}
        onReady={onReady}
      />

      {/* Category labels — centred on the first shelf of each section. The
          z-index range keeps them under the reader when it opens over the
          canvas; being DOM they would also draw over a book held in front of
          the case, so they step aside while one is out. */}
      {sectionsBottomToTop.map((sec, si) => (
        <Html
          key={`sec-label-${sec.name}`}
          center
          zIndexRange={[5, 0]}
          position={[bounds.center.x, (sectionStarts[si] + 0.5) * shelfH, bounds.box.max.z + 0.25]}
          style={{
            ...labelStyle,
            opacity: stage >= 1 && stage <= 6 ? 0 : 1,
            transition: reduced ? 'none' : 'opacity 400ms',
            // Back once the book has finished its 1.2 s return.
            transitionDelay: stage === 7 ? '1300ms' : stage === 0 ? '900ms' : '0ms',
          }}
        >
          {sec.name}
        </Html>
      ))}
    </>
  );
}

/* ---- Scene: the app's lights and environment ---- */

export default function Bookcase(props: LibraryProps) {
  return (
    <>
      <color attach="background" args={[BG]} />

      <ambientLight intensity={0.45} color="#ffd4a0" />
      <directionalLight
        position={[0, 8, 18]}
        intensity={2.2}
        color="#ffe8c8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={16}
        shadow-camera-bottom={-2}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        // Without at least this much bias every book self-shadows per texel,
        // quilting the spines with a diamond lattice.
        shadow-bias={-0.0002}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[-8, 6, 12]} intensity={0.6} color="#ffc87a" />
      <directionalLight position={[8, 6, 12]} intensity={0.6} color="#ffc87a" />

      {/* The app's "apartment" preset, served from here rather than drei's CDN. */}
      <Suspense fallback={null}>
        <Environment files={ENV_URL} background={false} />
      </Suspense>

      <Suspense
        fallback={
          <Html center>
            <div style={{ color: '#ffe8c0', fontFamily: 'system-ui', fontSize: 14 }}>Loading…</div>
          </Html>
        }
      >
        <Library {...props} />
      </Suspense>
    </>
  );
}

useGLTF.preload(SHELF_MODEL_URL, false, true);
useGLTF.preload(BOOK_MODEL_URL, false, true);
