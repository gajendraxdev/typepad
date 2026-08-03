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
      <div className="relative px-2 pb-1">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[var(--text-faint)]">
            <IconSearch size={12} />
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
            className="ui-input !rounded-md !py-1.5 !pr-7 !pl-7 text-[12px]"
            autoComplete="off"
            spellCheck={false}
          />
          {value ? (
            <button
              type="button"
              className="ui-icon-btn absolute top-1/2 right-0.5 h-5 w-5 -translate-y-1/2"
              onClick={() => {
                onChange("");
                onClose?.();
              }}
              aria-label="Clear search"
            >
              <IconClose size={11} />
            </button>
          ) : null}
        </div>
      </div>
    );
  },
);
