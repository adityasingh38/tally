import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const ADVICE_CACHE_KEY = 'tally_ai_advice';
const ADVICE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SYSTEM_PROMPT = `You are a friendly, non-judgmental financial coach for Indian users.
Analyze spending data and give exactly 3 specific, actionable tips.
Each tip must reference actual numbers from the data.
Tone: encouraging, concrete, never preachy.
Format: JSON array of { "tip": string, "saving": string, "icon": emoji }`;

async function callAnthropic(systemPrompt, userContent) {
  const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
    body: { system: systemPrompt, content: userContent },
  });
  if (error) throw error;
  if (!data?.text) throw new Error('Empty response from anthropic-proxy');
  return data.text;
}

export async function getAIAdvice(spendingData, userGoal) {
  // Check cache — don't call API more than once per week
  const cached = await AsyncStorage.getItem(ADVICE_CACHE_KEY);
  if (cached) {
    const { advice, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < ADVICE_TTL_MS) return advice;
  }

  const input = formatSpendingForPrompt(spendingData, userGoal);

  try {
    const text = await callAnthropic(SYSTEM_PROMPT, input);
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
