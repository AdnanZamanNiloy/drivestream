import { NextRequest } from "next/server";
import {
  DriveError,
  fetchUpstream,
  filenameFromDisposition,
  isValidFileId,
  mimeFromFilename,
} from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ fileId: string }>;
}

/**
 * Video streaming proxy with full HTTP Range / 206 Partial Content support.
 *
 *   GET  /api/stream/<fileId>[?rk=<resourceKey>]   → bytes (200 / 206)
 *   HEAD /api/stream/<fileId>                      → headers only
 *
 * The client's Range header is forwarded verbatim to Google's usercontent
 * endpoint; Google's 206 response (Content-Range, Content-Length) is passed
 * back untouched, which is exactly what VLC needs for seeking.
 * No temporary Google authorization parameters are ever exposed.
 */
async function handle(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const { fileId } = await ctx.params;

  if (!isValidFileId(fileId)) {
    return textError(400, "Invalid Google Drive file ID.");
  }

  const resourceKey = req.nextUrl.searchParams.get("rk") ?? undefined;
  const range = req.headers.get("range");
  const wantsHead = req.method === "HEAD";

  let upstream: Response;
  try {
    upstream = await fetchUpstream(fileId, {
      range,
      resourceKey,
      method: wantsHead ? "HEAD" : "GET",
    });
  } catch (err) {
    if (err instanceof DriveError) {
      return textError(err.status, `${err.message}${err.hint ? ` — ${err.hint}` : ""}`);
    }
    return textError(502, "Could not reach Google Drive. Please try again.");
  }

  const upstreamType = (upstream.headers.get("content-type") ?? "").split(";")[0].trim();

  // HTML here means an interstitial the confirmation retry could not resolve.
  if (upstreamType.includes("text/html")) {
    if (upstream.status === 404) {
      return textError(404, "File not found or not shared publicly (HTTP 404).");
    }
    if (upstream.status === 429) {
      return textError(429, "Google Drive rate limit / download quota exceeded. Try again later.");
    }
    return textError(
      403,
      "This file is not publicly accessible. In Google Drive, set sharing to “Anyone with the link”.",
    );
  }

  if (upstream.status >= 400) {
    return textError(502, `Google Drive returned HTTP ${upstream.status}.`);
  }

  const filename = filenameFromDisposition(upstream.headers.get("content-disposition"));
  const contentType = mimeFromFilename(filename, upstreamType || "application/octet-stream");

  const headers = new Headers();
  const passthrough = [
    "content-length",
    "content-range",
    "last-modified",
    "etag",
  ];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }

  headers.set("content-type", contentType);
  headers.set("accept-ranges", "bytes");
  headers.set("content-disposition", `inline; filename="${(filename ?? fileId).replace(/["\r\n]/g, "")}"`);
  // Let browsers <video> and any CORS client use the stream directly.
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-headers", "Range, Content-Type, Accept");
  headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
  headers.set("access-control-expose-headers", "Content-Range, Content-Length, Accept-Ranges");
  headers.set("cache-control", "public, max-age=3600");
  headers.set("x-stream-engine", "drive-streamer/1.0");

  // 206 from Google flows through as 206 (Range honored).
  // 200 flows through as 200 (full body / no Range requested).
  const status = upstream.status === 206 ? 206 : 200;

  if (wantsHead) {
    // HEAD must not carry a body.
    return new Response(null, { status, headers });
  }

  // Pipe Google's body straight through — zero buffering for large files.
  return new Response(upstream.body, { status, headers });
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}

export async function HEAD(req: NextRequest, ctx: RouteCtx) {
  return handle(req, ctx);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Range, Content-Type, Accept",
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
      "access-control-max-age": "86400",
    },
  });
}

/** VLC-friendly plain-text errors. */
function textError(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
