import { Send, X } from './icons';

/**
 * The app's "Ask Claude" card (AIChatPanel.tsx): a white floating panel with
 * the selection as context, the question as a black bubble and the answer
 * streaming into a grey one. The fetch is gone; the messages come from the
 * scenario.
 */

export const AI_PANEL_W = 340;
export const AI_PANEL_H = 420;

export default function AIChatPanel({
  left,
  top,
  selectedText,
  ask,
  answer,
}: {
  left: number;
  top: number;
  selectedText: string;
  ask: string;
  /** what has streamed so far; empty while waiting */
  answer: string;
}) {
  const bubble = (role: 'user' | 'assistant'): React.CSSProperties => ({
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    padding: '8px 11px',
    borderRadius: role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
    background: role === 'user' ? '#111' : 'rgba(0,0,0,0.05)',
    color: role === 'user' ? '#fff' : '#222',
    fontSize: '13px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: `${AI_PANEL_W}px`,
        height: `${AI_PANEL_H}px`,
        zIndex: 300,
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.10)',
        border: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '14px', color: '#111' }}>✦</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>Ask Claude</span>
        </div>
        <span style={{ color: '#aaa', padding: '2px', lineHeight: 1, fontSize: '14px', display: 'inline-flex' }}>
          <X size={15} strokeWidth={2} />
        </span>
      </div>

      {/* Selected text context */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(0,0,0,0.02)',
          flexShrink: 0,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: '#888',
            fontStyle: 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
          }}
        >
          &ldquo;{selectedText}&rdquo;
        </p>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'hidden',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={bubble('user')}>{ask}</div>
        <div style={bubble('assistant')}>{answer || <span style={{ opacity: 0.5 }}>…</span>}</div>
      </div>

      {/* Input */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(0,0,0,0.07)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: '8px',
            padding: '7px 11px',
            fontSize: '13px',
            background: 'rgba(0,0,0,0.03)',
            color: '#9c9c9c',
            lineHeight: 'normal',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          Ask about this passage…
        </div>
        <span
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.08)',
            color: '#bbb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <Send size={14} strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}
