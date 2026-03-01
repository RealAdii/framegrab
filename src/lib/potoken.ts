import { BG } from "bgutils-js";

const PROXY_BASE = "/api/youtube/goog";
const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

function generateVisitorData(): string {
  // Generate random visitor ID (base64 of 16 random bytes)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

// Custom fetch that routes Google API calls through our CORS proxy
function createProxiedFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (
      url.includes("jnn-pa.googleapis.com") ||
      url.includes("google.com")
    ) {
      const proxyUrl = `${PROXY_BASE}?url=${encodeURIComponent(url)}`;
      const headers: Record<string, string> = {};
      if (init?.headers) {
        const h = init.headers as Record<string, string>;
        for (const [k, v] of Object.entries(h)) {
          headers[k] = v;
        }
      }
      return fetch(proxyUrl, {
        method: init?.method || "GET",
        headers,
        body: init?.body,
      });
    }

    return fetch(input, init);
  };
}

export async function generatePoToken(): Promise<{
  poToken: string;
  visitorData: string;
}> {
  const visitorData = generateVisitorData();
  const proxiedFetch = createProxiedFetch();

  // Step 1: Create BotGuard challenge
  const challenge = await BG.Challenge.create({
    fetch: proxiedFetch as any,
    globalObj: globalThis,
    identifier: visitorData,
    requestKey: REQUEST_KEY,
  });

  if (!challenge) {
    throw new Error("Failed to create BotGuard challenge");
  }

  // Step 2: Load BotGuard interpreter script
  const interpreterUrl =
    challenge.interpreterJavascript
      .privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;

  if (interpreterUrl) {
    const scriptUrl = interpreterUrl.startsWith("//")
      ? `https:${interpreterUrl}`
      : interpreterUrl;
    const resp = await proxiedFetch(scriptUrl);
    const code = await resp.text();
    new Function(code)();
  } else if (
    challenge.interpreterJavascript
      .privateDoNotAccessOrElseSafeScriptWrappedValue
  ) {
    new Function(
      challenge.interpreterJavascript
        .privateDoNotAccessOrElseSafeScriptWrappedValue
    )();
  }

  // Step 3: Generate PoToken via BotGuard VM
  const result = await BG.PoToken.generate({
    program: challenge.program,
    bgConfig: {
      fetch: proxiedFetch as any,
      globalObj: globalThis,
      identifier: visitorData,
      requestKey: REQUEST_KEY,
    },
    globalName: challenge.globalName,
  });

  return {
    poToken: result.poToken,
    visitorData,
  };
}
