/**
 * Camera + docking geometry shared between the 3D scene (GlobeScene,
 * OrbitHub) and the 2D section-page layout (HubOverlay). Centralised so the
 * title/hero layout can line up exactly with the docked emblem's actual
 * on-screen position and size, without duplicating — and risking drift
 * from — the constants that place it in 3D.
 */

// Camera dolly: the journey stays at the original close-up framing; the
// hub/section pull back and narrow the FOV together (same on-screen Earth
// size, but a smaller off-axis angle, so the orbiting spheres don't read as
// eggs near the edges — see GlobeScene's useFrame for the full rationale).
export const JOURNEY_CAM_Z = 3.4;
export const HUB_CAM_Z = 5.1;
export const CAM_Y = 0.35;
export const JOURNEY_FOV = 42;
export const HUB_FOV = 29;
export const SECTION_EXTRA_NARROW = 8; // further narrow once a section docks
export const DOCK_FOV = HUB_FOV - SECTION_EXTRA_NARROW;

// Where the docked emblem sits: a fixed upper-left screen point (NDC) at a
// fixed distance from the camera, plus its base world-space size.
export const DOCK_NDC_X = -0.64;
export const DOCK_NDC_Y = 0.56;
export const DOCK_DIST = 3.0;
export const SPHERE_R = 0.2; // base sphere radius, world units
export const DOCK_SCALE_MUL = 0.9;

/**
 * How far the section page has scrolled (CSS px). The docked emblem is part
 * of that page's header, not a fixed badge, so it has to scroll away with the
 * title rather than float over the content below — HubOverlay writes this
 * from its scroll container and OrbitHub lifts the emblem by the same amount.
 * Mutated in place (read every frame), never reassigned.
 */
export const dockScroll = { px: 0 };

/**
 * The docked emblem's screen-space centre (px) and radius (px) once fully
 * settled, for a viewport of the given CSS size, at scroll 0. Pure trig — a
 * point placed via unproject(NDC) always reprojects back to that same NDC,
 * so the centre needs no camera math at all; the radius mirrors OrbitHub's
 * dockScale.
 */
export function dockedEmblemBox(vw: number, vh: number) {
  const cx = (DOCK_NDC_X * 0.5 + 0.5) * vw;
  const cy = (1 - (DOCK_NDC_Y * 0.5 + 0.5)) * vh;
  const halfDockFov = (DOCK_FOV * Math.PI) / 360;
  const halfHubFov = (HUB_FOV * Math.PI) / 360;
  const dockScale =
    DOCK_SCALE_MUL * (Math.tan(halfDockFov) / Math.tan(halfHubFov));
  const worldRadius = SPHERE_R * dockScale;
  const r = ((vh / 2) * (worldRadius / DOCK_DIST)) / Math.tan(halfDockFov);
  return { cx, cy, r };
}
