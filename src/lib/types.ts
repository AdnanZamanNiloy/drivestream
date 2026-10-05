/** Shared API response types for the Drive Streamer frontend. */

export interface ResolveError {
  code: string;
  message: string;
  hint?: string;
}

export interface DriveFileMetaDto {
  id: string;
  name: string;
  size: number | null;
  mimeType: string;
  supportsRange: boolean;
}

export interface ResolveFileResponse {
  ok: true;
  type: "file";
  file: DriveFileMetaDto;
  streamUrl: string;
  vlcUrl: string;
  thumbnailUrl: string;
  resolvedAt: number;
}

export interface ResolveFolderResponse {
  ok: true;
  type: "folder";
  folder: { id: string };
  files: (DriveFileMetaDto & { streamUrl: string })[];
}

export type ResolveResponse = ResolveFileResponse | ResolveFolderResponse;

export interface ResolveApiError {
  ok: false;
  error: ResolveError;
}

export interface HistoryItem {
  id: string;
  name: string;
  size: number | null;
  mimeType: string;
  streamUrl: string;
  thumbnailUrl: string;
  resolvedAt: number;
}

export const HISTORY_KEY = "drive-streamer:history";
export const HISTORY_MAX = 6;

/** Format bytes into a human-readable string. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

/** True when the browser <video> element can usually play this file. */
export function isBrowserPlayable(mimeType: string, name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "webm", "m4v", "ogv", "mp3", "m4a", "opus", "ogg", "wav"].includes(ext)) return true;
  return mimeType.startsWith("video/mp4") || mimeType.startsWith("video/webm") || mimeType.startsWith("audio/");
}

/** Short label for the container/codec, e.g. "MKV" */
export function containerLabel(mimeType: string, name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext) return ext.toUpperCase();
  const sub = mimeType.split("/")[1];
  return sub ? sub.toUpperCase() : mimeType;
}
