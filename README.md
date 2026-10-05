# DriveStream

Turn any public Google Drive video into a clean, direct stream URL — plays in VLC, mpv, IINA, and browser `<video>` tags with instant seeking.

**Live:** hosted on [zai-space](https://zai-space.com)

---

## How it works

```
Player ── Range: bytes=0-999 ──▶  DriveStream /api/stream/<fileId>
                                     │  forwards Range, strips expiring
                                     │  Google params (authuser, uuid, at)
                                     ▼
              drive.usercontent.google.com/download?id=<fileId>
                                     │
              206 Partial Content + Content-Range ◀── piped straight through
```

1. **Resolve** — paste a Drive link. The app validates it, probes the file with a 1-byte Range request, and returns the name, size, MIME type, and a permanent stream URL.
2. **Stream** — a zero-buffer proxy forwards the client's `Range` header to Google and passes the `206` response back untouched. Nothing is written to disk, so seeking is immediate.
3. **Thumbnail** — the Drive poster image is proxied for previews.

Supported inputs: `/file/d/<ID>/view`, `?id=<ID>`, `uc?export=download`, usercontent links, docs links, folders (with `GOOGLE_API_KEY`), and bare file IDs.

## Usage

Paste a Drive URL into the web UI to generate a stream URL, then open it anywhere:

```bash
vlc  "https://your-host/api/stream/<fileId>"
mpv  "https://your-host/api/stream/<fileId>"
curl -I "https://your-host/api/stream/<fileId>"   # check 206 / Accept-Ranges
```

The file must be shared as **"Anyone with the link."** DriveStream proxies Drive — it does not bypass permissions or quotas.

## Tech

Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS 4 · shadcn/ui. Native `fetch` streaming — no extra media server.

## License

[MIT](LICENSE) © Adnan Zaman
