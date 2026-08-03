import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  fontFamily: string;
  fontSize: number;
  disabled?: boolean;
  noteKey?: string;
}

/**
 * Full-bleed note surface — never a floating/resizable form control.
 */
export function Editor({
  value,
  onChange,
  fontFamily,
  fontSize,
  disabled,
  noteKey,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (disabled) return;
    if (noteKey !== lastKey.current) {
      lastKey.current = noteKey;
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      });
    }
  }, [noteKey, disabled]);

  return (
    <div className="editor-shell">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck
        placeholder="Start writing…"
        className="editor-textarea"
        style={{
          fontFamily,
          fontSize: `${fontSize}px`,
          lineHeight: 1.7,
          letterSpacing: "-0.005em",
        }}
      />
    </div>
  );
}
