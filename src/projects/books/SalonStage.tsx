import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  Group,
  type Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from 'three';
import { DPR_RANGE } from '../../lib/env';
import { SHELF, dimsFor, type BookDims, type ShelfBook } from './shelf';
import { makePage, type PageCanvas } from './pageTexture';
import type { Scenario } from './scenarios';

/**
 * The demo's 3D half: a shelf of The Modern Salon's books in their real
 * cover art, one of which comes off the shelf, turns to face you, opens,
 * and has a passage highlighted on its page.
 *
 * The books are built here rather than loaded: the app's own glTF is 20MB,
 * far too heavy for a window on a portfolio page. They keep the app's rules
 * though — one image per book, back–spine–front; each book sized from its
 * own cover file so the art isn't stretched; the spine as thick as the page
 * count says; and the spine's art laid out by where it lands on screen (its
 * projection), not by distance along the curved surface, which is the fix
 * the app's spine shader ended up at.
 *
 * Stages, driven from SalonWindow:
 *   0 on the shelf · 1 taken down · 2 open · 3 highlighted ·
 *   4 discussion · 5 VIP · 6 AI · 7 closing and going back
 */

const BG = '#140d04';
const BOARD = 0.016; // cover board thickness
const PLANK_TOP = 0;
const SHELF_FRONT = 0.42; // z of the spines' face
const READ_AT = new Vector3(0, 0.98, 1.25); // where the open spread sits
const READ_TILT = -0.62; // the spread leans back toward the camera
const OPEN_ANGLE = Math.PI * 0.965;

// Seconds for each leg of the trip off the shelf.
const PULL_S = 0.7;
const MOVE_S = 1.15;
const OPEN_S = 1.0;
const HIGHLIGHT_S = 1.4;

type Anim = { pull: number; move: number; open: number; nudge: number };
type BookRefs = { root: Group | null; front: Group | null; spine: Group | null; back: Group | null };

const ease = (t: number) => t * t * (3 - 2 * t);
const step = (cur: number, to: number, dt: number, secs: number) =>
  to > cur ? Math.min(to, cur + dt / secs) : Math.max(to, cur - dt / secs);

export default function SalonStage({
  scenario,
  stage,
  vip,
  reduced,
  pickable,
  onPick,
}: {
  scenario: Scenario;
  stage: number;
  vip: boolean;
  reduced: boolean;
  /** books that have a scenario, so can be clicked */
  pickable: string[];
  onPick: (bookId: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  // Drag to turn the shelf. The yaw lives in a ref the scene reads, so a drag
  // never re-renders React; `dragged` stops the release from counting as a click.
  const drag = useRef({ yaw: 0, active: false, startX: 0, startYaw: 0, moved: false, released: 0 });

  // Only draw while the window is on screen.
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrap}
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
      onPointerDown={(e) => {
        const d = drag.current;
        d.active = true;
        d.moved = false;
        d.startX = e.clientX;
        d.startYaw = d.yaw;
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d.active) return;
        const dx = e.clientX - d.startX;
        if (Math.abs(dx) > 4) d.moved = true;
        d.yaw = Math.max(-0.7, Math.min(0.7, d.startYaw + dx * 0.006));
      }}
      onPointerUp={() => {
        drag.current.active = false;
        drag.current.released = performance.now();
      }}
      onPointerLeave={() => {
        if (drag.current.active) drag.current.released = performance.now();
        drag.current.active = false;
      }}
    >
      <Canvas
        dpr={DPR_RANGE}
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: [0, 0.9, 4], fov: 34, near: 0.05, far: 40 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(BG, 1)}
      >
        <fog attach="fog" args={[BG, 5, 11]} />
        <Suspense fallback={null}>
          <Scene
            scenario={scenario}
            stage={stage}
            vip={vip}
            reduced={reduced}
            pickable={pickable}
            onPick={(id) => {
              if (!drag.current.moved) onPick(id);
            }}
            drag={drag}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ── The scene ─────────────────────────────────────────────────────────────

