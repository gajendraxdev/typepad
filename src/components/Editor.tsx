import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import { IconClose } from "./icons";

export interface EditorHandle {
  openFind: () => void;
  closeFind: () => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  fontFamily: string;
  fontSize: number;
  disabled?: boolean;
  noteKey?: string;
}

function collectMatches(text: string, query: string): number[] {
  if (!query) return [];
  const hay = text.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle) return [];
  const out: number[] = [];
  let from = 0;
  while (from <= hay.length - needle.length) {
    const at = hay.indexOf(needle, from);
    if (at < 0) break;
    out.push(at);
    from = at + 1;
  }
  return out;
}

/**
 * Full-bleed note surface with in-note find (Ctrl+F).
 */
export const Editor = forwardRef<EditorHandle, Props>(function Editor(
  { value, onChange, fontFamily, fontSize, disabled, noteKey },
  ref,
) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const lastKey = useRef<string | undefined>(undefined);

  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  const matches = useMemo(
    () => collectMatches(value, findQuery),
    [value, findQuery],
  );

  const selectMatch = useCallback(
    (index: number, list: number[] = matches) => {
      const el = taRef.current;
      if (!el || list.length === 0 || !findQuery) return;
      const i = ((index % list.length) + list.length) % list.length;
      const start = list[i];
      const end = start + findQuery.length;
      setMatchIndex(i);
      el.focus();
      el.setSelectionRange(start, end);
      // Keep selection visible roughly in view.
      const before = el.value.slice(0, start);
      const line = before.split("\n").length;
      const lineHeight = fontSize * 1.7;
      el.scrollTop = Math.max(0, (line - 3) * lineHeight);
    },
    [findQuery, matches, fontSize],
  );

  const openFind = useCallback(() => {
    setFindOpen(true);
    const el = taRef.current;
    // Seed query from current selection when non-empty.
    if (el && el.selectionStart !== el.selectionEnd) {
      const selected = el.value.slice(el.selectionStart, el.selectionEnd);
      if (selected && !selected.includes("\n")) {
        setFindQuery(selected);
      }
    }
    requestAnimationFrame(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    });
  }, []);

  const closeFind = useCallback(() => {
    setFindOpen(false);
    requestAnimationFrame(() => taRef.current?.focus());
  }, []);

  useImperativeHandle(ref, () => ({ openFind, closeFind }), [
    openFind,
    closeFind,
  ]);

  // Focus editor when switching notes; reset find state.
  useEffect(() => {
    if (disabled) return;
    if (noteKey !== lastKey.current) {
      lastKey.current = noteKey;
      setFindOpen(false);
      setFindQuery("");
      setMatchIndex(0);
      requestAnimationFrame(() => {
        const el = taRef.current;
        if (!el) return;
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      });
    }
  }, [noteKey, disabled]);

  // When query changes, jump to first match (or keep index in range).
  useEffect(() => {
    if (!findOpen || !findQuery) return;
    if (matches.length === 0) {
      setMatchIndex(0);
      return;
    }
    const next = Math.min(matchIndex, matches.length - 1);
    selectMatch(next, matches);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on query/match list change
  }, [findQuery, matches.length, findOpen]);

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    selectMatch(matchIndex + 1);
  }, [matchIndex, matches.length, selectMatch]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    selectMatch(matchIndex - 1);
  }, [matchIndex, matches.length, selectMatch]);

  const onFindKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeFind();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) goPrev();
      else goNext();
    }
  };

  return (
    <div className="editor-shell">
      {findOpen ? (
        <div className="editor-find" role="search">
          <input
            ref={findInputRef}
            type="search"
            value={findQuery}
            onChange={(e) => {
              setFindQuery(e.target.value);
              setMatchIndex(0);
            }}
            onKeyDown={onFindKeyDown}
            placeholder="Find in note…"
            className="editor-find-input"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="editor-find-count" aria-live="polite">
            {findQuery
              ? matches.length === 0
                ? "No results"
                : `${matchIndex + 1} of ${matches.length}`
              : ""}
          </span>
          <button
            type="button"
            className="editor-find-btn"
            onClick={goPrev}
            disabled={matches.length === 0}
            title="Previous (Shift+Enter)"
            aria-label="Previous match"
          >
            ↑
          </button>
          <button
            type="button"
            className="editor-find-btn"
            onClick={goNext}
            disabled={matches.length === 0}
            title="Next (Enter)"
            aria-label="Next match"
          >
            ↓
          </button>
          <button
            type="button"
            className="editor-find-btn"
            onClick={closeFind}
            title="Close (Esc)"
            aria-label="Close find"
          >
            <IconClose size={14} />
          </button>
        </div>
      ) : null}

      <textarea
        ref={taRef}
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
          // Leave room for the find bar when open
          paddingTop: findOpen ? "3.25rem" : undefined,
        }}
      />
    </div>
  );
});
