import type { VercelRequest, VercelResponse } from "@vercel/node";
import youtubeDl from "youtube-dl-exec";
import { Readable } from "stream";

export const config = {
  maxDuration: 60,
};

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

  try {
    // Get the best video+audio URL via yt-dlp
    const info = await youtubeDl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      format: "best[ext=mp4]/best",
    }) as any;

    const videoUrl = info.url;
    if (!videoUrl) {
      return res.status(500).json({ error: "Could not extract video URL" });
    }

    // Proxy the video through our server for CORS
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok || !videoRes.body) {
      return res.status(502).json({ error: "Failed to fetch video stream" });
    }

    res.setHeader("Content-Type", videoRes.headers.get("Content-Type") || "video/mp4");
    const cl = videoRes.headers.get("Content-Length");
    if (cl) res.setHeader("Content-Length", cl);

    const nodeStream = Readable.fromWeb(videoRes.body as any);
    nodeStream.pipe(res);

    nodeStream.on("error", () => {
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream interrupted" });
      }
    });
  } catch (err: unknown) {
    if (!res.headersSent) {
      const message = err instanceof Error ? err.message : "Failed to stream video";
      res.status(500).json({ error: message });
    }
  }
}
