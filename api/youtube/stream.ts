import type { VercelRequest, VercelResponse } from "@vercel/node";
import ytdl from "@distube/ytdl-core";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.query.url as string;

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const info = await ytdl.getInfo(url);

    // Prefer mp4 with video+audio for browser compatibility
    let format;
    try {
      format = ytdl.chooseFormat(info.formats, {
        quality: "highest",
        filter: (f) => f.container === "mp4" && !!f.hasVideo && !!f.hasAudio,
      });
    } catch {
      format = ytdl.chooseFormat(info.formats, {
        quality: "highest",
        filter: "videoandaudio",
      });
    }

    const mimeType = format.mimeType?.split(";")[0] || "video/mp4";
    res.setHeader("Content-Type", mimeType);
    if (format.contentLength) {
      res.setHeader("Content-Length", format.contentLength);
    }

    const stream = ytdl.downloadFromInfo(info, { format });
    stream.pipe(res);

    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream failed" });
      }
    });
  } catch (err: unknown) {
    if (!res.headersSent) {
      const message = err instanceof Error ? err.message : "Failed to stream video";
      res.status(500).json({ error: message });
    }
  }
}
