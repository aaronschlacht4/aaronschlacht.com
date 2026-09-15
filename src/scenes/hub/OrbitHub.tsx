import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Group,
  Vector3,
  BufferGeometry,
  LineDashedMaterial,
  LineLoop,
  Color,
  type PerspectiveCamera,
} from 'three';
import { SPHERES, type Orbit } from '../../data/spheres';
import { useScene } from '../../state/useScene';
import { easeInOut } from '../../lib/geo';
import {
  DOCK_NDC_X,
  DOCK_NDC_Y,
  DOCK_DIST,
  HUB_FOV,
  DOCK_SCALE_MUL,
} from '../../lib/dock';
import HubSphere from './HubSphere';

const BASE_PERIOD = 46; // seconds at the reference radius (ambient, slow)
const REF_R = 1.25;

// Where the docked emblem sits, as an upper-left screen point (NDC) and a fixed
// distance from the camera. Projecting through NDC keeps it pinned to the same
// spot and size at any aspect ratio or camera pitch. The section phase also
// narrows the camera FOV (see GlobeScene) which flattens perspective so this
// corner sphere reads as a clean circle instead of an off-axis egg. These
// constants (and HUB_FOV, the resting hub FOV the size compensation below is
// measured against) live in lib/dock so HubOverlay's 2D title layout can
// compute the same emblem box without duplicating — and risking drift from —
// the numbers that actually place it.
const _ndc = new Vector3();
const _dir = new Vector3();
const _dock = new Vector3();

const damp = (cur: number, to: number, rate: number, dt: number) =>
  cur + (to - cur) * (1 - Math.exp(-rate * Math.min(dt, 0.05)));

/** A point on a given tilted/yawed orbital circle. */
function orbitPos(a: number, o: Orbit): [number, number, number] {
  const x = Math.cos(a) * o.radius;
  const z = Math.sin(a) * o.radius;
  // tilt about X, then yaw about Y → a distinct orbital plane per sphere
  const y1 = -z * Math.sin(o.tilt);
  const z1 = z * Math.cos(o.tilt);
  const x2 = x * Math.cos(o.yaw) + z1 * Math.sin(o.yaw);
  const z2 = -x * Math.sin(o.yaw) + z1 * Math.cos(o.yaw);
  return [x2, y1, z2];
}

/** Kepler-ish: outer orbits are slower (period ∝ radius^1.5). */
const speedFor = (o: Orbit) =>
  (Math.PI * 2) / (BASE_PERIOD * Math.pow(o.radius / REF_R, 1.5));

// ── Gravity ───────────────────────────────────────────────────────────────
// The anchored masses (just the black hole today, but the field sums, so any
// number works). Read once: these never move, which is the whole point.
const HOLES = SPHERES.flatMap((s) =>
  s.anchor ? [{ pos: new Vector3(...s.anchor.at), mass: s.anchor.mass }] : [],
);

const GRAV_SOFT = 0.6; // softening length: keeps the pull finite at the centre
const GRAV_MAX_FRAC = 0.5; // never drag a point more than half of its own distance
const SWING = 1.9; // extra angular speed at closest approach

const _gd = new Vector3();
const _raw = new Vector3();

/**
 * Bend a point toward every anchored mass: softened inverse-square, with the
 * displacement capped at a fraction of the distance so nothing can be dragged
 * into — or through — the hole.
 *
 * The masses never move, so this field is static, and that is what lets the
 * dotted paths stay honest: each ring is warped once at build time by this
 * same function, and the sphere riding it is warped every frame by it too, so
 * the sphere still sits exactly on its drawn path. The orbits look pulled
 * out of true toward the hole because they are.
 */
function gravityWarp(p: Vector3, out: Vector3): Vector3 {
  out.copy(p);
  for (const hole of HOLES) {
    _gd.copy(hole.pos).sub(p);
    const r = _gd.length();
    if (r < 1e-4) continue;
    const pull = hole.mass / (r * r + GRAV_SOFT * GRAV_SOFT);
    out.addScaledVector(_gd, Math.min(pull, GRAV_MAX_FRAC * r) / r);
  }
  return out;
}

/** Same falloff, as a 0..~1 "how deep in the well is this point" number —
 *  used to speed a sphere up as it swings past the hole and let it coast
 *  again on the far side. Gravity you can read off the motion, not just the
 *  shape of the path. */
function wellDepth(p: Vector3): number {
  let d = 0;
  for (const hole of HOLES) {
    const r2 = _gd.copy(hole.pos).sub(p).lengthSq();
    d += hole.mass / (r2 + GRAV_SOFT * GRAV_SOFT);
  }
  return d;
}

/**
 * The project spheres, each on its own orbit around Earth. They fly in as Earth
 * shrinks (hubAnim), orbit slowly on distinct tilted planes and spin on their
 * own axes, a hovered sphere scales up and eases to a pause, and the opened
 * sphere flies to centre while the rest drift away (sectionAnim). A dotted path
 * marks each orbit.
 *
 * The black hole is the exception: it doesn't orbit anything. It hangs at a
 * fixed point off to one side and gravity does the work instead — every orbit
 * (and its dotted path) is pulled out of true toward it, and each sphere
 * accelerates as it swings through the well and coasts as it climbs back out.
 * See gravityWarp.
 */
