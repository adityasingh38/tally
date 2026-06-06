// Supabase Edge Function — proxies Anthropic Messages API so the API key
// never ships inside the mobile bundle.
//
// Deploy:
//   supabase functions deploy anthropic-proxy
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// JWT verification is on by default, so only authenticated app users can call it
// (supabase-js attaches the user's access token automatically via functions.invoke).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 512;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  let body: { system?: unknown; content?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const content = body.content;
  if (typeof content !== "string" || content.length === 0) {
    return json({ error: "`content` (string) is required" }, 400);
  }
  const system = typeof body.system === "string" ? body.system : undefined;

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return json({ error: data?.error?.message ?? "Upstream error" }, 502);
    }

    const text = (data?.content?.[0]?.text ?? "").trim();
    return json({ text });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
