import { useMemo, type CSSProperties } from 'react';

/**
 * A fixed, full-page CSS starfield behind everything (the globe canvas is
 * transparent, the sections tint over it) so the whole site sits in space.
 *
 * Realism comes from layering: a dense field of faint pinprick stars, a sparser
 * field of mid stars, and a handful of bright glowing stars in varied colours,
 * each layer twinkling at its own rate. A soft nebula wash adds depth, and a few
 * staggered shooting stars streak across roughly once every 6 seconds.
 */

// Deterministic star positions across the tile — stable across reloads, and no
// dependency on render-time randomness.
function starShadows(
  count: number,
  spread: number,
  seed: number,
  tints: string[],
): string {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (rand() * spread).toFixed(0);
    const y = (rand() * spread).toFixed(0);
    const a = (0.35 + rand() * 0.65).toFixed(2);
    const tint = tints[Math.floor(rand() * tints.length)];
    out.push(`${x}px ${y}px ${a === '1.00' ? tint : `rgba(255,255,255,${a})`}`);
    // give a share of stars a subtle colour by overriding a few with the tint
    if (rand() > 0.82) out[out.length - 1] = `${x}px ${y}px ${tint}`;
  }
  return out.join(', ');
}

const COOL = ['rgba(199,221,255,0.9)', 'rgba(170,200,255,0.85)'];
const WARM = ['rgba(255,240,220,0.9)', 'rgba(255,226,196,0.85)'];

type Shot = {
  top: string;
  left: string;
  /** travel direction in degrees (CSS: 0=right, 90=down) */
  deg: number;
  dist: number;
  len: number;
  delay: string;
};

// Three streaks on an 18s cycle, offset by 6s → one shooting star every ~6s,
// each with a different start, direction and length so they never look identical.
// The tail is drawn along the travel direction (deg) so it always trails the
// head correctly — the thing that makes it read as a real meteor.
const SHOTS: Shot[] = [
  { top: '9%', left: '72%', deg: 158, dist: 820, len: 160, delay: '0s' },
  { top: '13%', left: '14%', deg: 26, dist: 860, len: 130, delay: '6s' },
  { top: '5%', left: '46%', deg: 133, dist: 720, len: 185, delay: '12s' },
];

export default function Starfield() {
  const [small, mid, big] = useMemo(
    () => [
      starShadows(360, 2500, 11, COOL),
      starShadows(120, 2500, 71, [...COOL, ...WARM]),
      starShadows(30, 2500, 131, WARM),
    ],
    [],
  );

  const layer = (
    shadows: string,
    size: number,
    duration: string,
    glow?: string,
  ) => (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: shadows,
        filter: glow ? `drop-shadow(0 0 3px ${glow})` : undefined,
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
          'radial-gradient(130% 90% at 50% 20%, #0b1430 0%, #060a1c 40%, #01020a 100%)',
      }}
    >
      {/* Soft nebula wash for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(40% 30% at 72% 30%, rgba(80,120,220,0.12), transparent 70%),' +
            'radial-gradient(45% 35% at 22% 68%, rgba(150,90,200,0.1), transparent 70%)',
        }}
      />

      {layer(small, 1, '4.5s')}
      {layer(mid, 1.6, '6.5s')}
      {layer(big, 2.4, '9s', 'rgba(180,210,255,0.9)')}

      {/* Shooting stars — a bright head with a thin tapered tail trailing
          exactly along the travel direction. */}
      {SHOTS.map((sh, i) => {
        const rad = (sh.deg * Math.PI) / 180;
        const dx = Math.cos(rad) * sh.dist;
        const dy = Math.sin(rad) * sh.dist;
        return (
          <div
            key={i}
            style={
              {
                position: 'absolute',
                top: sh.top,
                left: sh.left,
                width: `${sh.len}px`,
                height: '2px',
                // head sits at the leading (right) end; tail fades back
                background:
                  'linear-gradient(90deg, rgba(180,210,255,0) 0%, rgba(180,210,255,0.25) 62%, rgba(220,235,255,0.85) 90%, #ffffff 100%)',
                borderRadius: '2px',
                filter:
                  'drop-shadow(0 0 4px rgba(200,225,255,0.95)) drop-shadow(0 0 9px rgba(120,170,255,0.6))',
                opacity: 0,
                transformOrigin: 'right center',
                // rotation + translation both come from the keyframe transform
                animation: `shooting-star 18s linear ${sh.delay} infinite`,
                '--angle': `${sh.deg}deg`,
                '--dx': `${dx.toFixed(0)}px`,
                '--dy': `${dy.toFixed(0)}px`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
