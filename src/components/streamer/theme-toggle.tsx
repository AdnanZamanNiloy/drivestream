"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // `resolvedTheme` is undefined during SSR — render a stable placeholder to
  // avoid hydration mismatch, without client setState-in-effect.
  if (resolvedTheme === undefined) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" className="opacity-0">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
