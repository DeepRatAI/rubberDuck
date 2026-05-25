"use client";

import { Check, ChevronDown, MonitorCog, Paintbrush } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  defaultThemeId,
  isThemeId,
  productThemes,
  type ThemeId,
} from "@/lib/themes";
import { cn } from "@/lib/utils";

const storageKey = "rubberduck-theme";
const themeChangeEvent = "rubberduck-theme-change";

function applyTheme(themeId: ThemeId) {
  document.documentElement.dataset.theme = themeId;
  document.documentElement.style.colorScheme =
    themeId === "rubberduck" ? "light" : "dark";
}

function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") {
    return defaultThemeId;
  }

  const storedTheme = window.localStorage.getItem(storageKey);
  return isThemeId(storedTheme) ? storedTheme : defaultThemeId;
}

function subscribeToThemeChanges(callback: () => void) {
  const initialSync = window.setTimeout(callback, 0);
  window.addEventListener(themeChangeEvent, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.clearTimeout(initialSync);
    window.removeEventListener(themeChangeEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeToggle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const themeId = useSyncExternalStore(
    subscribeToThemeChanges,
    getStoredTheme,
    () => defaultThemeId,
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const currentTheme =
    productThemes.find((theme) => theme.id === themeId) ?? productThemes[0];
  const CurrentIcon = currentTheme.id === "cyberduck" ? MonitorCog : Paintbrush;

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  useEffect(() => {
    const hydrationTick = window.setTimeout(() => setIsHydrated(true), 0);

    return () => window.clearTimeout(hydrationTick);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const menuWidth = 288;
      const viewportPadding = 12;
      setMenuPosition({
        top: rect.bottom + 8,
        left: Math.min(
          Math.max(viewportPadding, rect.right - menuWidth),
          window.innerWidth - menuWidth - viewportPadding,
        ),
      });
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function selectTheme(nextTheme: ThemeId) {
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(themeChangeEvent));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative z-[300]" aria-label="Theme mode">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Theme selector. Current theme: ${currentTheme.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={!isHydrated}
        title={`${currentTheme.label} by ${currentTheme.creator}. ${currentTheme.description}`}
        className="control-shell inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-xs font-semibold text-[color:var(--input-fg)] transition hover:bg-[color:var(--control-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] disabled:cursor-wait disabled:opacity-70"
        onClick={() => setOpen((value) => !value)}
      >
        <CurrentIcon className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">{currentTheme.label}</span>
        <ChevronDown className="size-3.5" aria-hidden />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Available themes"
          className="fixed z-[400] w-72 overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {productThemes.map((theme) => {
            const selected = theme.id === themeId;
            const Icon = theme.id === "cyberduck" ? MonitorCog : Paintbrush;

            return (
              <button
                key={theme.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "grid w-full grid-cols-[auto_1fr_auto] gap-3 px-3 py-3 text-left transition hover:bg-[color:var(--surface-2)]",
                  selected && "bg-[color:var(--surface-2)]",
                )}
                onClick={() => selectTheme(theme.id)}
              >
                <span className="mt-0.5 flex size-8 items-center justify-center rounded-md border border-[color:var(--line)] bg-[color:var(--badge-cyan-bg)] text-[color:var(--foreground)]">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[color:var(--foreground)]">
                    {theme.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[color:var(--muted)]">
                    by {theme.creator}
                  </span>
                  <span className="mt-2 flex gap-1">
                    {theme.palette.map((color) => (
                      <span
                        key={color}
                        className="size-3 rounded-full border border-[color:var(--line)]"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                </span>
                {selected ? (
                  <Check
                    className="mt-1 size-4 text-[color:var(--accent-2)]"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
