/**
 * The Modern Salon reader's styles, verbatim from the app's BookReader.tsx and
 * CommentsPanel.tsx (every value is an inline style object there too). The
 * reader is laid out at a fixed virtual width and scaled to the demo's cell,
 * so these are the app's real pixel values, not approximations.
 */

export const VIRTUAL_W = 900;
export const PANEL_W = 340;
/** Room taken by the bar, the progress line and the breathing space around a sheet. */
export const CHROME_HEIGHT = 162;
export const GUTTER = 26;

export const PAPER = '#f6efe2';
export const INK = '#231d15';
export const UI_FONT = 'ui-sans-serif, system-ui, "Segoe UI", -apple-system, sans-serif';
export const UI_SIZE = 14;
export const BOOK_FONT = 'Georgia, "Iowan Old Style", "Times New Roman", serif';

/* ---- BookReader ---- */

export const shell: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  background: '#100a03',
};

export const bar: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 56,
  padding: '0 12px',
  background: 'rgba(20,13,4,0.97)',
  borderBottom: '1px solid rgba(255,218,150,0.16)',
  fontFamily: UI_FONT,
  fontSize: UI_SIZE,
  zIndex: 3,
  flexShrink: 0,
};

export const barRight: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

export const barItem: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 32,
  padding: '0 13px',
  background: 'none',
  border: 'none',
  borderRadius: 7,
  color: 'rgba(255,228,192,0.72)',
  cursor: 'pointer',
  fontFamily: UI_FONT,
  fontSize: UI_SIZE,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  transition: 'background 140ms, color 140ms',
};

export const titleBlock: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'baseline',
  gap: 9,
  maxWidth: '44%',
  pointerEvents: 'none',
};

export const barTitle: React.CSSProperties = {
  color: '#ffe8c0',
  fontFamily: UI_FONT,
  fontSize: 18,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const barSub: React.CSSProperties = {
  color: 'rgba(255,220,160,0.55)',
  fontFamily: UI_FONT,
  fontSize: 15,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const TOGGLE_HALF = 27;
export const TOGGLE_INSET = 2;

export const toggleTrack: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'stretch',
  boxSizing: 'border-box',
  width: TOGGLE_HALF * 2 + TOGGLE_INSET * 2 + 2,
  height: 28,
  padding: TOGGLE_INSET,
  border: '1px solid rgba(255,218,150,0.22)',
  borderRadius: 999,
  background: 'rgba(255,228,192,0.05)',
  cursor: 'pointer',
};

export const toggleKnob: React.CSSProperties = {
  position: 'absolute',
  left: TOGGLE_INSET,
  top: TOGGLE_INSET,
  width: TOGGLE_HALF,
  bottom: TOGGLE_INSET,
  borderRadius: 999,
  background: 'rgba(255,200,120,0.9)',
  transition: 'transform 160ms ease-out',
};

export const toggleFace: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: UI_FONT,
  fontSize: UI_SIZE,
  fontWeight: 600,
  lineHeight: 1,
  transition: 'color 160ms',
};

export const progressTrack: React.CSSProperties = {
  height: 2,
  background: 'rgba(255,218,150,0.12)',
  zIndex: 3,
  flexShrink: 0,
};

export const progressFill: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, rgba(255,190,90,0.7), rgba(255,225,170,0.95))',
  transition: 'width 200ms ease-out',
};

export const desk: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  cursor: 'text',
};

export const sheet: React.CSSProperties = {
  position: 'relative',
  boxSizing: 'border-box',
  background: PAPER,
  color: INK,
  borderRadius: 3,
  boxShadow: '0 18px 50px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.35)',
  fontFamily: BOOK_FONT,
  lineHeight: 1.72,
  overflow: 'hidden',
};

export const paragraph: React.CSSProperties = {
  margin: '0 0 1.1em',
  textAlign: 'justify',
  hyphens: 'auto',
  overflowWrap: 'anywhere',
};

export const folio: React.CSSProperties = {
  position: 'absolute',
  bottom: 18,
  left: 0,
  right: 0,
  textAlign: 'center',
  fontFamily: 'system-ui',
  fontSize: 10.5,
  opacity: 0.34,
  userSelect: 'none',
};

export const footer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 18,
  padding: '10px 20px 16px',
  zIndex: 3,
  flexShrink: 0,
};

export const stepButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  padding: '0 16px',
  background: 'rgba(255,228,192,0.05)',
  border: '1px solid rgba(255,218,150,0.2)',
  borderRadius: 7,
  color: '#ffe8c0',
  cursor: 'pointer',
  fontFamily: UI_FONT,
  fontSize: UI_SIZE,
  whiteSpace: 'nowrap',
};

export const counter: React.CSSProperties = {
  color: 'rgba(255,220,160,0.6)',
  fontFamily: UI_FONT,
  fontSize: UI_SIZE,
  minWidth: 110,
  textAlign: 'center',
};

/** A commented passage: the app's `withMarks` mark. */
export const markStyle: React.CSSProperties = {
  background: '#ffd97a',
  color: 'inherit',
  borderRadius: 2,
  padding: '0 1px',
  cursor: 'pointer',
  borderBottom: '2px solid rgba(90,50,10,0.55)',
  boxDecorationBreak: 'clone',
  WebkitBoxDecorationBreak: 'clone',
};

