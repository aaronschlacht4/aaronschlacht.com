import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Reply, Scenario } from '../scenarios';
import AIChatPanel, { AI_PANEL_H, AI_PANEL_W } from './AIChatPanel';
import CommentsPanel from './CommentsPanel';
import SelectionToolbar, { TOOLBAR_W } from './SelectionToolbar';
import * as S from './styles';

/**
 * The Modern Salon's reader (BookReader.tsx), rebuilt in DOM over the demo's
 * canvas: the bar, the progress line, two paper sheets of reflowed text on a
 * near-black desk, the footer — and, as the stages advance, the selection
 * toolbar, the comments panel with its draft-card flow, the VIP card and the
 * Ask Claude card. It is laid out at the app's own size (900px wide, the
 * cell's shape) and scaled to the cell; a "recording camera" zooms toward
 * whatever is happening so the type stays legible. It is footage: nothing in
 * it takes the pointer.
 */

type MarkState = 'none' | 'selected' | 'marked';
type Anchor = { cx: number; top: number; w: number; h: number };
type Ui = {
  markState: MarkState;
  toolbar: { pressed: 'comment' | 'ask' | null } | null;
  panel: 'closed' | 'draft' | 'posted';
  typed: number;
  ai: boolean;
  zoom: 'none' | 'passage' | 'discuss' | 'ai';
};

const IDLE: Ui = { markState: 'none', toolbar: null, panel: 'closed', typed: 0, ai: false, zoom: 'none' };

const flatten = (rs: Reply[]): Reply[] => rs.flatMap((r) => [r, ...flatten(r.replies ?? [])]);

