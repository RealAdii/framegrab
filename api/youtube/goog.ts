export const config = { runtime: "edge" };

const ALLOWED_HOSTS = [
  "jnn-pa.googleapis.com",
  "www.google.com",
  "google.com",
];

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing url" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = new URL(targetUrl);
    if (!ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      return new Response(JSON.stringify({ error: "Host not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Forward the request method and body
    const isPost = req.method === "POST";
    const body = isPost ? await req.text() : undefined;

    const headers: Record<string, string> = {};
    for (const key of ["content-type", "x-goog-api-key", "x-user-agent"]) {
      const val = req.headers.get(key);
      if (val) headers[key] = val;
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseHeaders = new Headers();
    const ct = upstream.headers.get("Content-Type");
    if (ct) responseHeaders.set("Content-Type", ct);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, x-goog-api-key, x-user-agent");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Proxy request failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
