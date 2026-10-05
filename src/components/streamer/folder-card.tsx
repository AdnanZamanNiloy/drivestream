"use client";

import { motion } from "framer-motion";
import { FolderOpen, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { containerLabel, formatBytes, type ResolveFolderResponse } from "@/lib/types";

interface FolderCardProps {
  result: ResolveFolderResponse;
  onSelectFile: (streamUrl: string) => void;
}

/** Rendered when a folder link is pasted and GOOGLE_API_KEY folder listing is enabled. */
export function FolderCard({ result, onSelectFile }: FolderCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 w-full"
      aria-live="polite"
    >
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl">
        <div className="flex items-center gap-3 border-b border-border/60 bg-primary/8 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FolderOpen className="h-5.5 w-5.5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Folder contents</h2>
            <p className="text-sm text-muted-foreground">
              {result.files.length} file{result.files.length === 1 ? "" : "s"} — pick one to generate its stream link.
            </p>
          </div>
        </div>

        <ul className="max-h-96 overflow-y-auto slim-scrollbar p-3">
          {result.files.map((f) => (
            <li key={f.id}>
              <div className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-accent/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full text-[10px] font-medium">
                      {containerLabel(f.mimeType, f.name)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 shrink-0 rounded-xl px-3.5 opacity-90 transition-opacity group-hover:opacity-100"
                  onClick={() => onSelectFile(f.streamUrl)}
                >
                  <Play className="h-3.5 w-3.5" />
                  Stream link
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
