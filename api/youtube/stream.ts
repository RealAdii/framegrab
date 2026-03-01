import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "stream";

export const config = {
  maxDuration: 60,
};

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://vid.puffyan.us",
];

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.query.url as string;
  const preferredInstance = req.query.instance as string | undefined;
  const preferredItag = req.query.itag as string | undefined;

  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

  // Try preferred instance first, then fallback to others
  const instances = preferredInstance
    ? [preferredInstance, ...INVIDIOUS_INSTANCES.filter((i) => i !== preferredInstance)]
    : INVIDIOUS_INSTANCES;

  for (const instance of instances) {
    try {
      // If we don't have an itag, fetch video info to find one
      let itag = preferredItag;
      if (!itag) {
        const infoRes = await fetch(
          `${instance}/api/v1/videos/${videoId}?fields=formatStreams`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!infoRes.ok) continue;
        const data = await infoRes.json();
        const formats = data.formatStreams || [];
        const best =
          formats.find((f: any) => f.container === "mp4" && f.qualityLabel === "720p") ||
          formats.find((f: any) => f.container === "mp4") ||
          formats[0];
        if (!best) continue;
        itag = best.itag;
      }

      // Fetch video through Invidious proxy (local=true forces proxying)
      const proxyUrl = `${instance}/latest_version?id=${videoId}&itag=${itag}&local=true`;
      const videoRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(55000) });
      if (!videoRes.ok || !videoRes.body) continue;

      res.setHeader("Content-Type", videoRes.headers.get("Content-Type") || "video/mp4");
      const cl = videoRes.headers.get("Content-Length");
      if (cl) res.setHeader("Content-Length", cl);

      const nodeStream = Readable.fromWeb(videoRes.body as any);
      nodeStream.pipe(res);

      nodeStream.on("error", () => {
        if (!res.headersSent) {
          res.status(500).json({ error: "Stream failed" });
        }
      });

      return;
    } catch {
      continue;
    }
  }

  if (!res.headersSent) {
    res.status(502).json({ error: "Failed to stream video from any proxy" });
  }
}
