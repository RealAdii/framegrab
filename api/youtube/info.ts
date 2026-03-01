import type { VercelRequest, VercelResponse } from "@vercel/node";
import youtubeDl from "youtube-dl-exec";

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
    const info = await youtubeDl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    }) as any;

    return res.status(200).json({
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${videoId}/hq2.jpg`,
      videoId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch video info";
    return res.status(500).json({ error: message });
  }
}
