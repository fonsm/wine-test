import { useId, useState } from 'react';
import { formatNumber } from '../util/numbers';

/**
 * A number input that commits every valid value while typing. Incomplete input ("", "-", "1.")
 * is kept as a draft until it is a number; on blur the field shows the model value again.
 */
export function NumberField({
  label,
  value,
  step,
  min,
  max,
  describedBy,
  onCommit,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  /** Id of a hint, for example the allowed range. */
  describedBy?: string;
  onCommit: (value: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="editor-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        aria-describedby={describedBy}
        value={draft ?? formatNumber(value)}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const number = Number(text);
          if (text.trim() !== '' && Number.isFinite(number)) onCommit(number);
        }}
        onBlur={() => {
          setDraft(null);
        }}
      />
    </div>
  );
}