/** Stand-in for the browser's own selection, which the demo can't drive. */
export const selectionStyle: React.CSSProperties = {
  background: '#b4d5fe',
  color: 'inherit',
  boxDecorationBreak: 'clone',
  WebkitBoxDecorationBreak: 'clone',
};

/* ---- CommentsPanel ---- */

export const panel: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  height: '100%',
  background: 'rgba(24,16,6,0.98)',
  borderLeft: '1px solid rgba(255,218,150,0.18)',
  color: '#ffe8c0',
  fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", -apple-system, "Helvetica Neue", sans-serif',
  fontSize: 12.5,
};

export const head: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderBottom: '1px solid rgba(255,218,150,0.16)',
  textTransform: 'uppercase',
  fontSize: 11,
  letterSpacing: 0.6,
  color: 'rgba(255,220,160,0.6)',
};

export const body_: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

export const card: React.CSSProperties = {
  background: 'rgba(255,232,180,0.05)',
  border: '1px solid rgba(255,218,150,0.16)',
  borderRadius: 8,
  padding: '11px 12px',
};

export const draftCard: React.CSSProperties = {
  ...card,
  borderColor: 'rgba(255,200,120,0.42)',
  background: 'rgba(255,200,120,0.09)',
};

export const quote: React.CSSProperties = {
  background: 'rgba(255,200,120,0.06)',
  border: '1px solid rgba(255,208,140,0.16)',
  borderLeft: '2px solid rgba(255,190,90,0.55)',
  borderRadius: 6,
  padding: '8px 10px',
  margin: '0 0 9px',
  color: 'rgba(255,228,190,0.8)',
  fontFamily: BOOK_FONT,
  fontStyle: 'italic',
  fontSize: 12,
  lineHeight: 1.55,
};

export const quoteButton: React.CSSProperties = {
  ...quote,
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'background 110ms ease, border-color 110ms ease',
};

export const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(10,6,2,0.6)',
  border: '1px solid rgba(255,218,150,0.24)',
  borderRadius: 5,
  color: '#ffe8c0',
  fontFamily: 'inherit',
  fontSize: 12.5,
  lineHeight: 1.5,
  padding: '9px 10px',
  resize: 'none',
  outline: 'none',
  transition: 'border-color 140ms',
};

export const segmented: React.CSSProperties = {
  display: 'flex',
  flexShrink: 0,
  border: '1px solid rgba(255,218,150,0.24)',
  borderRadius: 999,
  overflow: 'hidden',
};

export const segment: React.CSSProperties = {
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 11,
  padding: '4px 10px',
  whiteSpace: 'nowrap',
};

export const choiceRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 9,
};

export const choiceLabel: React.CSSProperties = {
  width: 62,
  flexShrink: 0,
  color: 'rgba(255,220,160,0.5)',
  fontSize: 11,
};

export const actionRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 14,
};

export const disabledButton: React.CSSProperties = {
  background: 'rgba(255,228,192,0.08)',
  border: '1px solid rgba(255,218,150,0.16)',
  color: 'rgba(255,228,192,0.35)',
  cursor: 'not-allowed',
};

export const primaryButton: React.CSSProperties = {
  background: 'rgba(255,200,120,0.9)',
  border: '1px solid rgba(255,225,170,0.9)',
  borderRadius: 5,
  color: '#241703',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  padding: '5px 12px',
};

export const ghostButton: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,218,150,0.26)',
  borderRadius: 5,
  color: '#ffe8c0',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12,
  padding: '5px 10px',
};

export const iconButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,220,160,0.65)',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1,
  padding: 2,
};

export const meta: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 11,
  color: 'rgba(255,220,160,0.5)',
  marginBottom: 5,
};

export const vipBadge: React.CSSProperties = {
  border: '1px solid rgba(255,196,90,0.55)',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
  padding: '1px 6px',
  color: '#ffd98a',
  background: 'rgba(255,196,90,0.12)',
  textTransform: 'uppercase',
};

export const commentBody: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,236,206,0.92)',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
};

export const rail: React.CSSProperties = {
  marginTop: 10,
  marginLeft: 4,
  paddingLeft: 11,
  borderLeft: '2px solid rgba(255,200,120,0.28)',
};

export const threadCount: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: 'rgba(255,220,160,0.45)',
  marginBottom: 7,
};

export const replyRow: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-start',
  marginBottom: 9,
};

export const replyWho: React.CSSProperties = {
  color: 'rgba(255,214,150,0.85)',
  fontSize: 11,
  marginBottom: 2,
};

export const replyText: React.CSSProperties = {
  color: 'rgba(255,236,206,0.9)',
  fontSize: 12,
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
};

export const avatar: React.CSSProperties = {
  flexShrink: 0,
  width: 20,
  height: 20,
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10.5,
  fontWeight: 600,
  color: '#ffe8c0',
};

export const replyLink: React.CSSProperties = {
  marginTop: 8,
  background: 'none',
  border: 'none',
  color: 'rgba(255,200,120,0.85)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 11.5,
  padding: 0,
};

export const hint: React.CSSProperties = {
  flex: 1,
  fontSize: 10.5,
  color: 'rgba(255,220,160,0.38)',
};
