import type { VercelRequest, VercelResponse } from "@vercel/node";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as https from "https";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const videoUrl = req.query.url as string;

  if (!videoUrl || !videoUrl.includes(".googlevideo.com/")) {
    return res.status(400).json({ error: "Invalid or disallowed URL" });
  }

  const proxyUrl = process.env.RESIDENTIAL_PROXY_URL || "";

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (proxyUrl) {
      // Route through residential proxy
      const agent = new HttpsProxyAgent(proxyUrl);

      return new Promise<void>((resolve) => {
        const proxyReq = https.get(videoUrl, { agent }, (upstream) => {
          const ct = upstream.headers["content-type"] || "video/mp4";
          const cl = upstream.headers["content-length"];
          res.setHeader("Content-Type", ct);
          if (cl) res.setHeader("Content-Length", cl);
          res.status(upstream.statusCode || 200);
          upstream.pipe(res);
          upstream.on("end", resolve);
        });

        proxyReq.on("error", () => {
          res.status(502).json({ error: "Proxy request failed" });
          resolve();
        });
      });
    } else {
      // Direct fetch (no proxy)
      const upstream = await fetch(videoUrl);

      if (!upstream.ok) {
        return res
          .status(502)
          .json({ error: `Upstream returned ${upstream.status}` });
      }

      const ct = upstream.headers.get("Content-Type") || "video/mp4";
      const cl = upstream.headers.get("Content-Length");
      res.setHeader("Content-Type", ct);
      if (cl) res.setHeader("Content-Length", cl);

      const reader = upstream.body?.getReader();
      if (!reader) {
        return res.status(502).json({ error: "No response body" });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    }
  } catch {
    res.status(502).json({ error: "Failed to proxy video" });
  }
}
