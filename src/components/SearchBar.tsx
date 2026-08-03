import { forwardRef } from "react";
import { IconClose, IconSearch } from "./icons";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
}

export const SearchBar = forwardRef<HTMLInputElement, Props>(
  function SearchBar({ value, onChange, onClose }, ref) {
    return (
      <div className="relative px-3 pb-2">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-faint)]">
            <IconSearch size={14} />
          </span>
          <input
            ref={ref}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onChange("");
                onClose?.();
              }
            }}
            placeholder="Search notes…"
            className="ui-input !rounded-md !py-2 !pr-8 !pl-8 text-[13px]"
            autoComplete="off"
            spellCheck={false}
          />
          {value ? (
            <button
              type="button"
              className="ui-icon-btn absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2"
              onClick={() => {
                onChange("");
                onClose?.();
              }}
              aria-label="Clear search"
            >
              <IconClose size={12} />
            </button>
          ) : null}
        </div>
      </div>
    );
  },
);
