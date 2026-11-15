// Supabase Edge Function — proxies Gemini / Anthropic API so the API key
// never ships inside the mobile bundle, with a per-user daily rate limit.
//
// Deploy:
//   supabase functions deploy anthropic-proxy
//   supabase secrets set GEMINI_API_KEY=AIzaSy... (or ANTHROPIC_API_KEY=sk-ant-...)
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// JWT verification is on by default, so only authenticated app users can call it
// (supabase-js attaches the user's access token automatically via functions.invoke).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { hasProEntitlement, revenueCatConfigured } from '../_shared/revenuecat.ts';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 512;
const FREE_DAILY_LIMIT = 10;
const PRO_DAILY_LIMIT = 50;
const CATEGORIZATION_DAILY_LIMIT = 100;
const CATEGORY_IDS = 'food, transport, shopping, entertainment, health, utilities, rent, transfer, investment, other';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!GEMINI_API_KEY && !ANTHROPIC_API_KEY) {
    return json({ error: "AI API key not configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY)" }, 500);
  }

  // Identify the caller from their JWT.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user }, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'Expected a JSON object' }, 400);
  }

  const kind = body.kind === 'categorization' ? 'categorization'
    : body.kind === 'purchase_plan' ? 'purchase_plan' : 'general';
  let content: string;
  let system: string | undefined;
  if (kind === 'categorization') {
    const rows = body.transactions;
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 20 ||
      !rows.every(row => row && typeof row.merchant === 'string' &&
        typeof row.sms === 'string' && row.merchant.length <= 80 && row.sms.length <= 100)) {
      return json({ error: 'Provide 1–20 short transactions' }, 400);
    }
    system = `Categorise Indian transactions. Allowed categories: ${CATEGORY_IDS}. Return ONLY a JSON array of {"index": number, "category": string, "confidence": number}. Keep indexes in input order. If uncertain, choose other.`;
    content = rows.map((row, index) => `${index}: merchant=${JSON.stringify(row.merchant)} sms=${JSON.stringify(row.sms)}`).join('\n');
  } else if (kind === 'purchase_plan') {
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    const cost = Number(body.cost);
    const months = Number(body.months);
    const income = body.income == null ? null : Number(body.income);
    const spent = Number(body.spent);
    if (!goal || goal.length > 80 || !Number.isFinite(cost) || cost <= 0 || cost > 1e9 ||
      !Number.isInteger(months) || months < 1 || months > 60 ||
      (income !== null && (!Number.isFinite(income) || income < 0 || income > 1e9)) ||
      !Number.isFinite(spent) || spent < 0 || spent > 1e9 ||
      !Array.isArray(body.categories) || body.categories.length > 10) {
      return json({ error: 'Invalid purchase goal or spending summary' }, 400);
    }
    const categories = body.categories.filter((row): row is { label: string; amount: number } =>
      !!row && typeof row.label === 'string' && row.label.length <= 40 &&
      typeof row.amount === 'number' && Number.isFinite(row.amount) && row.amount >= 0);
    if (categories.length !== body.categories.length) return json({ error: 'Invalid spending categories' }, 400);
    const monthlyNeeded = Math.ceil(cost / months);
    system = `You are Tally's purchase planner for Indian users. Use only the supplied figures. Give a practical plan in 4 short numbered steps. Mention the monthly saving target and whether the supplied income and spending suggest a shortfall. Suggest cuts in flexible categories only; do not suggest missing bills or claim to know savings or debts. If income is missing, say affordability cannot be confirmed. Do not recommend borrowing or financial products. Plain text, no markdown.`;
    content = JSON.stringify({ goal, cost, months, monthlyNeeded, income, spentThisMonth: spent, categories });
  } else {
    if (typeof body.content !== 'string' || body.content.length === 0 || body.content.length > 4000) {
      return json({ error: '`content` (1–4000 characters) is required' }, 400);
    }
    content = body.content;
    system = typeof body.system === 'string' ? body.system.slice(0, 4000) : undefined;
  }

  // Categorisation is available to every user and has its own abuse cap.
  // It never consumes the interactive AI quota.
  if (kind === 'categorization') {
    const { data: allowed, error } = await admin.rpc('increment_categorization_usage', {
      p_user: user.id, p_limit: CATEGORIZATION_DAILY_LIMIT,
    });
    if (error) return json({ error: 'Categorisation limit check failed' }, 500);
    if (!allowed) return json({ error: 'Daily categorisation limit reached' }, 429);
  }

  // The client cannot choose its tier. RevenueCat is queried by the verified
  // Supabase user ID, which is also the SDK's App User ID.
  let isPro = false;
  if (kind !== 'categorization' && revenueCatConfigured()) {
    try {
      isPro = await hasProEntitlement(user.id);
    } catch {
      return json({ error: "Subscription check unavailable" }, 503);
    }
  }

  if (kind === 'purchase_plan' && !isPro) {
    return json({ error: 'Tally Pro is required for purchase plans' }, 403);
  }

  if (kind !== 'categorization') {
    const dailyLimit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
    const { data: underLimit, error: rlErr } = await admin.rpc("increment_api_usage", {
      p_user: user.id, p_limit: dailyLimit,
    });
    if (rlErr) return json({ error: "Rate-limit check failed" }, 500);
    if (!underLimit) return json({ error: `Daily AI limit reached (${dailyLimit} requests). Try again tomorrow.` }, 429);
  }

  try {
    let text: string;
    if (GEMINI_API_KEY) {
      try {
        text = await callGemini(system, content, kind === 'categorization');
      } catch (geminiErr) {
        if (ANTHROPIC_API_KEY) {
          text = await callAnthropic(system, content);
        } else {
          throw geminiErr;
        }
      }
    } else {
      text = await callAnthropic(system, content);
    }
    return json({ text });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});

async function callGemini(system: string | undefined, content: string, jsonMode: boolean): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [{ text: content }],
      },
    ],
    generationConfig: {
      temperature: jsonMode ? 0.1 : 0.3,
      maxOutputTokens: MAX_TOKENS,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (system) {
    body.system_instruction = {
      parts: [{ text: system }],
    };
  }

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    throw new Error(data?.error?.message ?? `Gemini error (HTTP ${upstream.status})`);
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof rawText !== "string") {
    throw new Error("Empty candidate response from Gemini");
  }
  return rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

async function callAnthropic(system: string | undefined, content: string): Promise<string> {
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content }],
    }),
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    throw new Error(data?.error?.message ?? `Anthropic error (HTTP ${upstream.status})`);
  }

  return (data?.content?.[0]?.text ?? "").trim();
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
