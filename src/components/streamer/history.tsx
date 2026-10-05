"use client";

import { Clock, History as HistoryIcon, Trash2 } from "lucide-react";
import { formatBytes, type HistoryItem } from "@/lib/types";

interface HistorySectionProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

export function HistorySection({ items, onSelect, onClear }: HistorySectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="mt-12 w-full" aria-label="Recently generated streams">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <HistoryIcon className="h-4 w-4" />
          Recent streams
        </h2>
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onSelect(item)}
              className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-left transition-all hover:border-primary/35 hover:bg-accent/50"
            >
              <img
                src={item.thumbnailUrl}
                alt=""
                className="hidden h-11 w-20 shrink-0 rounded-md border border-border/60 object-cover sm:block"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(item.resolvedAt).toLocaleString()} · {formatBytes(item.size)}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Reload
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
