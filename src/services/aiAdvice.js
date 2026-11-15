import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { FREEMIUM } from '../constants';

const VERDICT_CACHE_PREFIX = 'tally_verdict_v2';
const VERDICT_TTL_MS = 6 * 60 * 60 * 1000; // 6 h — refresh as data accumulates

function buildSystemPrompt(tone, nihil) {
  const style = tone === 'unhinged'
    ? 'You are deeply unbothered about their feelings. Roast them accurately. Lowercase, casual, gen-z adjacent. One emoji max per verdict.'
    : 'You are dry and deadpan. Understated, factual, a little bleak. No emoji. Professional nihilism.';

  const darkness =
    nihil >= 3 ? 'Go full feral. No mercy. Maximum financial despair.' :
    nihil >= 2 ? 'Medium dark. Honest, a little cutting.' :
                 'Mild. Truthful but not brutal.';

  return `You are Tally's financial verdict AI for Indian users. ${style} ${darkness}

Write exactly 3 verdict lines about this month's spending. Each must:
- Reference real rupee amounts from the data
- Be specific and personal, not generic advice
- Be 1-2 sentences max

Return a JSON array of exactly 3 objects:
[{"tag": "FOOD", "line": "...", "sub": "..."}]
- "tag": 4-6 char UPPERCASE category label (FOOD, MOVE, DOOM, SHOP, SUBS, RENT, etc.)
- "line": the verdict sentence(s)
- "sub": a dry 3-6 word footnote

Examples for dry tone:
[
  {"tag":"FOOD","line":"₹8,400 on food. You're paying restaurant rent.","sub":"34% of everything spent"},
  {"tag":"TREND","line":"Spending up ₹4k from last month. Consistent, if nothing else.","sub":"the trajectory is clear"},
  {"tag":"SUBS","line":"₹1,800 in subscriptions. Half are guilt.","sub":"4 services, 2 used"}
]

Examples for unhinged tone:
[
  {"tag":"FOOD","line":"₹8,400 on swiggy alone. You don't have a kitchen, you have a wifi password for a restaurant.","sub":"cook once. As a treat 🫡"},
  {"tag":"DOOM","line":"you spent 78% of your income and it's the 15th. The rest of the month is a vibe.","sub":"₹2k left to pretend"},
  {"tag":"SHOP","line":"₹5,200 on things that seemed necessary at 2am.","sub":"they were not necessary"}
]

Output ONLY the JSON array. No markdown fences, no explanation.`;
}

export async function askAI({ question, cats, total, income }) {
  const incomeCtx = income
    ? `Monthly income: ₹${income.toLocaleString('en-IN')}. Spent: ₹${Math.round(total).toLocaleString('en-IN')} (${Math.round(total / income * 100)}%).`
    : `Total spent: ₹${Math.round(total).toLocaleString('en-IN')}.`;
  const catCtx = cats.slice(0, 5).map(c => `${c.label}: ₹${Math.round(c.amount).toLocaleString('en-IN')}`).join(', ');
  const system = 'You are Tally, a personal finance AI for Indian users. Answer concisely in 2-3 sentences. Reference specific rupee amounts from the spending data. No markdown, no bullet points, no emoji.';
  const content = `Spending data: ${incomeCtx} Categories: ${catCtx}.\n\nQuestion: ${question}`;
  try {
    return await callAnthropic(system, content);
  } catch (error) {
    if (error?.context?.status === 429) {
      return `daily AI limit reached. Tally Pro gets ${FREEMIUM.PREMIUM_AI_DAILY_LIMIT} requests a day; free gets ${FREEMIUM.FREE_AI_DAILY_LIMIT}. Try again tomorrow or upgrade.`;
    }
    return "couldn't reach tally AI right now. Try again in a moment.";
  }
}

