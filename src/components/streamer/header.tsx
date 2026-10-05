import { ThemeToggle } from "@/components/streamer/theme-toggle";

/** Drive Streamer brand mark — a play triangle nested in a Drive-style parallelogram. */
export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="dvs-grad" x1="8" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.78 0.16 145)" />
          <stop offset="0.5" stopColor="oklch(0.68 0.16 160)" />
          <stop offset="1" stopColor="oklch(0.62 0.15 200)" />
        </linearGradient>
      </defs>
      {/* Drive-style triangular container */}
      <path d="M17 6 L7 24 L17 42 H31 L41 24 L31 6 H17 Z" fill="url(#dvs-grad)" opacity="0.18" />
      <path
        d="M17 6 L7 24 L17 42 H31 L41 24 L31 6 H17 Z"
        stroke="url(#dvs-grad)"
        strokeWidth="2.4"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Play glyph */}
      <path d="M20 16.5 L31.5 24 L20 31.5 Z" fill="url(#dvs-grad)" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-9 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Google Drive Video Streamer
            </span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">
              Clean stream links for VLC &amp; any HTTP player
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary md:inline-flex">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
            Range / 206 seeking
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
