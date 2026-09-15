/**
 * A port of physica.fyi's renderer (github.com/aaronschlacht4/physica, MIT)
 * trimmed to what a window on this site needs: it drives the shader, keeps
 * the camera pointed at the hole, handles dragging, draws the measured
 * circles, and — the additions — pauses itself when it can't be seen and
 * drifts slowly round the hole when nobody is touching it.
 *
 * Wheel-zoom is deliberately left out: on the original page the picture is
 * the page, but here it sits inside a scrolling column, and a window that
 * swallows scroll is a trap. Distance is a dial instead.
 */

import { VERTEX_SOURCE, FRAGMENT_SOURCE } from './shader';

export class WebGLUnavailable extends Error {}

// Geometric units, G = c = M = 1 (see physica's lensing.ts).
export const HORIZON = 2;
export const ISCO = 6;
export const B_CRIT = 3 * Math.sqrt(3);

/** Angular radius of the shadow for an observer at rest at radius r. */
export function shadowAngle(r: number): number {
  const s = (B_CRIT / r) * Math.sqrt(Math.max(0, 1 - HORIZON / r));
  return Math.asin(Math.min(1, s));
}

export type RendererOptions = {
  /** drag to orbit the camera (default true) */
  drag?: boolean;
  /** idle azimuth drift, degrees per second (default 0) */
  drift?: number;
  /** resolution ceiling as a fraction of CSS pixels × dpr */
  maxQuality?: number;
  minQuality?: number;
};

export class PhysicaRenderer {
  /** Camera, in units of M. Inclination is measured from the disk's plane. */
  distance = 42;
  inclination = 12; // degrees
  azimuth = 0; // degrees
  fov = 50; // degrees

  showDisk = true;
  showStars = true;
  beaming = true;
  showMarkers = false;

  diskInner = ISCO;
  diskOuter = 15;
  exposure = 0.6;
  steps = 700;

  quality = 0.5;
  autoQuality = true;
  fps = 0;

  /** Set by the host so dials can follow a drag. */
  onCameraChange?: () => void;

  private readonly host: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly overlay: HTMLCanvasElement | null;
  private readonly octx: CanvasRenderingContext2D | null;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly uniforms: Record<string, WebGLUniformLocation | null> = {};
  private readonly drift: number;
  private readonly maxQuality: number;
  private readonly minQuality: number;

  private w = 1;
  private h = 1;
  private raf = 0;
  private start = performance.now();
  private last = performance.now();
  private frames = 0;
  private lastFpsAt = performance.now();
  private readonly frozen: boolean;
  private dragging = false;
  private inView = true;
  private pageVisible = true;
  private disposed = false;
  private readonly observer: ResizeObserver;
  private readonly cleanup: Array<() => void> = [];

