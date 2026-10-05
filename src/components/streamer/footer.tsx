import { Logo } from "@/components/streamer/header";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight">Google Drive Video Streamer</span>
        </div>

        <p className="max-w-md text-center text-xs leading-relaxed text-muted-foreground sm:text-right">
          Stream only files you own or are licensed to share. This tool proxies bytes on your behalf —
          it does not bypass Drive permissions or quotas.
        </p>
      </div>
    </footer>
  );
}