const _v = new Vector3();
const _look = new Vector3();
const _camTo = new Vector3();
const _dir = new Vector3();
const _q = new Quaternion();
const SHELF_Q = new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0));
const READ_Q = new Quaternion().setFromEuler(new Euler(READ_TILT, 0, 0));
const SHELF_DIR = new Vector3(0, 0.2, 1).normalize();
const READ_DIR = new Vector3(0, 0.5, 0.87).normalize();

function Scene({
  scenario,
  stage,
  vip,
  reduced,
  pickable,
  onPick,
  drag,
}: {
  scenario: Scenario;
  stage: number;
  vip: boolean;
  reduced: boolean;
  pickable: string[];
  onPick: (bookId: string) => void;
  drag: React.MutableRefObject<{ yaw: number; active: boolean; released: number }>;
}) {
  const covers = useTexture(SHELF.map((b) => b.cover));
  const grain = useTexture('/salon/pages.jpg');
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);

  const root = useRef<Group>(null);
  const refs = useRef<Record<string, BookRefs>>({});
  const anims = useRef<Record<string, Anim>>(
    Object.fromEntries(SHELF.map((b) => [b.id, { pull: 0, move: 0, open: 0, nudge: 0 }])),
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const highlight = useRef(0);
  const camPos = useRef<Vector3 | null>(null);
  const camLook = useRef(new Vector3(0, 0.6, 0));
  const yaw = useRef(0);

  // Covers in sRGB, sharp at a slant; each one's mean colour, for the board
  // edges and — lifted most of the way to white, as the app does — the paper.
  const looks = useMemo(
    () =>
      covers.map((t) => {
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = 8;
        t.needsUpdate = true;
        const mean = meanColor(t);
        return {
          edge: mean.clone().multiplyScalar(0.7),
          paper: mean.clone().lerp(new Color('#f4ead6'), 0.78),
        };
      }),
    [covers],
  );

  // Page-edge grain: the forum's own, one copy turned for the fore-edge,
  // where the leaves run top to bottom.
  const grains = useMemo(() => {
    grain.colorSpace = SRGBColorSpace;
    grain.wrapS = grain.wrapT = RepeatWrapping;
    const side = grain.clone();
    side.center.set(0.5, 0.5);
    side.rotation = Math.PI / 2;
    side.needsUpdate = true;
    return { top: grain, side };
  }, [grain]);

  // Shelf order, left to right, spines facing out.
  const layout = useMemo(() => {
    const gap = 0.018;
    const dims = SHELF.map(dimsFor);
    const total = dims.reduce((s, d) => s + d.t, 0) + gap * (dims.length - 1);
    let x = -total / 2;
    const slots = dims.map((d) => {
      const at = x + d.t / 2;
      x += d.t + gap;
      return at;
    });
    return { dims, slots, total };
  }, []);

  const activeIdx = SHELF.findIndex((b) => b.id === scenario.bookId);
  const activeDims = layout.dims[activeIdx];

  // The open book's two pages, set from the app's text for this page.
  const pages = useMemo(() => {
    const pw = activeDims.w - 0.03;
    const ph = activeDims.h - 0.04;
    const header = scenario.title.toUpperCase();
    return {
      left: makePage({
        paragraphs: scenario.left,
        passage: null,
        aspect: ph / pw,
        side: 'left',
        header: scenario.author,
        folio: scenario.page - 1,
      }),
      right: makePage({
        paragraphs: scenario.right,
        passage: scenario.passage,
        aspect: ph / pw,
        side: 'right',
        header,
        folio: scenario.page,
      }),
    };
  }, [scenario, activeDims]);
  useEffect(() => () => {
    pages.left.dispose();
    pages.right.dispose();
  }, [pages]);
  useEffect(() => {
    highlight.current = 0;
  }, [scenario]);

  const commentCount = useMemo(() => {
    const count = (rs: Scenario['replies']): number => rs.reduce((s, r) => s + 1 + count(r.replies ?? []), 0);
    return 1 + count(scenario.replies);
  }, [scenario]);

  useFrame((_, rawDt) => {
    // Progress runs on wall time (capped only for a tab coming back from the
    // background), so a slow device stays in step with the panel beside it.
    const dt = reduced ? 10 : Math.min(rawDt, 0.25);

    // ── Drag: follow the pointer, drift home a little after letting go.
    const d = drag.current;
    if (!d.active && performance.now() - d.released > 2500) d.yaw *= Math.exp(-1.2 * Math.min(rawDt, 0.05));
    yaw.current += (d.yaw - yaw.current) * (1 - Math.exp(-10 * Math.min(rawDt, 0.05)));
    if (root.current) root.current.rotation.y = yaw.current;

    // ── Each book's trip: pull → move → open, and back in reverse. A book
    // only leaves the shelf once the reading spot is clear.
    const out = stage >= 1 && stage <= 6;
    const busy = SHELF.some((b) => b.id !== scenario.bookId && anims.current[b.id].move > 0.02);
    for (let i = 0; i < SHELF.length; i++) {
      const b = SHELF[i];
      const a = anims.current[b.id];
      const mine = b.id === scenario.bookId;
      const wantPull = mine && out ? 1 : 0;
      const wantMove = mine && stage >= 2 && stage <= 6 && !busy ? 1 : 0;
      const wantOpen = wantMove;
      if (wantPull > a.pull || a.move < 0.01) a.pull = step(a.pull, wantPull, dt, PULL_S);
      if ((wantMove > a.move && a.pull > 0.99) || (wantMove < a.move && a.open < 0.01))
        a.move = step(a.move, wantMove, dt, MOVE_S);
      if ((wantOpen > a.open && a.move > 0.99) || wantOpen < a.open) a.open = step(a.open, wantOpen, dt, OPEN_S);
      const canNudge = pickable.includes(b.id) && hovered === b.id && a.pull < 0.01;
      a.nudge = step(a.nudge, canNudge ? 1 : 0, dt, 0.18);
      placeBook(refs.current[b.id], a, layout.slots[i], layout.dims[i]);
    }

    // ── The highlighter sweeps once the passage is in view.
    const act = anims.current[scenario.bookId];
    const hlWant = stage >= 3 && act.open > 0.99 ? 1 : stage >= 7 ? highlight.current : 0;
    highlight.current = step(highlight.current, hlWant, dt, HIGHLIGHT_S);
    pages.right.draw({
      highlight: ease(highlight.current),
      comments: stage >= 4 ? commentCount : 0,
      vip: stage >= 5 && vip && !!scenario.vip,
    });

    // ── Camera: the shelf, the spread, or the passage.
    const aspect = size.width / Math.max(1, size.height);
    const tanH = Math.tan((camera.fov * Math.PI) / 360);
    const fit = (w: number, h: number) => Math.max(w / 2 / (tanH * aspect), h / 2 / tanH);
    const reading = stage >= 2 && stage <= 6 && act.move > 0.6;
    const zoom = reading && stage >= 3 && act.open > 0.95 && pages.right.passageAt;
    let dist: number;
    if (zoom && pages.right.passageAt) {
      const r = refs.current[scenario.bookId]?.back;
      const pa = pages.right.passageAt;
      const pw = activeDims.w - 0.03;
      const ph = activeDims.h - 0.04;
      // Aimed between the passage and the page's middle, so the page fills the
      // frame rather than the shelf behind it.
      _look.set(0.008 + pa.x * pw, (ph / 2 - pa.y * ph) * 0.6, 0);
      if (r) r.localToWorld(_look);
      // Keep the left page's edge in frame: lean the view toward the gutter,
      // and drift a little, as a reader's eye would, so the hold isn't a still.
      const t = performance.now() / 1000;
      _look.x -= activeDims.w * (0.28 + (reduced ? 0 : 0.05 * Math.sin(t * 0.35)));
      _look.y += reduced ? 0 : 0.02 * Math.sin(t * 0.27);
      _dir.copy(READ_DIR);
      dist = fit(activeDims.w * 1.85, activeDims.h * 1.05);
    } else if (reading) {
      _look.copy(READ_AT);
      if (root.current) _look.applyAxisAngle(_v.set(0, 1, 0), yaw.current);
      _dir.copy(READ_DIR);
      dist = fit(activeDims.w * 2 + 0.25, activeDims.h * 1.15);
    } else {
      _look.set(0, PLANK_TOP + 0.6, 0.15);
      _dir.copy(SHELF_DIR);
      dist = fit(layout.total + 0.55, 1.75);
    }
    _camTo.copy(_look).addScaledVector(_dir, dist);
    if (!camPos.current) camPos.current = _camTo.clone();
    const k = reduced ? 1 : 1 - Math.exp(-2.4 * Math.min(rawDt, 0.05));
    camPos.current.lerp(_camTo, k);
    camLook.current.lerp(_look, k);
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);
  });

  return (
    <>
      <ambientLight intensity={0.55} color="#ffd9a8" />
      <hemisphereLight args={['#ffe6c4', '#2a1606', 0.5]} />
      <directionalLight position={[-2.5, 4, 4]} intensity={1.7} color="#ffe8c8" />
      <directionalLight position={[3, 2, 3]} intensity={0.55} color="#ffc87a" />
      <pointLight position={[0.2, 2.2, 2.4]} intensity={2.2} distance={6} decay={1.4} color="#fff1dc" />

      <group ref={root}>
        <ShelfFrame width={layout.total + 0.7} />
        {SHELF.map((b, i) => (
          <Book
            key={b.id}
            book={b}
            dims={layout.dims[i]}
            tex={covers[i]}
            edge={looks[i].edge}
            paper={looks[i].paper}
            grains={grains}
            pages={b.id === scenario.bookId ? pages : null}
            register={(r) => (refs.current[b.id] = r)}
            pickable={pickable.includes(b.id)}
            onOver={() => setHovered(b.id)}
            onOut={() => setHovered((h) => (h === b.id ? null : h))}
            onPick={() => onPick(b.id)}
          />
        ))}
      </group>
    </>
  );
}

