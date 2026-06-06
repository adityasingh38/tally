import Anthropic from '@anthropic-ai/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const ADVICE_CACHE_KEY = 'tally_ai_advice';
const ADVICE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SYSTEM_PROMPT = `You are a friendly, non-judgmental financial coach for Indian users.
Analyze spending data and give exactly 3 specific, actionable tips.
Each tip must reference actual numbers from the data.
Tone: encouraging, concrete, never preachy.
Format: JSON array of { "tip": string, "saving": string, "icon": emoji }`;

export async function getAIAdvice(spendingData, userGoal) {
  // Check cache — don't call API more than once per week
  const cached = await AsyncStorage.getItem(ADVICE_CACHE_KEY);
  if (cached) {
    const { advice, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < ADVICE_TTL_MS) return advice;
  }

  const input = formatSpendingForPrompt(spendingData, userGoal);

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: input }],
    });

    const text = response.content[0].text.trim();
    const advice = JSON.parse(text);

    await AsyncStorage.setItem(ADVICE_CACHE_KEY, JSON.stringify({
      advice,
      timestamp: Date.now(),
    }));

    return advice;
  } catch {
    return getDefaultAdvice(spendingData);
  }
}

function formatSpendingForPrompt(spending, goal) {
  const lines = spending.map(s =>
    `${s.label}: ₹${s.amount.toFixed(0)} (${s.pct}% of total)`
  ).join('\n');

  return `User goal: "${goal || 'save more money'}"

This month's spending:
${lines}

Give 3 specific tips to help reach their goal.`;
}

function getDefaultAdvice(spending) {
  const food = spending.find(s => s.id === 'food');
  const tips = [];

  if (food && food.pct > 30) {
    tips.push({
      tip: `Food is ${food.pct}% of your spend. Cooking 2 extra meals a week could cut this by 20%.`,
      saving: `~₹${Math.round(food.amount * 0.2).toLocaleString('en-IN')}`,
      icon: '🍳',
    });
  }
  tips.push({
    tip: 'Review subscriptions — unused ones add up fast.',
    saving: '₹200–500/mo typical',
    icon: '📱',
  });
  tips.push({
    tip: 'Set a weekly cash limit. Small daily purchases are hardest to track.',
    saving: 'Varies',
    icon: '💡',
  });

  return tips.slice(0, 3);
}
