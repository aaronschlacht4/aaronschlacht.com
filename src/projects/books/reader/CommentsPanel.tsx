import type { Reply, Scenario } from '../scenarios';
import { Crown } from './icons';
import * as S from './styles';

/**
 * The app's comments panel (CommentsPanel.tsx), docked over the right of the
 * desk: the draft card a selection opens, then the posted card with its quote
 * box, meta row, body and replies rail, and — when a thinker follows the book
 * — the VIP card with the gold crown avatar and the source badge. Flat
 * replies on one rail, no votes, no timestamps: that is what the panel shows.
 */

export default function CommentsPanel({
  scenario,
  mode,
  typed,
  replies,
  vipShown,
  vipRef,
}: {
  scenario: Scenario;
  mode: 'draft' | 'posted';
  /** characters of the comment typed so far, while drafting */
  typed: number;
  /** the replies revealed so far, flattened */
  replies: Reply[];
  vipShown: boolean;
  /** the VIP card, so the recording camera can find it */
  vipRef?: React.RefObject<HTMLElement | null>;
}) {
  const count = mode === 'posted' ? 1 + (vipShown && scenario.vip ? 1 : 0) : 0;
  const body = scenario.comment.slice(0, typed);

  return (
    <aside style={{ ...S.panel, width: S.PANEL_W, position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 6 }}>
      <header style={S.head}>
        <span style={{ letterSpacing: 0.3 }}>
          Comments
          <span style={{ opacity: 0.45, marginLeft: 7 }}>{count}</span>
        </span>
        <span style={S.iconButton} title="Close">
          ✕
        </span>
      </header>

      <div style={S.body_}>
        {mode === 'draft' && (
          <section style={S.draftCard}>
            <blockquote style={S.quote}>“{trim(scenario.passage, 220)}”</blockquote>

            <div
              style={{
                ...S.input,
                minHeight: `calc(3 * 1.5em + 18px)`,
                borderColor: 'rgba(255,200,120,0.55)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {body ? (
                <>
                  {body}
                  <span style={{ borderLeft: '1px solid rgba(255,232,180,0.8)', marginLeft: 1 }} />
                </>
              ) : (
                <span style={{ color: 'rgba(255,228,192,0.4)' }}>Add a comment…</span>
              )}
            </div>

            <div style={S.choiceRow}>
              <span style={S.choiceLabel}>Visible to</span>
              <Segmented options={['Everyone', 'Only me']} value={0} />
            </div>

            <div style={S.choiceRow}>
              <span style={S.choiceLabel}>Post as</span>
              <Segmented options={['Me', 'Anonymous']} value={0} />
            </div>

            <div style={S.actionRow}>
              <span style={S.hint}>⌘↵ to post · esc to cancel</span>
              <span style={S.ghostButton}>Cancel</span>
              <span style={{ ...S.primaryButton, ...(body ? null : S.disabledButton) }}>Comment</span>
            </div>
          </section>
        )}

        {mode === 'posted' && (
          <article style={S.card}>
            <span className="cp-quote" style={S.quoteButton} title="Show in the text">
              “{trim(scenario.passage, 160)}”
            </span>

            <div style={S.meta}>
              <Avatar name={scenario.by} />
              <span className="cp-who" style={{ color: '#ffe0b0' }}>
                {scenario.by}
              </span>
            </div>

            <p style={S.commentBody}>{scenario.comment}</p>

            {replies.length > 0 && (
              <div style={S.rail}>
                <div style={S.threadCount}>
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </div>
                {replies.map((r) => (
                  <div key={r.id} style={S.replyRow}>
                    <Avatar name={r.name} />
                    <div style={{ minWidth: 0 }}>
                      <div style={S.replyWho}>
                        <span className="cp-who">{r.name}</span>
                      </div>
                      <div style={S.replyText}>{r.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={S.replyLink}>{replies.length ? 'Add a reply' : 'Reply'}</div>
          </article>
        )}

        {mode === 'posted' && vipShown && scenario.vip && (
          <article ref={vipRef} style={S.card}>
            <span className="cp-quote" style={S.quoteButton} title="Show in the text">
              “{trim(scenario.passage, 160)}”
            </span>

            <div style={S.meta}>
              <Avatar name={scenario.vip.speaker} vip />
              <span className="cp-who" style={{ color: '#ffd98a' }}>
                {scenario.vip.speaker}
              </span>
              {/* A sourced comment is a verbatim excerpt from a real lecture
                  and links to it at the timestamp — quoted from them, not
                  posted by them. */}
              <a
                href={scenario.vip.source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...S.vipBadge, textDecoration: 'none', cursor: 'pointer' }}
                title={`${scenario.vip.source.title} — ${scenario.vip.source.where}`}
              >
                {scenario.vip.source.kind === 'essay' ? '✦ essay' : '▶ lecture'}
              </a>
            </div>

            <p style={S.commentBody}>{scenario.vip.text}</p>

            <div style={S.replyLink}>Reply</div>
          </article>
        )}
      </div>
    </aside>
  );
}

/** A small initial, so a thread can be scanned by who said what. */
function Avatar({ name, vip }: { name: string; vip?: boolean }) {
  // The VIP mark: the avatar IS a gold crown — no initial.
  if (vip) {
    return (
      <span
        aria-hidden
        style={{
          ...S.avatar,
          background: 'linear-gradient(160deg, rgba(255,214,130,0.5), rgba(255,178,60,0.28))',
          border: '1px solid rgba(255,214,130,0.6)',
          boxShadow: '0 0 6px rgba(255,196,90,0.35)',
        }}
      >
        <Crown size={11} strokeWidth={2} color="#ffedc4" fill="rgba(255,220,150,0.7)" />
      </span>
    );
  }
  return (
    <span aria-hidden style={{ ...S.avatar, background: 'rgba(255,200,120,0.22)' }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Segmented({ options, value }: { options: string[]; value: number }) {
  return (
    <div style={S.segmented} role="group">
      {options.map((text, i) => (
        <span
          key={text}
          style={{
            ...S.segment,
            background: value === i ? 'rgba(255,200,120,0.22)' : 'transparent',
            color: value === i ? '#ffe8c0' : 'rgba(255,228,192,0.6)',
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);