/** Pose a book from its trip progress: shelf → pulled → reading, open. */
function placeBook(r: BookRefs | undefined, a: Anim, slotX: number, d: BookDims) {
  if (!r?.root) return;
  const pull = ease(a.pull);
  const move = ease(a.move);
  const open = ease(a.open);

  // On the shelf the spine (local x = 0) faces out; the book stands on the plank.
  const sx = slotX;
  const sy = PLANK_TOP + d.h / 2 + 0.002;
  const sz = SHELF_FRONT + 0.12 * ease(a.nudge);
  // Pulled straight out toward you, a little proud of the shelf.
  const px = sx;
  const py = sy + 0.04 * pull;
  const pz = sz + 0.62 * pull;
  // At the reading spot the closed book sits right of centre (spine at the
  // middle), so it lands centred once open.
  const rx = READ_AT.x - (d.w / 2) * (1 - open);
  const lift = Math.sin(Math.PI * move) * 0.3;
  r.root.position.set(px + (rx - px) * move, py + (READ_AT.y - py) * move + lift, pz + (READ_AT.z - pz) * move);
  _q.copy(SHELF_Q).slerp(READ_Q, move);
  r.root.quaternion.copy(_q);

  if (r.front) r.front.rotation.y = -OPEN_ANGLE * open;
  // The spine folds away under the spread as the book opens.
  if (r.spine) {
    r.spine.scale.z = 1 - 0.9 * open;
    r.spine.scale.x = 1 - 0.9 * open;
  }
}

