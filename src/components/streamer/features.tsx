import { Gauge, Link2, ShieldCheck, MonitorPlay } from "lucide-react";

const FEATURES = [
  {
    icon: Link2,
    title: "Clean, stable URLs",
    body: "Google's expiring authuser / uuid / at parameters are stripped and never exposed. You get one short, permanent link that survives sessions and sharing.",
  },
  {
    icon: Gauge,
    title: "True seeking support",
    body: "Every Range request is forwarded to Drive and answered with 206 Partial Content, so jumping anywhere in a 2-hour movie starts in milliseconds.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Video bytes stream through the server proxy, not your browser's cookies. No tracking, no analytics on stream traffic, no temporary tokens in your logs.",
  },
  {
    icon: MonitorPlay,
    title: "Plays everywhere",
    body: "VLC, mpv, IINA, Kodi, browser <video> tags, even ffmpeg on the command line — if it speaks HTTP, it plays this URL.",
  },
];

export function FeaturesSection() {
  return (
    <section className="mt-16 w-full">
      <div className="mb-7 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Built for <span className="text-gradient">buffer-free</span> playback
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          A proper streaming engine, not a link shortener.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary transition-transform group-hover:scale-105">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold tracking-tight">{f.title}</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
