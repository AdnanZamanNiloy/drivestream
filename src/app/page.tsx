"use client";

import { useCallback, useEffect, useState } from "react";
import { Github, LinkIcon, Radio, ShieldCheck, Zap } from "lucide-react";
import { Header } from "@/components/streamer/header";
import { UrlForm } from "@/components/streamer/url-form";
import { ResultCard } from "@/components/streamer/result-card";
import { FolderCard } from "@/components/streamer/folder-card";
import { HowToSection } from "@/components/streamer/how-to";
import { FeaturesSection } from "@/components/streamer/features";
import { HistorySection } from "@/components/streamer/history";
import { Footer } from "@/components/streamer/footer";
import { useToast } from "@/hooks/use-toast";
import {
  HISTORY_KEY,
  HISTORY_MAX,
  type HistoryItem,
  type ResolveError,
  type ResolveFileResponse,
  type ResolveFolderResponse,
  type ResolveResponse,
} from "@/lib/types";

const TRUST_CHIPS = [
  { icon: Zap, label: "HTTP Range · 206 seeking" },
  { icon: ShieldCheck, label: "No expiring Google tokens" },
  { icon: Radio, label: "Direct byte-stream proxy" },
  { icon: LinkIcon, label: "One clean permanent URL" },
];

export default function Home() {
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ResolveError | null>(null);
  const [fileResult, setFileResult] = useState<ResolveFileResponse | null>(null);
  const [folderResult, setFolderResult] = useState<ResolveFolderResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history once on mount (client-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as HistoryItem[]);
    } catch {
      /* corrupted storage — ignore */
    }
  }, []);

  const persistHistory = useCallback((items: HistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch {
      /* storage full / private mode — ignore */
    }
  }, []);

  const resolve = useCallback(
    async (inputUrl: string) => {
      const target = inputUrl.trim();
      if (!target || loading) return;

      setLoading(true);
      setError(null);
      setFileResult(null);
      setFolderResult(null);

      try {
        const res = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: target }),
        });
        const data = (await res.json()) as ResolveResponse | { ok: false; error: ResolveError };

        if (!data.ok) {
          setError(data.error);
          return;
        }

        if (data.type === "file") {
          // Rebuild absolute URLs from the browser's own origin — this is the
          // address VLC will actually connect to, and the only source of truth
          // that survives every proxy/gateway chain.
          const origin = window.location.origin;
          data.streamUrl = `${origin}/api/stream/${data.file.id}`;
          data.thumbnailUrl = `${origin}/api/thumbnail/${data.file.id}`;
          setFileResult(data);
          // Push into history (dedup by id, newest first, capped).
          const entry: HistoryItem = {
            id: data.file.id,
            name: data.file.name,
            size: data.file.size,
            mimeType: data.file.mimeType,
            streamUrl: data.streamUrl,
            thumbnailUrl: data.thumbnailUrl,
            resolvedAt: data.resolvedAt,
          };
          persistHistory([entry, ...history.filter((h) => h.id !== entry.id)].slice(0, HISTORY_MAX));
        } else {
          const origin = window.location.origin;
          for (const f of data.files) f.streamUrl = `${origin}/api/stream/${f.id}`;
          setFolderResult(data);
        }
      } catch {
        setError({
          code: "NETWORK",
          message: "Could not reach the server. Check your connection and try again.",
        });
      } finally {
        setLoading(false);
      }
    },
    [loading, history, persistHistory],
  );

  const openInVlc = useCallback(
    (streamUrl: string) => {
      window.location.href = `vlc://${streamUrl}`;
      toast({
        title: "Launching VLC…",
        description: "If nothing happened, use Media → Open Network Stream (Ctrl+N) and paste the URL instead.",
      });
    },
    [toast],
  );

  const selectHistory = useCallback(
    (item: HistoryItem) => {
      setUrl(item.streamUrl);
      setFileResult({
        ok: true,
        type: "file",
        file: {
          id: item.id,
          name: item.name,
          size: item.size,
          mimeType: item.mimeType,
          supportsRange: true,
        },
        streamUrl: item.streamUrl,
        vlcUrl: `vlc://${item.streamUrl}`,
        thumbnailUrl: item.thumbnailUrl,
        resolvedAt: item.resolvedAt,
      });
      setError(null);
      setFolderResult(null);
      // Scroll the result into view on mobile.
      window.setTimeout(() => document.getElementById("generator")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    },
    [],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* ================= HERO + GENERATOR ================= */}
        <section id="generator" className="pb-10 pt-14 sm:pt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                <Zap className="h-3.5 w-3.5" />
                Stable VLC-ready links with HTTP Range support
              </div>

              <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
                Google Drive videos,
                <br />
                streamed <span className="text-gradient">straight into VLC</span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Paste any Drive share link and get a clean, token-free stream URL. Seek anywhere instantly —
                the proxy speaks native HTTP <span className="font-mono text-sm">206 Partial Content</span>.
              </p>

              {/* Trust chips */}
              <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {TRUST_CHIPS.map((chip) => (
                  <li
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    <chip.icon className="h-3.5 w-3.5 text-primary" />
                    {chip.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* The generator card */}
            <div className="mx-auto mt-10 max-w-3xl">
              <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-lg shadow-black/5 sm:p-6">
                <UrlForm
                  url={url}
                  onUrlChange={setUrl}
                  onSubmit={() => resolve(url)}
                  loading={loading}
                  error={error}
                  onDismissError={() => setError(null)}
                />

                {loading && (
                  <div className="mt-4 space-y-2.5" aria-busy="true" aria-label="Resolving stream link">
                    <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
                    <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
                    <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
                  </div>
                )}

                {fileResult && (
                  <ResultCard result={fileResult} onOpenInVlc={openInVlc} onToast={toast} />
                )}

                {folderResult && (
                  <FolderCard
                    result={folderResult}
                    onSelectFile={(streamUrl) => {
                      setUrl(streamUrl);
                      void resolve(streamUrl);
                    }}
                  />
                )}
              </div>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Works with files shared as &ldquo;Anyone with the link&rdquo;. Nothing is uploaded or re-encoded —
                bytes are proxied on the fly.
              </p>
            </div>
          </div>
        </section>

        {/* ================= SECTIONS ================= */}
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <HistorySection
            items={history}
            onSelect={selectHistory}
            onClear={() => persistHistory([])}
          />

          <HowToSection />
          <FeaturesSection />
        </div>
      </main>

      <Footer />
    </div>
  );
}
