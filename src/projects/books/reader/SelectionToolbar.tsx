import { Book, MessageCirclePlus, Sparkles, X } from './icons';

/**
 * The app's floating toolbar over a selection (SelectionToolbar.tsx): four
 * highlighter swatches, dismiss, comment, define, Ask Claude. Light-themed
 * against the dark reader, as it is in the app. Positioned by the caller in
 * the reader's own coordinates; `pressed` paints a button its hover colour so
 * the demo can show it being chosen.
 */

const COLORS = [
  { label: 'Yellow', solid: '#F9C905' },
  { label: 'Pink', solid: '#FF4F7B' },
  { label: 'Blue', solid: '#3B82F6' },
  { label: 'Green', solid: '#22C55E' },
];

export const TOOLBAR_W = 312;

const button: React.CSSProperties = {
  width: '34px',
  height: '34px',
  borderRadius: '7px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#888',
  flexShrink: 0,
  padding: 0,
};

const divider: React.CSSProperties = {
  width: '1px',
  height: '26px',
  background: 'rgba(0,0,0,0.12)',
  flexShrink: 0,
};

export default function SelectionToolbar({
  left,
  top,
  arrowX,
  pressed,
}: {
  left: number;
  top: number;
  /** caret x, relative to the toolbar's left edge */
  arrowX: number;
  pressed: 'comment' | 'ask' | null;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: `${TOOLBAR_W}px`,
        height: '44px',
        zIndex: 200,
        background: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(20px)',
        borderRadius: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '0 30px 0 30px',
        boxSizing: 'content-box',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        {COLORS.map((c) => (
          <span
            key={c.label}
            title={`Highlight ${c.label}`}
            style={{
              display: 'block',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: c.solid,
              border: '2px solid rgba(0,0,0,0.10)',
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      <div style={divider} />

      <span title="Dismiss" style={button}>
        <X size={18} strokeWidth={1.5} />
      </span>

      <div style={divider} />

      <span
        title="Add comment"
        style={{ ...button, color: pressed === 'comment' ? '#333' : '#888', transition: 'color 120ms' }}
      >
        <MessageCirclePlus size={18} strokeWidth={1.5} />
      </span>

      <div style={divider} />

      <span title="Define" style={button}>
        <Book size={18} strokeWidth={1.5} />
      </span>

      <div style={divider} />

      <span
        title="Ask Claude"
        style={{ ...button, marginLeft: '-3px', color: pressed === 'ask' ? '#a855f7' : '#888', transition: 'color 120ms' }}
      >
        <Sparkles size={18} strokeWidth={1.5} />
      </span>

      {/* Arrow caret pointing down to the selection */}
      <div
        style={{
          position: 'absolute',
          bottom: '-7px',
          left: `${arrowX}px`,
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: '7px solid rgba(255,255,255,0.97)',
          filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.06))',
        }}
      />
    </div>
  );
}