export async function createPurchasePlan({ goal, cost, months, income, spent, categories }) {
  const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
    body: { kind: 'purchase_plan', goal, cost, months, income, spent, categories },
  });
  if (error) {
    const status = error?.context?.status;
    if (status === 429) throw new Error('Daily AI limit reached. Try again tomorrow.');
    if (status === 403) throw new Error('Tally Pro is required to make a purchase plan.');
    throw new Error('Could not make a plan right now. Try again shortly.');
  }
  if (!data?.text) throw new Error('Tally did not return a plan. Try again.');
  return data.text;
}

async function callAnthropic(system, content) {
  const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
    body: { system, content },
  });
  if (error) throw error;
  if (!data?.text) throw new Error('Empty response from anthropic-proxy');
  return data.text;
}

export async function getAIVerdict({ cats, total, income, tone = 'dry', nihil = 2 }) {
  const cacheKey = `${VERDICT_CACHE_PREFIX}_${tone}_${nihil}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { verdict, timestamp, totalSnapshot } = JSON.parse(cached);
      const spendUnchanged = Math.abs(totalSnapshot - total) < 500;
      if (spendUnchanged && Date.now() - timestamp < VERDICT_TTL_MS) return verdict;
    }
  } catch {}

  const totalRounded = Math.round(total);
  const incomeContext = income
    ? `Monthly income: ₹${income.toLocaleString('en-IN')}\nSpent so far: ₹${totalRounded.toLocaleString('en-IN')} (${Math.round(total / income * 100)}% of income)`
    : `Total spent this month: ₹${totalRounded.toLocaleString('en-IN')}`;

  const catLines = cats.slice(0, 5)
    .map(c => `${c.label}: ₹${Math.round(c.amount).toLocaleString('en-IN')} (${c.pct}% of spend)`)
    .join('\n');

  const content = `${incomeContext}\n\nTop spending categories:\n${catLines}`;

  try {
    const text = await callAnthropic(buildSystemPrompt(tone, nihil), content);
    const clean = text.replace(/```(?:json)?\n?/g, '').trim();
    const verdict = JSON.parse(clean);
    if (!Array.isArray(verdict) || verdict.length < 3) throw new Error('Bad response shape');

    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      verdict: verdict.slice(0, 3),
      timestamp: Date.now(),
      totalSnapshot: total,
    }));
    return verdict.slice(0, 3);
  } catch {
    return buildFallbackVerdict(cats, total, income, tone);
  }
}

function buildFallbackVerdict(cats, total, income, tone) {
  const fmt = (n) => Math.round(n).toLocaleString('en-IN');
  const unhinged = tone === 'unhinged';
  const results = [];

  if (cats[0]) {
    const c = cats[0];
    const pct = Math.round(c.amount / total * 100);
    results.push(unhinged
      ? { tag: c.tag, line: `₹${fmt(c.amount)} on ${c.label.toLowerCase()}. You live here now.`, sub: `${pct}% of everything gone` }
      : { tag: c.tag, line: `₹${fmt(c.amount)} on ${c.label.toLowerCase()}. Leads the damage report.`, sub: `${pct}% of total spend` }
    );
  }

  const pctIncome = income ? Math.round(total / income * 100) : null;
  if (pctIncome !== null) {
    const left = Math.max(0, income - total);
    results.push(unhinged
      ? { tag: 'DOOM', line: `${pctIncome}% of your income is already gone. The rest is vibes and anxiety.`, sub: `₹${fmt(left)} remains` }
      : { tag: 'RATIO', line: `${pctIncome}% of income spent. Month isn't over.`, sub: `₹${fmt(left)} remaining` }
    );
  }

  if (cats[1]) {
    const c = cats[1];
    results.push(unhinged
      ? { tag: c.tag, line: `₹${fmt(c.amount)} on ${c.label.toLowerCase()} too. Two-front war on your wallet.`, sub: 'the second biggest hole' }
      : { tag: c.tag, line: `${c.label} at ₹${fmt(c.amount)} · runner-up damage.`, sub: 'second largest category' }
    );
  }

  while (results.length < 3) {
    results.push({ tag: 'MISC', line: 'spending logged. Consequences pending.', sub: 'tally is watching' });
  }

  return results.slice(0, 3);
}
