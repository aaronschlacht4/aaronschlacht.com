import { CanvasTexture, EquirectangularReflectionMapping } from 'three';

/**
 * A procedural equirectangular "space" environment for reflections/refraction on
 * the crystal ball — a deep-blue gradient with a warm key light, a cool fill,
 * and scattered stars. No external HDR (CSP-safe, instant).
 */
export function makeSpaceEnv(): CanvasTexture {
  const w = 1024;
  const h = 512;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;

  // vertical gradient: darker at the poles, a touch of light near the horizon
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#05070f');
  g.addColorStop(0.5, '#101c33');
  g.addColorStop(1, '#04060d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const glow = (x: number, y: number, r: number, color: string) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // warm key light (bright — becomes the crystal's main glint)
  glow(w * 0.28, h * 0.34, 150, 'rgba(255,240,214,0.95)');
  glow(w * 0.28, h * 0.34, 60, 'rgba(255,255,255,1)');
  // cool fill on the opposite side
  glow(w * 0.72, h * 0.5, 220, 'rgba(90,140,230,0.5)');
  // soft nebula wash
  glow(w * 0.55, h * 0.7, 300, 'rgba(60,40,90,0.35)');

  // stars
  let seed = 20;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 400; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const a = 0.2 + rnd() * 0.7;
    ctx.globalAlpha = a;
    ctx.fillRect(x, y, rnd() < 0.1 ? 1.6 : 0.9, rnd() < 0.1 ? 1.6 : 0.9);
  }
  ctx.globalAlpha = 1;

  const tex = new CanvasTexture(cv);
  tex.mapping = EquirectangularReflectionMapping;
  return tex;
}
