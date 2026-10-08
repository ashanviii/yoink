"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./icons";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeToggle() {
  // Server render can't know the theme; the button label settles after hydration.
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("yoink-theme", next ? "dark" : "light");
    } catch {
      // storage may be unavailable (private mode) — theme still applies for this visit
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="grid size-10 place-items-center rounded-full bg-surface-2 text-text transition hover:bg-border active:scale-90"
    >
      <span>
        {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      </span>
    </button>
  );
}
