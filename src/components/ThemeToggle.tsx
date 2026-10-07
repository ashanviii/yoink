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
      className="group relative grid size-10 place-items-center rounded-lg border border-border bg-surface text-text transition hover:-rotate-12 hover:border-text active:scale-90"
    >
      <span className="transition-transform duration-300 group-active:rotate-90">
        {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      </span>
    </button>
  );
}
