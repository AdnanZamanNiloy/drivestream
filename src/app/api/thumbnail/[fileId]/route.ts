import { NextRequest } from "next/server";
import { buildThumbnailUrl, isValidFileId } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ fileId: string }>;
}

/**
 * GET /api/thumbnail/<fileId>
 * Proxies Google Drive's public thumbnail image so the UI can show a poster
 * without mixed-content or third-party cookie issues. Cached for 24h.
 */
export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const { fileId } = await ctx.params;

  if (!isValidFileId(fileId)) {
    return new Response("Invalid file ID", { status: 400 });
  }

  try {
    const upstream = await fetch(buildThumbnailUrl(fileId, 480), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok || !(upstream.headers.get("content-type") ?? "").startsWith("image/")) {
      return new Response("Thumbnail unavailable", { status: 404 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=86400, immutable",
        "access-control-allow-origin": "*",
      },
    });
  } catch {
    return new Response("Thumbnail unavailable", { status: 502 });
  }
}
