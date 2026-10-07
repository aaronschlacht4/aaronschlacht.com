/**
 * The lucide icons the app's reader uses, as inline SVG (lucide-react is not
 * a dependency here). Path data is lucide 0.562's, the version the app pins.
 */

type IconProps = { size?: number; strokeWidth?: number; color?: string; fill?: string };

const icon = (paths: string[], { size = 24, strokeWidth = 2, color = 'currentColor', fill = 'none' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {paths.map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);

export const X = (p: IconProps) => icon(['M18 6 6 18', 'm6 6 12 12'], p);

export const MessageCirclePlus = (p: IconProps) =>
  icon(
    [
      'M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719',
      'M8 12h8',
      'M12 8v8',
    ],
    p,
  );

export const Book = (p: IconProps) =>
  icon(['M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20'], p);

export const Sparkles = (p: IconProps) =>
  icon(
    [
      'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z',
      'M20 2v4',
      'M22 4h-4',
    ],
    p,
  );

export const Send = (p: IconProps) =>
  icon(
    [
      'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z',
      'm21.854 2.147-10.94 10.939',
    ],
    p,
  );

export const Crown = (p: IconProps) =>
  icon(
    [
      'M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z',
      'M5 21h14',
    ],
    p,
  );
