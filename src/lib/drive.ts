/**
 * Google Drive streaming core library.
 *
 * Strategy: Google's public download endpoint
 *   https://drive.usercontent.google.com/download?id=<FILE_ID>&export=download&confirm=t
 * serves publicly-shared files with full HTTP Range / 206 Partial Content support
 * and WITHOUT any of the temporary authorization parameters (uuid / at / authuser).
 *
 * This app proxies that endpoint so the URL we hand to the user is clean, stable
 * and never exposes short-lived Google tokens.
 */

export type ParsedFileInput = {
  kind: "file";
  fileId: string;
  resourceKey?: string;
};

export type ParsedFolderInput = {
  kind: "folder";
  folderId: string;
};

export type ParsedDriveInput = ParsedFileInput | ParsedFolderInput;

export interface DriveFileMeta {
  id: string;
  name: string;
  size: number | null;
  mimeType: string;
  supportsRange: boolean;
  resourceKey?: string;
}

/** Typed, user-presentable errors thrown by this library. */
export class DriveError extends Error {
  code:
    | "INVALID_URL"
    | "EMPTY_INPUT"
    | "FOLDER_LINK"
    | "NOT_FOUND"
    | "PRIVATE_FILE"
    | "TOO_MANY_REQUESTS"
    | "UPSTREAM_ERROR"
    | "NOT_A_VIDEO";
  status: number;
  hint?: string;

  constructor(
    code: DriveError["code"],
    message: string,
    status = 400,
    hint?: string,
  ) {
    super(message);
    this.name = "DriveError";
    this.code = code;
    this.status = status;
    this.hint = hint;
  }
}

const FILE_ID_RE = /^[A-Za-z0-9_-]{20,}$/;
const UPSTREAM_BASE = "https://drive.usercontent.google.com/download";
const THUMBNAIL_BASE = "https://drive.google.com/thumbnail";

/** Well-known extension → MIME map used to fix Google's generic octet-stream. */
const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  flv: "video/x-flv",
  m4v: "video/x-m4v",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
  ts: "video/mp2t",
  "3gp": "video/3gpp",
  wmv: "video/x-ms-wmv",
  ogv: "video/ogg",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  opus: "audio/ogg",
};

const VIDEO_MIME_PREFIXES = ["video/", "audio/", "application/octet-stream"];

/**
 * Parse any common Google Drive URL shape (or a bare file ID) and extract the
 * resource identity. Supported shapes:
 *  - https://drive.google.com/file/d/<ID>/view?usp=sharing
 *  - https://drive.google.com/open?id=<ID>
 *  - https://drive.google.com/uc?export=download&id=<ID>
 *  - https://drive.usercontent.google.com/download?id=<ID>&... (temp tokens are discarded)
 *  - https://docs.google.com/uc?id=<ID>
 *  - https://drive.google.com/drive/folders/<ID>            → folder
 *  - <bare file ID>
 */
export function parseDriveInput(raw: string): ParsedDriveInput {
  const input = (raw ?? "").trim();
  if (!input) throw new DriveError("EMPTY_INPUT", "Please paste a Google Drive link first.");

  // Bare file ID
  if (FILE_ID_RE.test(input) && !input.includes("/")) {
    return { kind: "file", fileId: input };
  }

  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    throw new DriveError(
      "INVALID_URL",
      "That doesn't look like a valid URL.",
      400,
      "Example: https://drive.google.com/file/d/FILE_ID/view",
    );
  }

  const host = url.hostname.toLowerCase();

  // drive.usercontent.google.com/download?id=<ID>... — strip every temporary param
  if (host === "drive.usercontent.google.com") {
    const id = url.searchParams.get("id");
    if (!id) {
      throw new DriveError("INVALID_URL", "Missing file id in that Google Drive download URL.");
    }
    return { kind: "file", fileId: id, resourceKey: url.searchParams.get("resourcekey") ?? undefined };
  }

  if (host === "drive.google.com" || host === "docs.google.com" || host.endsWith(".google.com")) {
    // /file/d/<ID>
    const fileMatch = url.pathname.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([A-Za-z0-9_-]{15,})/);
    if (fileMatch) {
      return { kind: "file", fileId: fileMatch[1] };
    }

    // /drive/folders/<ID> (also matches /drive/u/0/folders/<ID>)
    const folderMatch = url.pathname.match(/\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]{15,})/);
    if (folderMatch) {
      return { kind: "folder", folderId: folderMatch[1] };
    }

    // /open?id= or /uc?id=
    const id = url.searchParams.get("id");
    if (id) {
      return { kind: "file", fileId: id, resourceKey: url.searchParams.get("resourcekey") ?? undefined };
    }

    throw new DriveError(
      "INVALID_URL",
      "Could not find a file ID in that Google Drive link.",
      400,
      "Use the file's share link, e.g. https://drive.google.com/file/d/FILE_ID/view",
    );
  }

  throw new DriveError(
    "INVALID_URL",
    "Only Google Drive links are supported.",
    400,
    "The link must point to drive.google.com or drive.usercontent.google.com.",
  );
}