// ── One book ──────────────────────────────────────────────────────────────

const hidden = new MeshBasicMaterial({ visible: false });

function Book({
  book,
  dims,
  tex,
  edge,
  paper,
  grains,
  pages,
  register,
  pickable,
  onOver,
  onOut,
  onPick,
}: {
  book: ShelfBook;
  dims: BookDims;
  tex: Texture;
  edge: Color;
  paper: Color;
  grains: { top: Texture; side: Texture };
  pages: { left: PageCanvas; right: PageCanvas } | null;
  register: (r: BookRefs) => void;
  pickable: boolean;
  onOver: () => void;
  onOut: () => void;
  onPick: () => void;
}) {
  const { w, h, t } = dims;
  const [f1, f2] = book.spine;
  const r = useRef<BookRefs>({ root: null, front: null, spine: null, back: null });

  const parts = useMemo(() => {
    const cover = new MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0 });
    const board = new MeshStandardMaterial({ color: edge, roughness: 0.8 });
    const leafSide = new MeshStandardMaterial({ map: grains.side, color: paper, roughness: 0.95 });
    const leafTop = new MeshStandardMaterial({ map: grains.top, color: paper, roughness: 0.95 });

    // Front cover: the right-hand panel of the file.
    const front = new PlaneGeometry(w, h);
    remapU(front, (u) => f2 + u * (1 - f2));
    front.translate(w / 2, 0, t / 2 + 0.0012);
    // Back cover: seen from behind, so the spine edge (x = 0) takes f1.
    const back = new PlaneGeometry(w, h);
    back.rotateY(Math.PI);
    remapU(back, (u) => u * f1);
    back.translate(w / 2, 0, -t / 2 - 0.0012);

    const boardGeo = new BoxGeometry(w, h, BOARD);
    const bw = w - 0.026;
    const bh = h - 0.034;
    const bd = Math.max(0.004, t / 2 - BOARD);
    const block = new BoxGeometry(bw, bh, bd);
    // Box faces: +x, -x, +y, -y, +z, -z. The fore-edge and top/bottom show
    // leaves; the face against the other half is the page itself.
    const backLeaves: Material[] = [leafSide, board, leafTop, leafTop, hidden, board];
    const frontLeaves: Material[] = [leafSide, board, leafTop, leafTop, board, hidden];

    return {
      cover,
      board,
      front,
      back,
      boardGeo,
      block,
      bw,
      bd,
      spine: spineGeometry(t, h, f1, f2),
      backLeaves,
      frontLeaves,
      materials: [cover, board, leafSide, leafTop],
    };
  }, [tex, edge, paper, grains, w, h, t, f1, f2]);

  useEffect(
    () => () => {
      parts.materials.forEach((m) => m.dispose());
      [parts.front, parts.back, parts.boardGeo, parts.block, parts.spine].forEach((g) => g.dispose());
    },
    [parts],
  );

  const pageGeos = useMemo(() => {
    const pw = w - 0.03;
    const ph = h - 0.04;
    return { right: pageGeometry(pw, ph, 'right'), left: pageGeometry(pw, ph, 'left') };
  }, [w, h]);
  useEffect(() => () => {
    pageGeos.left.dispose();
    pageGeos.right.dispose();
  }, [pageGeos]);

  const setRef = (k: keyof BookRefs) => (g: Group | null) => {
    r.current[k] = g;
    register(r.current);
  };

  const blockX = 0.004 + parts.bw / 2;

  return (
    <group
      ref={setRef('root')}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (!pickable) return;
        e.stopPropagation();
        onOver();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        if (!pickable) return;
        onOut();
        document.body.style.cursor = '';
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (!pickable) return;
        e.stopPropagation();
        onPick();
      }}
    >
      {/* The spine, on a hinge at the back board so it can fold away. */}
      <group ref={setRef('spine')} position={[0, 0, -t / 2]}>
        <mesh geometry={parts.spine} material={parts.cover} position={[0, 0, t / 2]} />
      </group>

      {/* Back half: back board and cover, its leaves, the right-hand page. */}
      <group ref={setRef('back')}>
        <mesh geometry={parts.back} material={parts.cover} />
        <mesh geometry={parts.boardGeo} material={parts.board} position={[w / 2, 0, -t / 2 + BOARD / 2]} />
        <mesh geometry={parts.block} material={parts.backLeaves} position={[blockX, 0, -parts.bd / 2]} />
        <mesh geometry={pageGeos.right} position={[0.008, 0, 0.0015]}>
          <meshStandardMaterial key={pages ? 'set' : 'blank'} map={pages?.right.texture ?? null} color={pages ? '#ffffff' : '#f6efe0'} roughness={0.92} />
        </mesh>
      </group>

      {/* Front half: hinged at the spine; swings open toward you. */}
      <group ref={setRef('front')}>
        <mesh geometry={parts.front} material={parts.cover} />
        <mesh geometry={parts.boardGeo} material={parts.board} position={[w / 2, 0, t / 2 - BOARD / 2]} />
        <mesh geometry={parts.block} material={parts.frontLeaves} position={[blockX, 0, parts.bd / 2]} />
        <mesh geometry={pageGeos.left} position={[0.008, 0, -0.0015]}>
          <meshStandardMaterial key={pages ? 'set' : 'blank'} map={pages?.left.texture ?? null} color={pages ? '#ffffff' : '#f6efe0'} roughness={0.92} />
        </mesh>
      </group>
    </group>
  );
}