  constructor(
    host: HTMLElement,
    canvas: HTMLCanvasElement,
    overlay: HTMLCanvasElement | null,
    opts: RendererOptions = {},
  ) {
    this.host = host;
    this.canvas = canvas;
    this.overlay = overlay;
    this.octx = overlay ? overlay.getContext('2d') : null;
    this.drift = opts.drift ?? 0;
    this.maxQuality = opts.maxQuality ?? 1;
    this.minQuality = opts.minQuality ?? 0.3;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new WebGLUnavailable('This browser did not provide a WebGL2 context.');
    this.gl = gl;

    this.program = this.link(VERTEX_SOURCE, FRAGMENT_SOURCE);
    this.vao = gl.createVertexArray()!;
    for (const name of [
      'uRes', 'uCam', 'uBasis', 'uTanHalfFov', 'uDiskIn', 'uDiskOut',
      'uShowDisk', 'uShowStars', 'uBeaming', 'uTime', 'uExposure', 'uSteps',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }

    this.frozen = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    if (opts.drag !== false) this.bindDrag();

    // Only burn GPU on a picture somebody can see.
    const io = new IntersectionObserver(([e]) => {
      this.inView = e.isIntersecting;
      this.schedule();
    });
    io.observe(host);
    const onVis = () => {
      this.pageVisible = !document.hidden;
      this.schedule();
    };
    document.addEventListener('visibilitychange', onVis);
    this.cleanup.push(() => io.disconnect(), () => document.removeEventListener('visibilitychange', onVis));
    this.schedule();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.observer.disconnect();
    for (const fn of this.cleanup) fn();
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
    // Free the GPU context — but only once the canvas has really left the
    // page. React's StrictMode (and any remount) disposes and immediately
    // rebuilds on the same canvas, and a canvas hands back its one context
    // for good: lose it here and the rebuilt renderer inherits a dead one.
    // A microtask is late enough to see whether the node was removed.
    const canvas = this.canvas;
    const gl = this.gl;
    queueMicrotask(() => {
      if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();
    });
  }

  get running(): boolean {
    return this.raf !== 0;
  }

  private schedule(): void {
    const should = !this.disposed && this.inView && this.pageVisible;
    if (should && !this.raf) {
      this.last = performance.now();
      this.lastFpsAt = this.last;
      this.frames = 0;
      this.raf = requestAnimationFrame(this.frame);
    } else if (!should && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private link(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new WebGLUnavailable(`Shader failed to compile: ${log}`);
      }
      return s;
    };
    const p = gl.createProgram()!;
    const a = compile(gl.VERTEX_SHADER, vs);
    const b = compile(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, a);
    gl.attachShader(p, b);
    gl.linkProgram(p);
    gl.deleteShader(a);
    gl.deleteShader(b);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new WebGLUnavailable(`Shader program failed to link: ${log}`);
    }
    return p;
  }

  // ── camera ───────────────────────────────────────────────────────────────

  private view() {
    const inc = (Math.max(-89, Math.min(89, this.inclination)) * Math.PI) / 180;
    const az = (this.azimuth * Math.PI) / 180;
    const pos: V3 = [
      this.distance * Math.cos(inc) * Math.cos(az),
      this.distance * Math.sin(inc),
      this.distance * Math.cos(inc) * Math.sin(az),
    ];
    const fwd = norm([-pos[0], -pos[1], -pos[2]]);
    const right = norm(cross(fwd, [0, 1, 0]));
    const up = cross(right, fwd);
    return { pos, right, up, fwd };
  }

  // ── input ────────────────────────────────────────────────────────────────

