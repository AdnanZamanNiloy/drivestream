import { ClipboardCopy, MonitorPlay, Play, Smartphone } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardCopy,
    title: "Copy the stream URL",
    body: "Generate a link above and hit Copy. It's a clean, permanent URL — no expiring Google tokens inside.",
  },
  {
    icon: MonitorPlay,
    title: "Open VLC's network stream",
    body: "In VLC, go to Media → Open Network Stream (Ctrl+N on Windows/Linux, ⌘N on macOS). Paste the URL.",
  },
  {
    icon: Play,
    title: "Press Play — and seek freely",
    body: "Playback starts instantly. Scrubbing works because the server honors HTTP Range requests (206 Partial Content).",
  },
];

export function HowToSection() {
  return (
    <section id="how-to" className="mt-16 w-full">
      <div className="mb-7 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Play in VLC in <span className="text-gradient">three steps</span>
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Works with VLC on Windows, macOS, Linux, iOS and Android — plus mpv, IINA, and any player that accepts HTTP URLs.
        </p>
      </div>

      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <step.icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                Step {i + 1}
              </span>
            </div>
            <h3 className="mt-3.5 font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-4 text-sm">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">On mobile?</span> Tap{" "}
          <span className="font-medium text-foreground">Open in VLC</span> after generating a link — the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">vlc://</code> protocol launches the VLC
          app directly with your stream loaded.
        </p>
      </div>
    </section>
  );
}