export default function OrbitHub() {
  const N = SPHERES.length;
  const refs = useRef<(Group | null)[]>([]);
  const angles = useRef(SPHERES.map((s) => s.orbit?.phase ?? 0));
  const hoverS = useRef(SPHERES.map(() => 1));
  const hub = useRef(0);
  const section = useRef(0);

  const setHovered = useScene((s) => s.setHovered);
  const openSection = useScene((s) => s.openSection);

  // A dotted ring per orbit — warped by the same gravity field the spheres
  // ride, so the drawn path is the real one. Anchored spheres travel no path,
  // so they get no ring (null, to keep the array index-aligned with SPHERES).
  const rings = useMemo(
    () =>
      SPHERES.map((s) => {
        if (!s.orbit) return null;
        const o = s.orbit;
        const pts: Vector3[] = [];
        for (let k = 0; k <= 200; k++) {
          const p = new Vector3(...orbitPos((k / 200) * Math.PI * 2, o));
          pts.push(gravityWarp(p, p));
        }
        const geom = new BufferGeometry().setFromPoints(pts);
        const line = new LineLoop(
          geom,
          new LineDashedMaterial({
            color: new Color('#6fb8ff'),
            transparent: true,
            opacity: 0,
            depthWrite: false,
            dashSize: 0.03,
            gapSize: 0.05,
          }),
        );
        line.computeLineDistances();
        return line;
      }),
    [],
  );

  useFrame((state, dt) => {
    const { phase, hovered, activeSection } = useScene.getState();
    hub.current = damp(hub.current, phase === 'journey' ? 0 : 1, 4, dt);
    section.current = damp(section.current, activeSection ? 1 : 0, 5, dt);
    const h = easeInOut(hub.current);
    const sec = easeInOut(section.current);

    // Where the docked emblem lands: the world point on the ray through the
    // top-left NDC target, at a fixed distance from the camera. unproject()
    // handles the camera's pitch and aspect exactly, so the emblem sits fully
    // in the upper-left corner (with margin) on any viewport.
    const cam = state.camera as PerspectiveCamera;
    _ndc.set(DOCK_NDC_X, DOCK_NDC_Y, 0.5).unproject(cam);
    _dir.copy(_ndc).sub(cam.position).normalize();
    _dock.copy(cam.position).addScaledVector(_dir, DOCK_DIST);
    const dockX = _dock.x;
    const dockY = _dock.y;
    const dockZ = _dock.z;

    for (let i = 0; i < N; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const def = SPHERES[i];
      const ring = rings[i];
      if (ring) (ring.material as LineDashedMaterial).opacity = 0.34 * h * (1 - sec);

      const paused = hovered === def.id || activeSection !== null;

      let x: number, y: number, z: number;
      if (def.anchor) {
        // Anchored: it doesn't travel. It flies in along its own bearing as the
        // hub assembles, then holds that point for good.
        const k = 1 + 1.6 * (1 - h);
        [x, y, z] = def.anchor.at;
        x *= k;
        y *= k;
        z *= k;
      } else {
        const o = def.orbit!;
        // Speed is set by where the sphere is *now*: it accelerates into the
        // hole's well and coasts back out. Reading the depth before advancing
        // costs one extra orbitPos and keeps position and speed in step.
        _raw.set(...orbitPos(angles.current[i], o));
        if (!paused) {
          angles.current[i] += dt * speedFor(o) * (1 + SWING * wellDepth(_raw));
        }

        // fly-in: extra radius when hub=0, settling onto the orbit
        const flyR: Orbit = { ...o, radius: o.radius + 2.6 * (1 - h) };
        _raw.set(...orbitPos(angles.current[i], flyR));
        // ...then bend the whole path toward the anchored mass.
        gravityWarp(_raw, _raw);
        x = _raw.x;
        y = _raw.y;
        z = _raw.z;
      }

      hoverS.current[i] = damp(hoverS.current[i], hovered === def.id ? 1.08 : 1, 8, dt);
      let scale = h * hoverS.current[i];

      if (activeSection === def.id) {
        // dock to the top-left as the section's rotating emblem. Compensate the
        // docked size for the narrowed section FOV so it stays visually constant
        // (narrower FOV zooms in → shrink world scale by tan(fov/2) ratio).
        const dockScale =
          DOCK_SCALE_MUL *
          (Math.tan((cam.fov * Math.PI) / 360) /
            Math.tan((HUB_FOV * Math.PI) / 360));
        x = x * (1 - sec) + dockX * sec;
        y = y * (1 - sec) + dockY * sec;
        z = z * (1 - sec) + dockZ * sec;
        scale = scale * (1 - sec) + dockScale * sec;
      } else if (activeSection) {
        scale *= 1 - sec;
      }

      g.position.set(x, y, z);
      g.scale.setScalar(Math.max(0.0001, scale));
      g.visible = scale > 0.002;
    }
  });

  return (
    <group>
      {rings.map((r, i) =>
        r ? <primitive key={`ring-${i}`} object={r} /> : null,
      )}
      {SPHERES.map((def, i) => (
        <group
          key={def.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <HubSphere
            def={def}
            onOver={setHovered}
            onOut={(id) =>
              useScene.getState().hovered === id && setHovered(null)
            }
            onClick={openSection}
          />
        </group>
      ))}
    </group>
  );
}
