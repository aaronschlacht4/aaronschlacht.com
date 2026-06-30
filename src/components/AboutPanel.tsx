import PanelHeader from './PanelHeader';

/**
 * About / Now. The "Now" block surfaces current work so the site never goes
 * stale — edit it in place. All copy is placeholder.
 */
export default function AboutPanel() {
  return (
    <div>
      <PanelHeader eyebrow="New York City" title="About / Now" hebrew="עכשיו" />

      <div className="space-y-5 text-[15px] leading-relaxed text-ink/90">
        {/* TODO: real bio */}
        <p>
          Hi, I&apos;m Aaron Schlacht — friends call me{' '}
          <span className="font-semibold text-[var(--color-accent)]">
            Big A
          </span>
          . I work at the intersection of forecasting, markets, and software.
          Currently in New York, by way of Columbia.
        </p>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-accent)]">
            Now
          </p>
          <ul className="mt-3 space-y-2 text-sm text-ink/85">
            {/* TODO: keep this list current */}
            <li>· Building a cross-platform prediction-market data pipeline.</li>
            <li>· Writing about foresight and how forecasts actually move.</li>
            <li>· Reading my way through the shelf (see the Bookshelf pin).</li>
          </ul>
        </div>

        <p className="text-sm text-ink-dim">
          {/* TODO: a line about what you're looking for / open to */}
          Open to conversations about markets, research, and good engineering.
        </p>
      </div>
    </div>
  );
}