/** Build the clean upstream URL (no temporary auth parameters ever). */
export function buildUpstreamUrl(fileId: string, resourceKey?: string): string {
  const u = new URL(UPSTREAM_BASE);
  u.searchParams.set("id", fileId);
  u.searchParams.set("export", "download");
  u.searchParams.set("confirm", "t");
  if (resourceKey) u.searchParams.set("resourcekey", resourceKey);
  return u.toString();
}

export function buildThumbnailUrl(fileId: string, width = 400): string {
  return `${THUMBNAIL_BASE}?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}

/** RFC 5987 aware filename extraction from a Content-Disposition header. */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = header.match(/filename\*=(?:UTF-8|utf-8)''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through */
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
}

/** Parse "bytes 0-0/123456" → 123456 */
export function totalSizeFromContentRange(header: string | null): number | null {
  if (!header) return null;
  const m = header.match(/\/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

/** Guess a real MIME type from the filename so browsers/players behave correctly. */
export function mimeFromFilename(name: string | null, fallback: string): string {
  if (!name) return fallback;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? fallback;
}

export function looksLikeMedia(name: string | null, mimeType: string): boolean {
  if (mimeType && VIDEO_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) {
    // octet-stream counts only when the extension is a known media extension
    if (mimeType === "application/octet-stream") {
      return Boolean(name && MIME_BY_EXT[name.split(".").pop()?.toLowerCase() ?? ""]);
    }
    return true;
  }
  return Boolean(name && MIME_BY_EXT[name.split(".").pop()?.toLowerCase() ?? ""]);
}

/**
 * Fetch upstream with a client-supplied Range header (optional).
 * Follows the rare "virus scan warning" confirmation page automatically.
 *
 * `timeoutMs`: 0 means NO timeout — required for long-lived video streams.
 * A 20s default is only appropriate for quick probes (metadata, HEAD).
 */
export async function fetchUpstream(
  fileId: string,
  opts: {
    range?: string | null;
    resourceKey?: string;
    method?: "GET" | "HEAD";
    timeoutMs?: number;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  const { range, resourceKey, method = "GET", timeoutMs = 20_000, signal } = opts;

  const headers: Record<string, string> = {
    "User-Agent": "VLC/3.0.21 LibVLC/3.0.21",
    Accept: "*/*",
    // Never let upstream compress the body — Content-Length must match raw bytes.
    "Accept-Encoding": "identity",
  };
  if (range) headers.Range = range;

  let res = await fetch(buildUpstreamUrl(fileId, resourceKey), {
    method,
    headers,
    redirect: "follow",
    signal: signal ?? (timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined),
    cache: "no-store" as RequestCache,
  });

  // Google occasionally answers with an HTML interstitial (virus-scan warning
  // or consent form). Parse the form and replay it exactly.
  const ctype = res.headers.get("content-type") ?? "";
  if (ctype.includes("text/html") && method === "GET") {
    const html = await res.text().catch(() => "");
    const retried = await retryConfirmationForm(fileId, html, range, signal);
    if (retried) {
      res = retried;
      // Retry also hit an interstitial → classify it precisely.
      if ((retried.headers.get("content-type") ?? "").includes("text/html")) {
        const html2 = await retried.text().catch(() => "");
        classifyHtmlError(retried.status, html2, fileId);
      }
    } else if (html) {
      classifyHtmlError(res.status, html, fileId);
    }
  }

  return res;
}

/** Parse the hidden-input confirmation form from an HTML interstitial and replay it. */
async function retryConfirmationForm(
  fileId: string,
  html: string,
  range: string | null | undefined,
  signal?: AbortSignal,
): Promise<Response | null> {
  if (!html || !/<form/i.test(html)) return null;

  const formMatch = html.match(/<form[^>]*action="([^"]*)"[^>]*method="([^"]*)"/i);
  if (!formMatch) return null;

  const action = formMatch[1];
  const method = formMatch[2].toUpperCase() === "POST" ? "POST" : "GET";

  const fields: Record<string, string> = {};
  for (const tag of html.matchAll(/<input[^>]*>/gi)) {
    const input = tag[0];
    const name = input.match(/name="([^"]*)"/i)?.[1];
    const value = input.match(/value="([^"]*)"/i)?.[1];
    if (name) fields[name] = value ?? "";
  }
  if (!fields.id && !fields.uuid) return null;

  const target = new URL(action.startsWith("http") ? action : `https://drive.usercontent.google.com${action}`);
  let body: string | undefined;
  if (method === "POST") {
    body = new URLSearchParams(fields).toString();
  } else {
    for (const [k, v] of Object.entries(fields)) target.searchParams.set(k, v);
  }
  if (resourceKeyOf(fields)) target.searchParams.set("resourcekey", resourceKeyOf(fields)!);

  return fetch(target, {
    method,
    headers: {
      ...(range ? { Range: range } : {}),
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept-Encoding": "identity",
      "User-Agent": "VLC/3.0.21 LibVLC/3.0.21",
    },
    body,
    redirect: "follow",
    signal: signal ?? AbortSignal.timeout(20_000),
  });
}

function resourceKeyOf(fields: Record<string, string>): string | undefined {
  return fields.resourcekey || undefined;
}

