import Anthropic from '@anthropic-ai/sdk';
import { ruleBasedCategory } from './smsParser';
import { CATEGORIES } from '../constants';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const CATEGORY_IDS = CATEGORIES.map(c => c.id).join(', ');

const SYSTEM_PROMPT = `You are a financial transaction categoriser for Indian users. Given a list of transactions (merchant name + SMS snippet), classify each into exactly one category.

Categories: ${CATEGORY_IDS}

Rules:
- Return ONLY a JSON array, no explanation
- Each item: { "index": number, "category": string, "confidence": number (0-1) }
- confidence < 0.5 → use "other"
- Be decisive — pick best match, never null`;

export async function categoriseTransactions(transactions) {
  // Apply rule-based first
  const results = transactions.map((tx, i) => {
    const ruleCategory = ruleBasedCategory(tx.merchant, tx.raw_sms);
    return { index: i, category: ruleCategory, needsAI: !ruleCategory };
  });

  const needsAI = results.filter(r => r.needsAI);
  if (needsAI.length === 0) {
    return results.map((r, i) => ({ ...transactions[i], category: r.category }));
  }

  // Batch AI categorisation for unknowns
  const aiInput = needsAI.map(r => {
    const tx = transactions[r.index];
    return `${r.index}: merchant="${tx.merchant}" sms="${tx.raw_sms.substring(0, 100)}"`;
  }).join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: aiInput }],
    });

    const text = response.content[0].text.trim();
    const aiResults = JSON.parse(text);

    aiResults.forEach(({ index, category, confidence }) => {
      results[index].category = confidence >= 0.5 ? category : 'other';
    });
  } catch {
    needsAI.forEach(r => { results[r.index].category = 'other'; });
  }

  return results.map((r, i) => ({ ...transactions[i], category: r.category || 'other' }));
}
