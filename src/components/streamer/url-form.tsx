"use client";

import { Link2, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { ResolveError } from "@/lib/types";

interface UrlFormProps {
  url: string;
  onUrlChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: ResolveError | null;
  onDismissError: () => void;
}

export function UrlForm({ url, onUrlChange, onSubmit, loading, error, onDismissError }: UrlFormProps) {
  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading) onSubmit();
        }}
        className="flex w-full flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="Paste a Google Drive video link — file/d/… , open?id=… , or a raw download URL"
            aria-label="Google Drive video URL"
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
            className={cn(
              "h-13 rounded-2xl border-border/70 bg-card pl-11 pr-4 text-sm shadow-sm transition-all",
              "placeholder:text-muted-foreground/70 focus-visible:ring-primary/40 focus-visible:border-primary/50",
              "disabled:opacity-60",
              error && "border-destructive/50",
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !url.trim()}
          className="h-13 min-w-[13.5rem] rounded-2xl px-6 text-sm font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/35 disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              Resolving stream…
            </>
          ) : (
            <>
              <Zap className="h-4.5 w-4.5" />
              Generate Stream Link
            </>
          )}
        </Button>
      </form>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mt-4 animate-in fade-in-50 slide-in-from-top-2 rounded-2xl">
          <AlertTitle className="text-sm font-semibold tracking-tight">
            {error.code === "FOLDER_LINK"
              ? "Folder link detected"
              : error.code === "NOT_FOUND"
                ? "File not found"
                : error.code === "PRIVATE_FILE"
                  ? "Private file"
                  : error.code === "TOO_MANY_REQUESTS"
                    ? "Google rate limit"
                    : "Couldn't resolve that link"}
          </AlertTitle>
          <AlertDescription className="mt-1 space-y-1 text-sm text-destructive/85">
            <p>{error.message}</p>
            {error.hint && <p className="text-xs opacity-80">{error.hint}</p>}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