/** Translate Google's HTML error pages into typed, user-friendly errors. */
function classifyHtmlError(status: number, html: string, fileId: string): never {
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";

  if (status === 404 || /Error 404|Not Found/i.test(title)) {
    throw new DriveError(
      "NOT_FOUND",
      "File not found or not shared publicly.",
      404,
      "In Google Drive, set the file to “Anyone with the link” sharing, then try again.",
    );
  }
  if (status === 429 || /Too many requests|rate limit/i.test(html)) {
    throw new DriveError(
      "TOO_MANY_REQUESTS",
      "Google Drive is rate-limiting this file (download quota exceeded).",
      429,
      "Try again later — Google resets per-file download quotas every 24 hours.",
    );
  }
  if (/accounts\.google\.com|ServiceLogin|sign in/i.test(html)) {
    throw new DriveError(
      "PRIVATE_FILE",
      "This file requires a Google account sign-in.",
      403,
      "Only files shared as “Anyone with the link” can be streamed. Set the GOOGLE_API_KEY env var for API access.",
    );
  }
  throw new DriveError(
    "UPSTREAM_ERROR",
    `Google Drive refused the request for file “${fileId}”.`,
    status >= 400 ? status : 502,
    "Verify the file is publicly shared and still exists.",
  );
}

/**
 * Probe a file with a 1-byte Range request. Cheap (1 byte of body) and returns
 * name / size / mime / range support in one shot.
 */
export async function probeFile(fileId: string, resourceKey?: string): Promise<DriveFileMeta> {
  let res: Response;
  try {
    res = await fetchUpstream(fileId, { range: "bytes=0-0", resourceKey });
  } catch (err) {
    if (err instanceof DriveError) throw err;
    if ((err as Error)?.name === "TimeoutError" || (err as Error)?.name === "AbortError") {
      throw new DriveError("UPSTREAM_ERROR", "Google Drive took too long to respond.", 504);
    }
    throw new DriveError("UPSTREAM_ERROR", "Could not reach Google Drive.", 502);
  }
  // Drain the 1-byte body so the socket is released.
  try {
    await res.body?.cancel();
  } catch {
    /* ignore */
  }

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (contentType.includes("text/html")) {
    const html = await res.text().catch(() => "");
    classifyHtmlError(res.status, html, fileId);
  }

  if (res.status === 404) {
    throw new DriveError(
      "NOT_FOUND",
      "File not found or not shared publicly.",
      404,
      "In Google Drive, set the file to “Anyone with the link” sharing, then try again.",
    );
  }
  if (res.status === 429) {
    throw new DriveError(
      "TOO_MANY_REQUESTS",
      "Google Drive is rate-limiting this file (download quota exceeded).",
      429,
      "Try again later — Google resets per-file download quotas every 24 hours.",
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new DriveError(
      "PRIVATE_FILE",
      "This file is not publicly accessible.",
      403,
      "Set sharing to “Anyone with the link” in Google Drive, then try again.",
    );
  }
  if (res.status >= 400) {
    throw new DriveError("UPSTREAM_ERROR", `Google Drive returned HTTP ${res.status}.`, 502);
  }

  const name = filenameFromDisposition(res.headers.get("content-disposition"));
  const size =
    totalSizeFromContentRange(res.headers.get("content-range")) ??
    (res.headers.get("content-length") ? Number(res.headers.get("content-length")) : null);
  const supportsRange = res.status === 206 && res.headers.has("content-range");
  const mimeType = mimeFromFilename(name, contentType || "application/octet-stream");

  return { id: fileId, name: name ?? `drive-${fileId}`, size, mimeType, supportsRange, resourceKey };
}

/** Optional Drive API v3 folder listing (requires GOOGLE_API_KEY). */
export async function listFolderFiles(folderId: string): Promise<DriveFileMeta[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new DriveError(
      "FOLDER_LINK",
      "That's a Google Drive folder link, not a file link.",
      400,
      "Open the folder, right-click a video → “Share” → “Copy link”, and paste the FILE link here. (Server admins: set GOOGLE_API_KEY to enable automatic folder listing.)",
    );
  }

  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${q}` +
    `&fields=files(id,name,mimeType,size)&pageSize=100&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => {
    throw new DriveError("UPSTREAM_ERROR", "Could not reach the Google Drive API.", 502);
  });

  const data = (await res.json().catch(() => ({}))) as {
    files?: { id: string; name: string; mimeType: string; size?: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    if (res.status === 404) {
      throw new DriveError("NOT_FOUND", "Folder not found or not shared publicly.", 404);
    }
    if (res.status === 403) {
      throw new DriveError(
        "PRIVATE_FILE",
        "This folder is not publicly accessible with the configured API key.",
        403,
      );
    }
    throw new DriveError(
      "UPSTREAM_ERROR",
      data.error?.message ?? `Drive API returned HTTP ${res.status}.`,
      502,
    );
  }

  return (data.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size ? Number(f.size) : null,
    mimeType: f.mimeType,
    supportsRange: true,
  }));
}

export function isValidFileId(fileId: string): boolean {
  return FILE_ID_RE.test(fileId);
}
