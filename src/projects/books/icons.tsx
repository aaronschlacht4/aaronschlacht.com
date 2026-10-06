/**
 * Small glyphs for the demo's steps, inline and drawn in the page's tone.
 * The Claude mark is shared with Mercurio's window (../mercurio/icons).
 */

type GlyphProps = { size?: number; color?: string; title?: string };

const svg = (size: number, title: string, children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={title} fill="none">
    {children}
  </svg>
);

export function ShelfGlyph({ size = 16, color = 'currentColor', title = 'Shelf' }: GlyphProps) {
  return svg(
    size,
    title,
    <g stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18" />
      <rect x="4.5" y="6" width="3.5" height="14" rx="0.6" />
      <rect x="9" y="4" width="3" height="16" rx="0.6" />
      <path d="M14 7.5l3.2-.9 3 12.2-3.2.9z" />
    </g>,
  );
}

export function OpenBookGlyph({ size = 16, color = 'currentColor', title = 'Reader' }: GlyphProps) {
  return svg(
    size,
    title,
    <g stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" />
      <path d="M12 6.5v13" />
    </g>,
  );
}

export function HighlighterGlyph({ size = 16, color = 'currentColor', title = 'Highlight' }: GlyphProps) {
  return svg(
    size,
    title,
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="17" width="18" height="4" rx="1" fill="#ffcd50" opacity={0.75} />
      <path d="M14.5 3.5l5 5-7 7H8v-4.5z" stroke={color} strokeWidth={1.7} />
      <path d="M8 15.5l-2 2" stroke={color} strokeWidth={1.7} />
    </g>,
  );
}

export function ThreadGlyph({ size = 16, color = 'currentColor', title = 'Discussion' }: GlyphProps) {
  return svg(
    size,
    title,
    <g stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h11a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0115 14H9l-3.5 3v-3H4a1.5 1.5 0 01-1.5-1.5v-6A1.5 1.5 0 014 5z" />
      <path d="M19.5 9.5H20a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0120 18.5h-.5v2.5l-3-2.5H12" />
    </g>,
  );
}

/** The VIP mark — the app draws a VIP's avatar as the crown itself. */
export function CrownGlyph({ size = 16, color = '#c99a2e', title = 'VIP' }: GlyphProps) {
  return svg(
    size,
    title,
    <g fill={color}>
      <path d="M3 17.5V7.5l4.6 4.2L12 5l4.4 6.7L21 7.5v10z" />
      <rect x="3" y="18.8" width="18" height="2.2" rx="0.6" />
    </g>,
  );
}