/** Rewrite a plane's U so it samples one panel of the jacket. */
function remapU(g: BufferGeometry, f: (u: number) => number) {
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setX(i, f(uv.getX(i)));
  uv.needsUpdate = true;
}

/**
 * The rounded spine, bulging out of the shelf. Its U runs with z — the
 * spine's projected width as you face it — not with arc length round the
 * curve. Sampled by arc length, the flat middle (where the title is) would
 * get less than its share of the art and read stretched; by projection, the
 * title lands at its true proportions and the rims, which you barely see,
 * give up the difference.
 */
function spineGeometry(t: number, h: number, f1: number, f2: number) {
  const N = 18;
  const bulge = t * 0.16;
  const pos: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const z = -t / 2 + s * t;
    const x = -bulge * Math.sin(Math.PI * s);
    const n = new Vector3(-t, 0, -bulge * Math.PI * Math.cos(Math.PI * s)).normalize();
    for (const y of [-h / 2, h / 2]) {
      pos.push(x, y, z);
      nrm.push(n.x, n.y, n.z);
      uv.push(f1 + s * (f2 - f1), y > 0 ? 1 : 0);
    }
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    const b = a + 2;
    const c = a + 3;
    const d = a + 1;
    idx.push(a, b, c, a, c, d);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * A page, gutter at x = 0, dipping into the binding the way a real spread
 * does. The left page is built facing the other half (−z) so that, once the
 * front half swings open, it faces up with its text the right way round.
 */
function pageGeometry(pw: number, ph: number, side: 'left' | 'right') {
  const g = new PlaneGeometry(pw, ph, 28, 1);
  if (side === 'left') g.rotateY(Math.PI);
  g.translate(pw / 2, 0, 0);
  const p = g.getAttribute('position');
  const dip = 0.035;
  for (let i = 0; i < p.count; i++) {
    const fall = dip * Math.exp(-p.getX(i) / 0.07);
    p.setZ(i, side === 'right' ? -fall : fall);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** The shelf the books stand on: plank, back, two uprights, in dark walnut. */
function ShelfFrame({ width }: { width: number }) {
  const depth = 1.15;
  const zc = SHELF_FRONT - depth / 2 + 0.08;
  return (
    <group>
      <mesh position={[0, PLANK_TOP - 0.05, zc]}>
        <boxGeometry args={[width, 0.1, depth]} />
        <meshStandardMaterial color="#4a2e18" roughness={0.7} />
      </mesh>
      <mesh position={[0, PLANK_TOP + 0.85, zc - depth / 2 - 0.03]}>
        <boxGeometry args={[width, 1.9, 0.06]} />
        <meshStandardMaterial color="#24150a" roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (width + 0.08)) / 2, PLANK_TOP + 0.85, zc]}>
          <boxGeometry args={[0.08, 1.9, depth]} />
          <meshStandardMaterial color="#3a2313" roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

/** A cover's average colour, from a 1×1 draw of its image. */
function meanColor(t: Texture): Color {
  try {
    const img = t.image as CanvasImageSource;
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('no 2d');
    ctx.drawImage(img, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
  } catch {
    return new Color('#5a4630');
  }
}