export default function ReaderShell({
  scenario,
  run,
  stage,
  vip,
  reduced,
  shown,
  words,
  cellW,
  cellH,
}: {
  scenario: Scenario;
  run: number;
  stage: number;
  vip: boolean;
  reduced: boolean;
  shown: number;
  words: number;
  cellW: number;
  cellH: number;
}) {
  const VH = Math.max(480, Math.round((S.VIRTUAL_W * cellH) / cellW));
  const cellScale = cellW / S.VIRTUAL_W;
  const shellRef = useRef<HTMLElement>(null);
  const vipRef = useRef<HTMLElement>(null);
  const [ui, setUi] = useState<Ui>(IDLE);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [vipY, setVipY] = useState<number | null>(null);

  /* ---- Sheet size: a page as large as the window allows, in the book's own
     proportions (the app's formulas, in the virtual viewport). ---- */
  const roomH = Math.max(320, VH - S.CHROME_HEIGHT);
  const roomW = Math.max(280, S.VIRTUAL_W - 120 - S.GUTTER) / 2;
  const sheetH = Math.min(roomH, roomW / scenario.aspect);
  const sheetW = sheetH * scenario.aspect;
  const padX = sheetW * 0.11;
  const padY = sheetH * 0.085;
  const padBottom = sheetH * 0.11;
  const columnW = sheetW - padX * 2;
  const columnH = sheetH - padY - padBottom;
  const fontSize = Math.max(10.5, Math.min(16, Math.sqrt((columnW * columnH) / (0.86 * scenario.charsPerPage))));
  const geometry = useMemo(
    () => ({ sheetW, sheetH, padX, padY, padBottom, columnW, columnH, fontSize }),
    [sheetW, sheetH, padX, padY, padBottom, columnW, columnH, fontSize],
  );

  const spreadW = sheetW * 2 + S.GUTTER;
  const spreadLeft = (S.VIRTUAL_W - spreadW) / 2;
  const panelOpen = ui.panel !== 'closed';
  // The app slides the spread half the panel's width to the left. In a
  // near-square window that would push the left sheet off the edge, so the
  // slide stops where the sheet still clears the frame.
  const shift = panelOpen ? Math.min(S.PANEL_W / 2, Math.max(0, spreadLeft - 8)) : 0;

  /* ---- The stage's micro-timeline ---- */
  useEffect(() => {
    if (reduced) {
      setUi({
        markState: 'marked',
        toolbar: null,
        panel: 'posted',
        typed: scenario.comment.length,
        ai: stage >= 6,
        zoom: 'discuss',
      });
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    };
    const patch = (p: Partial<Ui>) => setUi((u) => ({ ...u, ...p }));

    switch (stage) {
      case 2:
        setUi(IDLE);
        break;
      case 3: {
        patch({ markState: 'selected', toolbar: { pressed: null }, zoom: 'passage' });
        at(500, () => patch({ toolbar: { pressed: 'comment' } }));
        at(700, () => patch({ toolbar: null, panel: 'draft', zoom: 'discuss' }));
        const len = scenario.comment.length;
        const start = 1000;
        const span = 600;
        const t0 = performance.now();
        const tick = window.setInterval(() => {
          if (cancelled) return;
          const t = performance.now() - t0 - start;
          if (t < 0) return;
          const n = Math.min(len, Math.ceil((t / span) * len));
          patch({ typed: n });
          if (n >= len) clearInterval(tick);
        }, 16);
        timers.push(tick);
        break;
      }
      case 4:
        patch({ toolbar: null, panel: 'posted', markState: 'marked', typed: scenario.comment.length, zoom: 'discuss' });
        break;
      case 6:
        patch({ toolbar: { pressed: null } });
        at(400, () => patch({ toolbar: { pressed: 'ask' } }));
        at(600, () => patch({ toolbar: null, ai: true, zoom: 'ai' }));
        break;
      case 7:
        patch({ toolbar: null, ai: false, zoom: 'none' });
        break;
      default:
        break;
    }
    return () => {
      cancelled = true;
      timers.forEach((id) => {
        clearTimeout(id);
        clearInterval(id);
      });
    };
  }, [stage, run, reduced, scenario]);

  /* ---- Where the recording camera looks ---- */
  const aiLeft = anchor ? Math.max(8, Math.min(anchor.cx - AI_PANEL_W / 2, S.VIRTUAL_W - AI_PANEL_W - 8)) : 8;
  const aiTop = anchor ? Math.max(8, anchor.top - AI_PANEL_H - 8) : 8;
  const toolbarLeft = anchor ? Math.max(8, Math.min(anchor.cx - TOOLBAR_W / 2, S.VIRTUAL_W - TOOLBAR_W - 8)) : 8;
  const toolbarTop = anchor ? Math.max(8, anchor.top - 52) : 8;
  const arrowX = anchor ? Math.max(14, Math.min(anchor.cx - toolbarLeft, TOOLBAR_W - 14)) : TOOLBAR_W / 2;

  const page = scenario.page;
  const progress = Math.round(((page + 1) / scenario.total) * 100);
  const subtitle = [surname(scenario.author), meaningfulChapter(scenario.chapter, scenario.title)].filter(Boolean).join(' · ');
  const replies = useMemo(() => flatten(scenario.replies).slice(0, shown), [scenario, shown]);
  const answer = useMemo(() => scenario.answer.split(' ').slice(0, words).join(' '), [scenario, words]);
  const vipShown = Boolean(scenario.vip) && vip && stage >= 5;

  // Where the VIP card landed in the panel, so the camera can drop to it —
  // scrolling the panel first if the card runs past its foot, as a reader would.
  useLayoutEffect(() => {
    const card = vipRef.current;
    const shell = shellRef.current;
    if (!card || !shell || !vipShown) {
      setVipY(null);
      return;
    }
    const body = card.parentElement;
    let scrolled = 0;
    if (body) {
      const overrun = card.offsetTop + card.offsetHeight + 10 - body.clientHeight;
      if (overrun > body.scrollTop) {
        scrolled = overrun - body.scrollTop;
        body.scrollTo({ top: overrun, behavior: reduced ? 'auto' : 'smooth' });
      }
    }
    const scale = shell.getBoundingClientRect().width / S.VIRTUAL_W;
    const shellTop = shell.getBoundingClientRect().top;
    const rect = card.getBoundingClientRect();
    setVipY((rect.top + rect.height / 2 - shellTop) / scale - scrolled);
  }, [vipShown, ui.panel, replies.length, reduced]);

  let z = 1;
  let P = { x: S.VIRTUAL_W / 2, y: VH / 2 };
  if (anchor) {
    const mid = anchor.top + anchor.h / 2;
    if (ui.zoom === 'passage') {
      z = 1.9;
      P = { x: anchor.cx, y: mid - 40 };
    } else if (ui.zoom === 'discuss') {
      // The panel whole and the marked passage beside it; at stage 5 the
      // view drops to the VIP card.
      z = 1.2;
      const y = stage === 5 && vipY !== null ? vipY : (mid + 58 + 250) / 2;
      P = { x: S.VIRTUAL_W, y };
    } else if (ui.zoom === 'ai') {
      z = 1.4;
      P = { x: aiLeft + AI_PANEL_W / 2, y: aiTop + AI_PANEL_H / 2 + 40 };
    }
  }
  const tx = Math.max(S.VIRTUAL_W * (1 - z), Math.min(0, S.VIRTUAL_W / 2 - P.x * z));
  const ty = Math.max(VH * (1 - z), Math.min(0, VH / 2 - P.y * z));

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: S.VIRTUAL_W,
        height: VH,
        transform: `scale(${cellScale})`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
        userSelect: 'none',
        overflow: 'hidden',
        background: '#100a03',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${tx}px, ${ty}px) scale(${z})`,
          transformOrigin: '0 0',
          transition: reduced ? 'none' : 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <main ref={shellRef} style={S.shell}>
          <style>{`
            @keyframes leafInRight { from { opacity: 0; transform: translateX(58px); }
                                     to   { opacity: 1; transform: none; } }
          `}</style>

          <header style={S.bar}>
            <a className="rdr-item" style={S.barItem} title="Back to the library">
              <svg
                aria-hidden
                width="18"
                height="12"
                viewBox="0 0 36 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.75, position: 'relative', top: '0.113em' }}
              >
                <path d="M31 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
              Library
            </a>

            <div style={S.titleBlock}>
              <span style={S.barTitle}>{scenario.title}</span>
              {subtitle && <span style={S.barSub}>{subtitle}</span>}
            </div>

            <div style={S.barRight}>
              <span role="switch" aria-checked style={S.toggleTrack} title="Two pages">
                <span aria-hidden style={{ ...S.toggleKnob, transform: `translateX(${S.TOGGLE_HALF}px)` }} />
                <span style={{ ...S.toggleFace, color: 'rgba(255,228,192,0.55)' }}>1</span>
                <span style={{ ...S.toggleFace, color: '#241703' }}>2</span>
              </span>
              <span className="rdr-item" style={S.barItem}>
                Contents
              </span>
              <span className="rdr-item" style={{ ...S.barItem, color: panelOpen ? '#ffe8c0' : 'rgba(255,228,192,0.72)' }}>
                Comments
              </span>
            </div>
          </header>

          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${progress}%` }} />
          </div>

          <div style={{ position: 'relative', display: 'flex', flex: 1, minHeight: 0 }}>
            <div style={S.desk}>
              <div
                style={{
                  display: 'flex',
                  gap: S.GUTTER,
                  alignItems: 'flex-start',
                  transform: `translateX(${-shift}px)`,
                  transition: reduced ? 'none' : 'transform 220ms ease-out',
                }}
              >
                <Spread
                  key={`${scenario.bookId}-${run}`}
                  scenario={scenario}
                  geometry={geometry}
                  markState={ui.markState}
                  reduced={reduced}
                  shellRef={shellRef}
                  onAnchor={setAnchor}
                />
              </div>
            </div>

            {panelOpen && (
              <CommentsPanel
                scenario={scenario}
                mode={ui.panel === 'draft' ? 'draft' : 'posted'}
                typed={ui.typed}
                replies={replies}
                vipShown={vipShown}
                vipRef={vipRef}
              />
            )}
          </div>

          <footer style={S.footer}>
            <span style={S.stepButton}>‹ Back</span>
            <span style={S.counter}>
              {page}–{page + 1} of {scenario.total}
            </span>
            <span style={S.stepButton}>Next ›</span>
          </footer>

          {ui.toolbar && anchor && (
            <SelectionToolbar left={toolbarLeft} top={toolbarTop} arrowX={arrowX} pressed={ui.toolbar.pressed} />
          )}

          {ui.ai && anchor && (
            <AIChatPanel left={aiLeft} top={aiTop} selectedText={scenario.passage} ask={scenario.ask} answer={answer} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ---- The two sheets, filled by measurement ----
 * The app reflows the whole book into sheets of its own; the demo has three
 * source pages of text and one passage to land on the left sheet, so the
 * text is poured in and clipped where the column ends — on a line boundary,
 * the way a sheet in the app ends — with the overflow continuing on the
 * right sheet. Lead-in paragraphs are dropped until the passage sits in the
 * lower-middle of the left column. */

type Geometry = {
  sheetW: number;
  sheetH: number;
  padX: number;
  padY: number;
  padBottom: number;
  columnW: number;
  columnH: number;
  fontSize: number;
};

type Fill = {
  k: number;
  passes: number;
  clip1?: { i: number; h: number };
  clip2?: { i: number; h: number };
};

const Spread = memo(function Spread({
  scenario,
  geometry,
  markState,
  reduced,
  shellRef,
  onAnchor,
}: {
  scenario: Scenario;
  geometry: Geometry;
  markState: MarkState;
  reduced: boolean;
  shellRef: React.RefObject<HTMLElement | null>;
  onAnchor: (a: Anchor | null) => void;
}) {
  const { sheetW, sheetH, padX, padY, padBottom, columnW, columnH, fontSize } = geometry;
  const lineH = fontSize * 1.72;
  const col1 = useRef<HTMLDivElement>(null);
  const col2 = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLElement>(null);
  const [fill, setFill] = useState<Fill>({ k: scenario.left.length, passes: 0 });

  useEffect(() => {
    setFill({ k: scenario.left.length, passes: 0 });
  }, [scenario, geometry]);

  const passageIn = scenario.right.findIndex((p) => p.includes(scenario.passage));
  const stream = useMemo(
    () => [...scenario.left.slice(scenario.left.length - fill.k), ...scenario.right, ...scenario.after],
    [scenario, fill.k],
  );
  const passageIndex = fill.k + Math.max(0, passageIn);

  /** Where a column overflows: the first paragraph past the bottom, and how many whole lines of it fit. */
  const clipOf = (col: HTMLDivElement, limit: number) => {
    const ps = [...col.children] as HTMLElement[];
    for (let i = 0; i < ps.length; i++) {
      const top = ps[i].offsetTop;
      const bottom = top + ps[i].offsetHeight;
      if (bottom > limit + 0.5) {
        const lines = Math.max(0, Math.floor((limit - top) / lineH));
        return { i, h: lines * lineH };
      }
    }
    return null;
  };

  useLayoutEffect(() => {
    const c1 = col1.current;
    const c2 = col2.current;
    const mark = markRef.current;
    const shell = shellRef.current;
    if (!c1 || !c2 || !shell) return;

    if (!fill.clip1) {
      const clip1 = clipOf(c1, columnH) ?? { i: stream.length, h: 0 };
      // Is the passage where a reader would want it — on the left sheet,
      // in the lower-middle of the column? Otherwise drop a lead-in.
      if (mark) {
        const scale = c1.getBoundingClientRect().width / columnW;
        const rect = mark.getBoundingClientRect();
        const colRect = c1.getBoundingClientRect();
        const top = (rect.top - colRect.top) / scale;
        const bottom = (rect.bottom - colRect.top) / scale;
        const visible = passageIndex < clip1.i || (passageIndex === clip1.i && bottom <= (c1.children[clip1.i] as HTMLElement).offsetTop + clip1.h + 0.5);
        const frac = top / columnH;
        if ((!visible || frac > 0.72) && fill.k > 0 && fill.passes < 3) {
          setFill({ k: fill.k - 1, passes: fill.passes + 1 });
          return;
        }
        if (!visible && fill.k > 0) {
          setFill({ k: 0, passes: fill.passes + 1 });
          return;
        }
      }
      setFill((f) => ({ ...f, clip1 }));
      return;
    }
    if (!fill.clip2) {
      const clip2 = clipOf(c2, columnH) ?? { i: stream.length, h: 0 };
      setFill((f) => ({ ...f, clip2 }));
      return;
    }
    if (mark) {
      const shellRect = shell.getBoundingClientRect();
      const scale = shellRect.width / S.VIRTUAL_W;
      const rect = mark.getBoundingClientRect();
      onAnchor({
        cx: (rect.left + rect.width / 2 - shellRect.left) / scale,
        top: (rect.top - shellRect.top) / scale,
        w: rect.width / scale,
        h: rect.height / scale,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fill, stream, columnH, columnW, passageIndex]);

  const para = (text: string, i: number, clip: { i: number; h: number } | undefined, second: boolean) => {
    const style: React.CSSProperties = { ...S.paragraph };
    if (clip && i === clip.i) {
      style.height = clip.h;
      style.overflow = 'hidden';
      style.marginBottom = 0;
    }
    const inner = i === passageIndex ? withMark(text, scenario.passage, markState, second ? null : markRef) : text;
    return (
      <p key={i} style={style}>
        {inner}
      </p>
    );
  };

  const sheetStyle = (i: number): React.CSSProperties => ({
    ...S.sheet,
    width: sheetW,
    height: sheetH,
    padding: `${padY}px ${padX}px ${padBottom}px`,
    fontSize,
    animation: reduced ? 'none' : 'leafInRight 260ms ease-out both',
    animationDelay: `${i * 55}ms`,
  });

  // The right sheet starts with what the left clipped: the same paragraph,
  // pulled up by exactly the height already shown, at the same width and
  // type, so it breaks on the same words.
  const from = fill.clip1?.i ?? stream.length;
  const carried = fill.clip1 && from < stream.length ? fill.clip1.h : 0;

  return (
    <>
      <section data-page={scenario.page} style={sheetStyle(0)}>
        <div ref={col1} style={{ position: 'relative', height: columnH }}>
          {stream.map((t, i) => (i <= (fill.clip1?.i ?? Infinity) ? para(t, i, fill.clip1, false) : null))}
        </div>
        <span aria-hidden style={S.folio}>
          {scenario.page}
        </span>
      </section>
      <section data-page={scenario.page + 1} style={sheetStyle(1)}>
        <div ref={col2} style={{ position: 'relative', height: columnH }}>
          {stream.map((t, i) => {
            if (i < from) return null;
            const local = i - from;
            if (fill.clip2 && local > fill.clip2.i) return null;
            const clip = fill.clip2 ? { i: fill.clip2.i + from, h: fill.clip2.h } : undefined;
            if (i === from && carried > 0) {
              return (
                <div key={i} style={{ overflow: 'hidden', marginBottom: '1.1em' }}>
                  <p style={{ ...S.paragraph, marginTop: -carried, marginBottom: 0 }}>
                    {i === passageIndex ? withMark(t, scenario.passage, markState, null) : t}
                  </p>
                </div>
              );
            }
            return para(t, i, clip, true);
          })}
        </div>
        <span aria-hidden style={S.folio}>
          {scenario.page + 1}
        </span>
      </section>
    </>
  );
});

/** The app's withMarks, for the one passage the demo marks. */
function withMark(text: string, passage: string, state: MarkState, ref: React.RefObject<HTMLElement | null> | null) {
  const at = text.indexOf(passage);
  if (at < 0) return text;
  const style: React.CSSProperties =
    state === 'marked' ? S.markStyle : state === 'selected' ? S.selectionStyle : { background: 'transparent', color: 'inherit' };
  return (
    <>
      {text.slice(0, at)}
      <mark ref={ref ?? undefined} style={style}>
        {passage}
      </mark>
      {text.slice(at + passage.length)}
    </>
  );
}

/** "Mary Shelley" → "Shelley". A shelf goes by surnames. */
function surname(author?: string | null) {
  const parts = (author ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/** A chapter heading that merely repeats the title tells the reader nothing. */
function meaningfulChapter(chapter: string | null, title: string) {
  if (!chapter) return '';
  const plain = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const c = plain(chapter);
  const t = plain(title);
  if (!c || c === t || t.includes(c) || c.includes(t)) return '';
  return chapter;
}
