export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl || !videoUrl.includes(".googlevideo.com/")) {
    return new Response(
      JSON.stringify({ error: "Invalid or disallowed URL" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const upstream = await fetch(videoUrl);

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream returned ${upstream.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("Content-Type") || "video/mp4"
    );
    const cl = upstream.headers.get("Content-Length");
    if (cl) headers.set("Content-Length", cl);
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, { headers });
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to proxy video" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
