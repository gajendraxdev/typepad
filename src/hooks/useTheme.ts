import { useCallback, useEffect, useState } from "react";
import type { ThemeMode } from "../types";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveDark(theme: ThemeMode): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return systemPrefersDark();
}

export function useTheme(theme: ThemeMode) {
  const [isDark, setIsDark] = useState(() => resolveDark(theme));

  const apply = useCallback((mode: ThemeMode) => {
    const dark = resolveDark(mode);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    apply(theme);
  }, [theme, apply]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, apply]);

  return { isDark };
}
