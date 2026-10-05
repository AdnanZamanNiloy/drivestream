"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  FileVideo,
  Gauge,
  MonitorPlay,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  containerLabel,
  formatBytes,
  isBrowserPlayable,
  type ResolveFileResponse,
} from "@/lib/types";

interface ResultCardProps {
  result: ResolveFileResponse;
  onOpenInVlc: (streamUrl: string) => void;
  onToast: (opts: { title: string; description?: string }) => void;
}

export function ResultCard({ result, onOpenInVlc, onToast }: ResultCardProps) {
  const { file, streamUrl, thumbnailUrl, resolvedAt } = result;
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playable = isBrowserPlayable(file.mimeType, file.name);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onToast({ title: `${label} copied`, description: "Ready to paste into VLC's network stream dialog." });
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      onToast({ title: "Copy failed", description: "Select the URL text and copy manually (Ctrl+C)." });
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      aria-live="polite"
      className="mt-8 w-full"
    >
      <div className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-xl shadow-primary/10">
        {/* ---- Card header ---- */}
        <div className="flex flex-wrap items-start gap-4 border-b border-border/60 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-5 sm:p-6">
          {/* Thumbnail */}
          <div className="relative hidden h-24 w-40 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted sm:block">
            <img
              src={thumbnailUrl}
              alt={`Thumbnail for ${file.name}`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/5">
              <FileVideo className="h-7 w-7 text-primary/70" />
            </div>
          </div>

          {/* Title + badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
                Stream ready
              </span>
            </div>
            <h2 className="mt-1.5 truncate text-lg font-semibold tracking-tight sm:text-xl" title={file.name}>
              {file.name}
            </h2>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full font-medium">
                {containerLabel(file.mimeType, file.name)}
              </Badge>
              <Badge variant="secondary" className="rounded-full font-medium">
                {formatBytes(file.size)}
              </Badge>
              {file.supportsRange && (
                <Badge className="rounded-full border-primary/30 bg-primary/10 font-medium text-primary hover:bg-primary/15">
                  <Gauge className="mr-1 h-3 w-3" />
                  HTTP 206 · Seekable
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* ---- Stream URL ---- */}
        <div className="p-5 sm:p-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your clean stream URL
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Stable, token-free link — works in VLC, mpv, IINA and any HTTP player.
          </p>

          <div className="mt-3 flex items-stretch gap-2">
            <div className="slim-scrollbar flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap rounded-2xl border bg-muted/60 px-4 py-3 font-mono text-sm text-foreground/90">
              {streamUrl}
            </div>
            <Button
              onClick={() => copy(streamUrl, "Stream URL")}
              variant={copied ? "default" : "secondary"}
              className={cn(
                "shrink-0 rounded-2xl px-4 font-semibold transition-all",
                copied && "bg-primary text-primary-foreground",
              )}
              aria-label="Copy stream URL"
            >
              {copied ? <Check className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>

          {/* ---- Actions ---- */}
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button
              size="lg"
              onClick={() => onOpenInVlc(streamUrl)}
              className="h-12 rounded-2xl px-6 text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40"
            >
              <PlayCircle className="h-5 w-5" />
              Open in VLC
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => copy(streamUrl, "Stream URL")}
              className="h-12 rounded-2xl px-5 text-sm font-semibold"
            >
              <Copy className="h-4.5 w-4.5" />
              Copy URL
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setPreviewOpen((v) => !v)}
              className="h-12 rounded-2xl px-5 text-sm font-semibold"
              aria-expanded={previewOpen}
            >
              <MonitorPlay className="h-4.5 w-4.5" />
              {previewOpen ? "Hide preview" : "Preview here"}
            </Button>
          </div>

          {/* ---- In-browser preview ---- */}
          {previewOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 overflow-hidden"
            >
              {previewFailed ? (
                <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/50 p-4 text-sm text-muted-foreground">
                  <MonitorPlay className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    Your browser can&apos;t decode <span className="font-medium text-foreground">{containerLabel(file.mimeType, file.name)}</span> natively.
                    No problem — click <span className="font-medium text-foreground">Copy URL</span> and open it in VLC, which handles every format.
                  </p>
                </div>
              ) : (
                <video
                  key={streamUrl}
                  controls
                  preload="metadata"
                  poster={thumbnailUrl}
                  className="aspect-video w-full rounded-2xl border border-border/60 bg-black"
                  onError={() => setPreviewFailed(true)}
                >
                  <source src={streamUrl} type={file.mimeType} />
                  Your browser does not support HTML5 video.
                </video>
              )}
              {!playable && !previewFailed && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Note: {containerLabel(file.mimeType, file.name)} rarely plays in browsers — if the preview stays blank, use VLC instead.
                </p>
              )}
            </motion.div>
          )}

          <Separator className="my-5" />

          {/* ---- Technical details ---- */}
          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Technical details
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-x-8 gap-y-2 px-2 pb-2 pt-3 text-sm sm:grid-cols-2">
              <DetailRow label="File ID" value={file.id} mono />
              <DetailRow label="MIME type" value={file.mimeType} mono />
              <DetailRow label="Total size" value={`${formatBytes(file.size)}${file.size ? ` (${file.size.toLocaleString()} bytes)` : ""}`} />
              <DetailRow label="Range requests" value={file.supportsRange ? "Supported — 206 Partial Content" : "Unknown"} />
              <DetailRow label="Resolved" value={new Date(resolvedAt).toLocaleString()} />
              <DetailRow label="Upstream tokens exposed" value="None — stripped by proxy" />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </motion.section>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-1.5 last:border-b-0 sm:border-b-0 sm:border-dashed sm:py-1">
      <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("truncate text-right text-foreground/90", mono && "font-mono text-xs")} title={value}>
        {value}
      </span>
    </div>
  );
}