  private bindDrag(): void {
    const el = this.host;
    let lx = 0;
    let ly = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      this.dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = '';
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!this.dragging) return;
      this.azimuth += (e.clientX - lx) * 0.32;
      this.inclination = Math.max(-89, Math.min(89, this.inclination + (e.clientY - ly) * 0.22));
      lx = e.clientX;
      ly = e.clientY;
      this.onCameraChange?.();
    };
    const up = (e: PointerEvent) => {
      this.dragging = false;
      delete el.dataset.dragging;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    this.cleanup.push(() => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    });
  }

  // ── frame ────────────────────────────────────────────────────────────────

  private resize(): void {
    const rect = this.host.getBoundingClientRect();
    this.w = Math.max(1, Math.round(rect.width));
    this.h = Math.max(1, Math.round(rect.height));
    if (this.overlay && this.octx) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.overlay.width = Math.round(this.w * dpr);
      this.overlay.height = Math.round(this.h * dpr);
      this.octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame);

    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.drift && !this.dragging && !this.frozen) {
      this.azimuth += this.drift * dt;
      this.onCameraChange?.();
    }

    this.frames++;
    if (now - this.lastFpsAt >= 500) {
      this.fps = (this.frames * 1000) / (now - this.lastFpsAt);
      this.frames = 0;
      this.lastFpsAt = now;
      if (this.autoQuality) this.tuneQuality();
    }

    this.draw(this.frozen ? 0 : (now - this.start) / 1000);
    this.drawOverlay();
  };

  /** Trade resolution for frame rate, within limits, so slow GPUs stay usable. */
  private tuneQuality(): void {
    if (this.fps < 24 && this.quality > this.minQuality) {
      this.quality = Math.max(this.minQuality, this.quality - 0.12);
    } else if (this.fps > 52 && this.quality < this.maxQuality) {
      this.quality = Math.min(this.maxQuality, this.quality + 0.06);
    }
  }

  private draw(time: number): void {
    const gl = this.gl;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rw = Math.max(1, Math.round(this.w * dpr * this.quality));
    const rh = Math.max(1, Math.round(this.h * dpr * this.quality));
    if (this.canvas.width !== rw || this.canvas.height !== rh) {
      this.canvas.width = rw;
      this.canvas.height = rh;
    }

    const { pos, right, up, fwd } = this.view();
    gl.viewport(0, 0, rw, rh);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    const u = this.uniforms;
    gl.uniform2f(u.uRes, rw, rh);
    gl.uniform3f(u.uCam, pos[0], pos[1], pos[2]);
    gl.uniformMatrix3fv(u.uBasis, false, [
      right[0], right[1], right[2],
      up[0], up[1], up[2],
      fwd[0], fwd[1], fwd[2],
    ]);
    gl.uniform1f(u.uTanHalfFov, Math.tan(((this.fov * Math.PI) / 180) / 2));
    gl.uniform1f(u.uDiskIn, this.diskInner);
    gl.uniform1f(u.uDiskOut, this.diskOuter);
    gl.uniform1f(u.uShowDisk, this.showDisk ? 1 : 0);
    gl.uniform1f(u.uShowStars, this.showStars ? 1 : 0);
    gl.uniform1f(u.uBeaming, this.beaming ? 1 : 0);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uExposure, this.exposure);
    gl.uniform1i(u.uSteps, this.steps);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /**
   * The measured circles: the shadow edge from 3√3 M, and the horizon at the
   * size it would appear if light went straight, so the gap is the lensing.
   */
  private drawOverlay(): void {
    const g = this.octx;
    if (!g) return;
    g.clearRect(0, 0, this.w, this.h);
    if (!this.showMarkers) return;

    const cx = this.w / 2;
    const cy = this.h / 2;
    const halfH = this.h / 2;
    const tanHalf = Math.tan(((this.fov * Math.PI) / 180) / 2);
    const toPixels = (angle: number) => (Math.tan(angle) / tanHalf) * halfH;

    const rShadow = toPixels(shadowAngle(this.distance));
    const rHorizon = toPixels(Math.asin(Math.min(1, HORIZON / this.distance)));
    const compact = this.w < 420;

    g.save();
    g.lineWidth = 1;
    g.font = `500 ${compact ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    g.textBaseline = 'middle';

    g.strokeStyle = 'rgba(233, 231, 226, 0.4)';
    g.setLineDash([3, 4]);
    g.beginPath();
    g.arc(cx, cy, rHorizon, 0, Math.PI * 2);
    g.stroke();

    g.setLineDash([]);
    g.strokeStyle = 'rgba(233, 231, 226, 0.85)';
    g.beginPath();
    g.arc(cx, cy, rShadow, 0, Math.PI * 2);
    g.stroke();

    const label = (r: number, text: string, dim: boolean) => {
      const a = -Math.PI / 4;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      const tx = cx + rShadow + (compact ? 22 : 46);
      g.strokeStyle = dim ? 'rgba(233, 231, 226, 0.3)' : 'rgba(233, 231, 226, 0.55)';
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(tx - 6, y);
      g.stroke();
      g.fillStyle = dim ? 'rgba(233, 231, 226, 0.6)' : 'rgba(233, 231, 226, 0.92)';
      g.fillText(text, tx, y);
    };
    label(rShadow, compact ? 'shadow, 3√3 M' : `shadow, b = 3√3 M = ${B_CRIT.toFixed(2)} M`, false);
    label(rHorizon, compact ? 'horizon, 2 M' : 'horizon, 2 M, unlensed', true);
    g.restore();
  }

  /** Facts to report alongside the picture. */
  stats() {
    return {
      shadowDegrees: (shadowAngle(this.distance) * 180) / Math.PI,
      ratio: B_CRIT / HORIZON,
      fps: this.fps,
      quality: this.quality,
    };
  }
}

type V3 = [number, number, number];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
