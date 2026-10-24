"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import {
  applyTheme,
  readThemePreference,
  saveThemePreference,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const ORDER: ThemePreference[] = ["system", "light", "dark"];
const OPTIONS: Record<ThemePreference, { label: string; Icon: typeof Sun }> = {
  system: { label: "System theme", Icon: Monitor },
  light: { label: "Light theme", Icon: Sun },
  dark: { label: "Dark theme", Icon: Moon },
};

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyTheme(readThemePreference());
      onChange();
    }
  };
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Cycles System → Light → Dark. System follows the device setting live. */
export function ThemeToggle({ className }: { className?: string }) {
  const preference = useSyncExternalStore(
    subscribe,
    readThemePreference,
    () => "system" as ThemePreference,
  );

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length];
  const { label, Icon } = OPTIONS[preference];

  return (
    <button
      type="button"
      onClick={() => saveThemePreference(next)}
      className={cn(
        "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-[var(--accent-ink)] transition hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        className,
      )}
      aria-label={`${label}. Switch to ${OPTIONS[next].label.toLowerCase()}`}
      title={`${label} (click for ${OPTIONS[next].label.toLowerCase()})`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
