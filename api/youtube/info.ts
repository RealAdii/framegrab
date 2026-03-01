import type { VercelRequest, VercelResponse } from "@vercel/node";
import ytdl from "@distube/ytdl-core";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.query.url as string;

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const info = await ytdl.getInfo(url);
    const details = info.videoDetails;

    return res.status(200).json({
      title: details.title,
      duration: parseInt(details.lengthSeconds),
      thumbnail: details.thumbnails[details.thumbnails.length - 1]?.url || "",
      videoId: details.videoId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch video info";
    return res.status(500).json({ error: message });
  }
}
