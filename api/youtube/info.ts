import type { VercelRequest, VercelResponse } from "@vercel/node";

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
  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const apiRes = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=title,lengthSeconds,videoThumbnails,formatStreams`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!apiRes.ok) continue;

      const data = await apiRes.json();

      // Find best mp4 itag for the stream endpoint
      const formats = data.formatStreams || [];
      const best =
        formats.find((f: any) => f.container === "mp4" && f.qualityLabel === "720p") ||
        formats.find((f: any) => f.container === "mp4") ||
        formats[0];

      return res.status(200).json({
        title: data.title,
        duration: data.lengthSeconds,
        thumbnail: data.videoThumbnails?.[0]?.url || "",
        videoId,
        itag: best?.itag,
        instance,
      });
    } catch {
      continue;
    }
  }

  return res.status(502).json({ error: "Failed to reach YouTube via any proxy" });
}
