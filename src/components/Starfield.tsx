import { useMemo } from 'react';

/**
 * A fixed, full-page CSS starfield that lives behind everything (the globe
 * canvas is transparent, the sections tint over it) so the whole site sits in
 * space — not just the globe hero. Three parallax layers of box-shadow "stars"
 * of different sizes, each softly twinkling. Pure CSS: no canvas, no per-frame
 * work, unaffected by the globe fade.
 */

// Deterministic star positions across a tile the layer repeats — no reliance on
// render-time randomness, so the field is stable across reloads.
function starShadows(count: number, spread: number, seed: number): string {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (rand() * spread).toFixed(0);
    const y = (rand() * spread).toFixed(0);
    const a = (0.4 + rand() * 0.6).toFixed(2);
    out.push(`${x}px ${y}px rgba(255,255,255,${a})`);
  }
  return out.join(', ');
}

export default function Starfield() {
  const [small, mid, big] = useMemo(
    () => [
      starShadows(220, 2000, 11),
      starShadows(90, 2000, 71),
      starShadows(28, 2000, 131),
    ],
    [],
  );

  const layer = (
    shadows: string,
    size: number,
    duration: string,
    tint: string,
  ) => (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: tint,
        boxShadow: shadows,
        animation: `star-twinkle ${duration} ease-in-out infinite`,
      }}
    />
  );

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 overflow-hidden"
      style={{
        pointerEvents: 'none',
        background:
          'radial-gradient(120% 80% at 50% 25%, #0a1226 0%, #050813 45%, #01020a 100%)',
      }}
    >
      {layer(small, 1, '5.5s', '#eaf2ff')}
      {layer(mid, 2, '7s', '#dfeaff')}
      {layer(big, 2.5, '9s', '#bfe0ff')}
    </div>
  );
}
