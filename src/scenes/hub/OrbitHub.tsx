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
import HubSphere from './HubSphere';

const BASE_PERIOD = 46; // seconds at the reference radius (ambient, slow)
const REF_R = 1.25;

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

/**
 * The project spheres, each on its own orbit around Earth. They fly in as Earth
 * shrinks (hubAnim), orbit slowly on distinct tilted planes and spin on their
 * own axes, a hovered sphere scales up and eases to a pause, and the opened
 * sphere flies to centre while the rest drift away (sectionAnim). A dotted path
 * marks each orbit.
 */
export default function OrbitHub() {
  const N = SPHERES.length;
  const refs = useRef<(Group | null)[]>([]);
  const angles = useRef(SPHERES.map((s) => s.orbit.phase));
  const hoverS = useRef(SPHERES.map(() => 1));
  const hub = useRef(0);
  const section = useRef(0);

  const setHovered = useScene((s) => s.setHovered);
  const openSection = useScene((s) => s.openSection);

  // A dotted ring per orbit.
  const rings = useMemo(
    () =>
      SPHERES.map((s) => {
        const pts: Vector3[] = [];
        for (let k = 0; k <= 200; k++) {
          pts.push(new Vector3(...orbitPos((k / 200) * Math.PI * 2, s.orbit)));
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

    // Where the docked emblem lands, derived from the camera each frame so it
    // stays pinned to the upper-left corner at any aspect ratio (a fixed world
    // point would drift toward centre on wider viewports). Target NDC ≈ top-left.
    const cam = state.camera as PerspectiveCamera;
    const dockZ = 0.4;
    const depth = cam.position.z - dockZ;
    const halfH = Math.tan(((cam.fov ?? 42) * Math.PI) / 360) * depth;
    const halfW = halfH * (cam.aspect ?? 1);
    const dockX = -0.78 * halfW;
    const dockY = 0.5 * halfH + cam.position.y;

    for (let i = 0; i < N; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const def = SPHERES[i];
      const o = def.orbit;
      (rings[i].material as LineDashedMaterial).opacity = 0.34 * h * (1 - sec);

      const paused = hovered === def.id || activeSection !== null;
      if (!paused) angles.current[i] += dt * speedFor(o);

      // fly-in: extra radius when hub=0, settling onto the orbit
      const flyR: Orbit = { ...o, radius: o.radius + 2.6 * (1 - h) };
      let [x, y, z] = orbitPos(angles.current[i], flyR);

      hoverS.current[i] = damp(hoverS.current[i], hovered === def.id ? 1.08 : 1, 8, dt);
      let scale = h * hoverS.current[i];

      if (activeSection === def.id) {
        // dock to the top-left as the section's rotating emblem
        x = x * (1 - sec) + dockX * sec;
        y = y * (1 - sec) + dockY * sec;
        z = z * (1 - sec) + dockZ * sec;
        scale = scale * (1 - sec) + 1.0 * sec;
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
      {rings.map((r, i) => (
        <primitive key={`ring-${i}`} object={r} />
      ))}
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
