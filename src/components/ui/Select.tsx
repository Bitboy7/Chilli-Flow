import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = {
  label: string;
  value: string;
};

export function Select({
  ariaLabel,
  disabled = false,
  onChange,
  options,
  searchable = false,
  searchPlaceholder = "Buscar…",
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  options: SelectOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
  value: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((option) => option.value === value) ?? options[0];
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleOptions = normalizedQuery
    ? options.filter((option) => option.label.toLocaleLowerCase("es").includes(normalizedQuery))
    : options;

  const close = (restoreFocus = false) => {
    setIsOpen(false);
    setQuery("");
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const open = () => {
    if (disabled) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(Math.max(0, selectedIndex));
    setQuery("");
    setIsOpen(true);
  };

  const focusOption = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, visibleOptions.length - 1));
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  };

  const choose = (option: SelectOption) => {
    onChange(option.value);
    close(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      if (searchable) searchRef.current?.focus();
      else optionRefs.current[activeIndex]?.focus();
    });
  }, [activeIndex, isOpen, searchable]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => isOpen ? close() : open()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!isOpen) open();
          }
        }}
        className={[
          "group flex h-11 w-full items-center justify-between gap-3 rounded-xl border bg-black/20 px-3 text-left text-sm outline-none transition",
          "border-white/[0.08] text-stone-200 hover:border-orange-400/35 hover:bg-orange-400/[0.045]",
          "focus-visible:border-orange-400/60 focus-visible:ring-2 focus-visible:ring-orange-400/15",
          isOpen ? "border-orange-400/55 bg-orange-400/[0.05] ring-2 ring-orange-400/10" : "",
          disabled ? "cursor-not-allowed opacity-40" : "",
        ].join(" ")}
      >
        <span className="truncate">{selected?.label ?? "Seleccionar"}</span>
        <ChevronDown
          aria-hidden="true"
          className={[
            "size-4 shrink-0 text-stone-600 transition duration-200 group-hover:text-orange-300",
            isOpen ? "rotate-180 text-orange-300" : "",
          ].join(" ")}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-xl border border-white/[0.1] bg-[#1b1816] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)]">
          {searchable ? (
            <div className="relative mb-1.5">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-stone-600" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && visibleOptions.length) {
                    event.preventDefault();
                    focusOption(0);
                  } else if (event.key === "Enter" && visibleOptions[0]) {
                    event.preventDefault();
                    choose(visibleOptions[0]);
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    close(true);
                  }
                }}
                placeholder={searchPlaceholder}
                aria-label={"Buscar en " + ariaLabel.toLocaleLowerCase("es")}
                className="h-9 w-full rounded-lg border border-white/[0.08] bg-black/25 pl-9 pr-3 text-xs text-stone-200 outline-none placeholder:text-stone-600 focus:border-orange-400/45 focus:ring-2 focus:ring-orange-400/10"
              />
            </div>
          ) : null}

          <div id={listboxId} role="listbox" aria-label={ariaLabel} className="max-h-56 overflow-y-auto overscroll-contain">
            {visibleOptions.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  ref={(element) => { optionRefs.current[index] = element; }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => choose(option)}
                  onFocus={() => setActiveIndex(index)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusOption(index + 1);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      if (index === 0 && searchable) searchRef.current?.focus();
                      else focusOption(index - 1);
                    } else if (event.key === "Home") {
                      event.preventDefault();
                      focusOption(0);
                    } else if (event.key === "End") {
                      event.preventDefault();
                      focusOption(visibleOptions.length - 1);
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      close(true);
                    } else if (event.key === "Tab") {
                      close();
                    }
                  }}
                  className={[
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs outline-none transition",
                    "text-stone-400 hover:bg-orange-500/10 hover:text-orange-100 focus:bg-orange-500/15 focus:text-orange-100",
                    isSelected ? "bg-orange-500/[0.08] text-orange-200" : "",
                  ].join(" ")}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <Check aria-hidden="true" className="size-3.5 shrink-0 text-orange-400" /> : null}
                </button>
              );
            })}
            {visibleOptions.length === 0 ? (
              <p className="px-3 py-5 text-center text-xs text-stone-600">Sin resultados</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
