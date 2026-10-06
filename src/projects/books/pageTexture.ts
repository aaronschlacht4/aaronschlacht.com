import { CanvasTexture, SRGBColorSpace } from 'three';

/**
 * One printed page of the open book, drawn to a canvas and used as a
 * texture. The layout pass records where every word of the passage landed,
 * so the highlighter can sweep across exactly those words, line by line,
 * and the margin marks — the discussion's count, the VIP's crown — can sit
 * level with the passage the way the app pins them to it.
 */

const PX_W = 640;
const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
const INK = '#2a2118';
const PAPER = '#f6efe0';
const HIGHLIGHT = 'rgba(255, 205, 80, 0.62)';

type Rect = { x: number; y: number; w: number; h: number };

export type PageMarks = {
  /** 0..1, how much of the passage the highlighter has crossed */
  highlight: number;
  /** comment count in the margin, 0 to hide */
  comments: number;
  /** the VIP crown beside the comment count */
  vip: boolean;
};

export type PageCanvas = {
  texture: CanvasTexture;
  /** where the passage sits, as fractions of the page (0,0 top-left) */
  passageAt: { x: number; y: number } | null;
  draw: (m: PageMarks) => void;
  dispose: () => void;
};

export function makePage({
  paragraphs,
  passage,
  aspect,
  side,
  header,
  folio,
}: {
  paragraphs: string[];
  passage: string | null;
  /** page height / width */
  aspect: number;
  /** which side of the spread: sets which margin is the gutter */
  side: 'left' | 'right';
  header: string;
  folio: number;
}): PageCanvas {
  const W = PX_W;
  const H = Math.round(W * aspect);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const gutter = W * 0.12;
  const outer = W * 0.125;
  const left = side === 'right' ? gutter : outer;
  const right = W - (side === 'right' ? outer : gutter);
  const top = H * 0.115;
  const bottom = H - H * 0.075;
  const size = Math.round(W * 0.043);
  const lead = Math.round(size * 1.45);
  const font = `${size}px ${SERIF}`;

  // ── Layout once: words → justified lines, passage words remembered. ──
  ctx.font = font;
  const space = ctx.measureText(' ').width;
  type Word = { text: string; x: number; y: number; w: number; inPassage: boolean };
  const words: Word[] = [];
  let y = top + size;
  let full = false;
  for (const para of paragraphs) {
    if (full) break;
    const start = passage ? para.indexOf(passage) : -1;
    const end = start >= 0 ? start + passage!.length : -1;
    const tokens: { text: string; at: number }[] = [];
    para.replace(/\S+/g, (t, at: number) => {
      tokens.push({ text: t, at });
      return t;
    });
    let i = 0;
    let first = true;
    while (i < tokens.length) {
      if (y > bottom) {
        full = true;
        break;
      }
      const indent = first ? size * 1.4 : 0;
      const avail = right - left - indent;
      const line: typeof tokens = [];
      let width = 0;
      while (i < tokens.length) {
        const w = ctx.measureText(tokens[i].text).width;
        const next = line.length ? width + space + w : w;
        if (next > avail && line.length) break;
        line.push(tokens[i]);
        width = next;
        i++;
      }
      const last = i >= tokens.length;
      const gap = !last && line.length > 1 ? (avail - (width - space * (line.length - 1))) / (line.length - 1) : space;
      let x = left + indent;
      for (const t of line) {
        const w = ctx.measureText(t.text).width;
        const inPassage = start >= 0 && t.at >= start && t.at < end;
        words.push({ text: t.text, x, y, w, inPassage });
        x += w + gap;
      }
      y += lead;
      first = false;
    }
  }

  // The passage, as one rect per line, for the sweep.
  const rects: Rect[] = [];
  for (const wd of words) {
    if (!wd.inPassage) continue;
    const r = rects[rects.length - 1];
    const ry = wd.y - size * 0.86;
    if (r && Math.abs(r.y - ry) < 1) r.w = wd.x + wd.w - r.x;
    else rects.push({ x: wd.x - 3, y: ry, w: wd.w + 6, h: size * 1.18 });
  }
  if (rects.length) rects[rects.length - 1].w += 3;
  const total = rects.reduce((s, r) => s + r.w, 0);
  const passageAt = rects.length
    ? {
        x: (left + right) / 2 / W,
        y: (rects[0].y + rects[rects.length - 1].y + rects[rects.length - 1].h) / 2 / H,
      }
    : null;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;

  let lastKey = '';
  const draw = (m: PageMarks) => {
    const key = `${m.highlight.toFixed(3)}|${m.comments}|${m.vip}`;
    if (key === lastKey) return;
    lastKey = key;

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    // A little shade into the gutter, so the spread reads as bound paper.
    const g = side === 'right' ? ctx.createLinearGradient(0, 0, W * 0.14, 0) : ctx.createLinearGradient(W, 0, W * 0.86, 0);
    g.addColorStop(0, 'rgba(90, 64, 30, 0.22)');
    g.addColorStop(1, 'rgba(90, 64, 30, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Highlighter under the ink.
    if (m.highlight > 0 && total > 0) {
      let remaining = total * m.highlight;
      ctx.fillStyle = HIGHLIGHT;
      for (const r of rects) {
        if (remaining <= 0) break;
        const w = Math.min(r.w, remaining);
        roundRect(ctx, r.x, r.y, w, r.h, 4);
        ctx.fill();
        remaining -= w;
      }
    }

    // Running head and folio.
    ctx.fillStyle = '#8a7a62';
    ctx.font = `italic ${Math.round(size * 0.72)}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText(header, (left + right) / 2, H * 0.065);
    ctx.font = `${Math.round(size * 0.72)}px ${SERIF}`;
    ctx.fillText(String(folio), (left + right) / 2, H - H * 0.035);
    ctx.textAlign = 'left';

    ctx.fillStyle = INK;
    ctx.font = font;
    for (const wd of words) ctx.fillText(wd.text, wd.x, wd.y);

    // Margin marks, level with the passage, in the outer margin.
    if (rects.length && (m.comments > 0 || m.vip)) {
      const mx = side === 'right' ? right + outer * 0.5 : left - outer * 0.5;
      let my = rects[0].y + size * 0.55;
      if (m.comments > 0) {
        bubble(ctx, mx, my, size * 0.95, m.comments);
        my += size * 1.9;
      }
      if (m.vip) crown(ctx, mx, my, size * 0.95);
    }
    texture.needsUpdate = true;
  };

  draw({ highlight: 0, comments: 0, vip: false });

  return {
    texture,
    passageAt,
    draw,
    dispose: () => texture.dispose(),
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** A speech bubble with the thread's size in it. */
function bubble(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, n: number) {
  ctx.fillStyle = '#7a2f22';
  roundRect(ctx, cx - s * 0.8, cy - s * 0.62, s * 1.6, s * 1.15, s * 0.32);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy + s * 0.5);
  ctx.lineTo(cx - s * 0.5, cy + s * 0.88);
  ctx.lineTo(cx + s * 0.05, cy + s * 0.5);
  ctx.fill();
  ctx.fillStyle = '#fbefd9';
  ctx.font = `600 ${Math.round(s * 0.78)}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(String(n), cx, cy + s * 0.22);
  ctx.textAlign = 'left';
}

/** The VIP mark: the app draws its VIP avatars as a crown. */
function crown(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.fillStyle = '#c99a2e';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.8, cy + s * 0.45);
  ctx.lineTo(cx - s * 0.8, cy - s * 0.35);
  ctx.lineTo(cx - s * 0.4, cy + s * 0.02);
  ctx.lineTo(cx, cy - s * 0.6);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.02);
  ctx.lineTo(cx + s * 0.8, cy - s * 0.35);
  ctx.lineTo(cx + s * 0.8, cy + s * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - s * 0.8, cy + s * 0.55, s * 1.6, s * 0.18);
}
