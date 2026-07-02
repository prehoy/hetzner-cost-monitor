import { useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";
const KEY = "hacm-theme";

export function getMode(): ThemeMode {
  return (localStorage.getItem(KEY) as ThemeMode) ?? "system";
}

export function applyMode(m: ThemeMode) {
  const root = document.documentElement;
  if (m === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", m);
  localStorage.setItem(KEY, m);
}

function resolve(m: ThemeMode): "light" | "dark" {
  if (m !== "system") return m;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Single hook for the toggle + chart theming. Re-resolves on OS scheme change.
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getMode);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(getMode()));

  useEffect(() => {
    applyMode(mode);
    setResolved(resolve(mode));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(resolve(mode));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const cycle = () => setMode((m) => (m === "system" ? "light" : m === "light" ? "dark" : "system"));
  return { mode, resolved, setMode, cycle };
}
