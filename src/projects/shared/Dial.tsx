import { useId } from 'react';

/**
 * A gauge, not a pill: the track is a hairline and the handle a single mark
 * standing on it (styling in index.css under `.gauge`). The travelled part
 * of the track is coloured via --t, since a native range gives no other way.
 */
export default function Dial({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  tone,
  ends,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  tone: string;
  /** captions for the two ends of the travel */
  ends?: [string, string];
}) {
  const id = useId();
  const t = ((value - min) / (max - min)) * 100;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="truncate text-[13px] text-[#15171c]">
          {label}
          {hint && <span className="ml-2 text-[11px] text-[#9a9ea8]">{hint}</span>}
        </label>
        <output
          htmlFor={id}
          className="shrink-0 text-[13px] text-[#15171c]"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="gauge mt-1 block w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ['--gauge' as string]: tone, ['--t' as string]: `${t}%` }}
      />
      {ends && (
        <div className="flex justify-between text-[11px] text-[#9a9ea8]">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
    </div>
  );
}

/** A labelled on/off switch in the same instrument language. */
export function Toggle({
  label,
  on,
  onChange,
  tone,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  tone: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-[12px] transition"
      style={{
        borderColor: on ? tone : '#d5d1c8',
        color: on ? '#15171c' : '#7a7e88',
        background: on ? `${tone}14` : 'transparent',
      }}
    >
      <span
        className="relative h-3 w-5 rounded-full transition-colors"
        style={{ background: on ? tone : '#cfcbc2' }}
      >
        <span
          className="absolute top-[2px] h-2 w-2 rounded-full bg-white transition-transform"
          style={{ transform: on ? 'translateX(10px)' : 'translateX(2px)' }}
        />
      </span>
      {label}
    </button>
  );
}
