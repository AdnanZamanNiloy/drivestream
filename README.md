# Google Drive Video Streamer

Paste a Google Drive video link → get a **clean, stable stream URL** that plays directly in
VLC Media Player, mpv, IINA, browser `<video>` tags, and any HTTP player — with full
**HTTP Range / 206 Partial Content** support so seeking is instant.

No expiring Google tokens (`authuser`, `uuid`, `at`) ever appear in the generated URL.

---

## How it works

```
VLC / browser ── Range: bytes=0-999 ──▶  this app: /api/stream/<fileId>
                                            │
                                            │ forwards Range verbatim, strips all
                                            │ temporary Google parameters
                                            ▼
                        https://drive.usercontent.google.com/download?id=<fileId>&export=download&confirm=t
                                            │
                          206 Partial Content + Content-Range ◀┘
```

1. **`POST /api/resolve`** — parses/validates any Drive URL shape, probes the file with a
   1-byte Range request, and returns the file name, size, MIME type plus a permanent
   stream URL (`https://your-host/api/stream/<fileId>`).
2. **`GET/HEAD /api/stream/<fileId>`** — a zero-buffer streaming proxy. The client's
   `Range` header is forwarded to Google and the `206` response (Content-Range,
   Content-Length) is passed back untouched — exactly what VLC needs for scrubbing.
   Video bytes are piped straight through; nothing is stored on disk.
3. **`GET /api/thumbnail/<fileId>`** — proxies the Drive thumbnail as a poster image.

### Supported URL formats

| Format | Example |
| --- | --- |
| File view link | `https://drive.google.com/file/d/<ID>/view` |
| Open link | `https://drive.google.com/open?id=<ID>` |
| Download link | `https://drive.google.com/uc?export=download&id=<ID>` |
| Usercontent link (tokens stripped) | `https://drive.usercontent.google.com/download?id=<ID>&…` |
| Docs links | `https://docs.google.com/uc?id=<ID>` |
| Bare file ID | `1dLyB8NzZg9rlnUX_T1joEsWO4U1WEpIn` |
| Folder link | `https://drive.google.com/drive/folders/<ID>` (needs `GOOGLE_API_KEY` to auto-list) |

### Error handling

Every failure mode gets a clear, actionable message: folder link detected, file not found /
not public, Google rate-limit (download quota), private file requiring sign-in, invalid URL,
and upstream timeouts. The stream endpoint answers with VLC-friendly plain-text errors.

---

## Quick start

Requirements: [Node.js 20+](https://nodejs.org) or [Bun](https://bun.sh).

```bash
# 1. Install dependencies
bun install        # or: npm install

# 2. (Optional) configure the environment
cp .env.example .env
#    → set GOOGLE_API_KEY if you want folder-link support

# 3. Run the dev server
bun run dev        # or: npm run dev
#    → http://localhost:3000

# 4. Production
bun run build && bun run start    # or: npm run build && npm start
```

Deploy anywhere Next.js runs (Vercel, Fly.io, Railway, Docker, a VPS…). Because VLC must
reach the stream URL over the network, the host must be publicly reachable (or at least
reachable from the machine running VLC).

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_API_KEY` | No | Drive API v3 key. Enables folder listing and API-preferred metadata. Without it, all *file* links still work for publicly shared files. |
| `DATABASE_URL` | scaffold only | SQLite path (the streamer itself is stateless). |

---

## Using the stream URL

**In VLC:** Media → Open Network Stream (`Ctrl+N` / `⌘N`) → paste → Play.
Or click **Open in VLC** in the UI, which uses the `vlc://` protocol (also works on the
iOS/Android VLC apps).

**CLI players:**

```bash
vlc  "https://your-host/api/stream/<fileId>"
mpv  "https://your-host/api/stream/<fileId>"
ffplay "https://your-host/api/stream/<fileId>"
curl -I "https://your-host/api/stream/<fileId>"   # see Content-Range / Accept-Ranges
```

**Verify Range/206 support:**

```bash
curl -sD - -o /dev/null -H "Range: bytes=0-1023" \
  "https://your-host/api/stream/<fileId>"
# → HTTP/1.1 206 Partial Content
# → content-range: bytes 0-1023/210398263
# → accept-ranges: bytes
```

---

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS 4** + **shadcn/ui** (New York) + **Lucide** icons + **Framer Motion**
- **next-themes** dark/light mode (system-aware, flash-free)
- Native `fetch` streaming proxy — no extra media server, no disk writes

## Project layout

```
src/
├── app/
│   ├── page.tsx                      # single-page UI (generator, result, docs)
│   ├── layout.tsx                    # metadata + theme provider
│   └── api/
│       ├── resolve/route.ts          # POST — parse URL, probe metadata
│       ├── stream/[fileId]/route.ts  # GET/HEAD — Range/206 streaming proxy
│       └── thumbnail/[fileId]/route.ts
├── components/streamer/              # header, form, result card, sections…
└── lib/
    ├── drive.ts                      # parsing, probing, confirm-flow, errors
    └── types.ts                      # shared DTOs + formatters
```

## Notes & fair use

- The file must be shared as **“Anyone with the link”** — this tool proxies Drive, it does
  not (and cannot) bypass permissions, quotas, or DRM.
- Google applies per-file download quotas; heavily-used files may return 429 until reset.
- Stream only content you own or are licensed to share.
