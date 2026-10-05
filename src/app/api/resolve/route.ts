import { NextRequest, NextResponse } from "next/server";
import {
  DriveError,
  listFolderFiles,
  parseDriveInput,
  probeFile,
} from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResolveBody {
  url?: string;
}

/** Resolve the public origin for absolute stream URLs (works behind the Caddy gateway). */
function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  let body: ResolveBody;
  try {
    body = (await req.json()) as ResolveBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_URL", message: "Invalid request body — expected JSON." } },
      { status: 400 },
    );
  }

  try {
    const parsed = parseDriveInput(body.url ?? "");

    // Folder link → list contents if GOOGLE_API_KEY is configured.
    if (parsed.kind === "folder") {
      const files = await listFolderFiles(parsed.folderId);
      const base = getBaseUrl(req);
      return NextResponse.json({
        ok: true,
        type: "folder",
        folder: { id: parsed.folderId },
        files: files.map((f) => ({
          ...f,
          streamUrl: `${base}/api/stream/${f.id}`,
        })),
      });
    }

    // File link → probe metadata with a 1-byte range request.
    const meta = await probeFile(parsed.fileId, parsed.resourceKey);
    const base = getBaseUrl(req);
    const streamUrl = `${base}/api/stream/${meta.id}`;

    return NextResponse.json({
      ok: true,
      type: "file",
      file: {
        id: meta.id,
        name: meta.name,
        size: meta.size,
        mimeType: meta.mimeType,
        supportsRange: meta.supportsRange,
      },
      streamUrl,
      vlcUrl: `vlc://${streamUrl}`,
      thumbnailUrl: `${base}/api/thumbnail/${meta.id}`,
      resolvedAt: Date.now(),
    });
  } catch (err) {
    if (err instanceof DriveError) {
      return NextResponse.json(
        { ok: false, error: { code: err.code, message: err.message, hint: err.hint } },
        { status: err.status >= 400 && err.status < 600 ? err.status : 500 },
      );
    }
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json(
      { ok: false, error: { code: "UPSTREAM_ERROR", message } },
      { status: 500 },
    );
  }
}
