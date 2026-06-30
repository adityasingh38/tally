import notifee, { AndroidImportance, TriggerType, RepeatFrequency } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const DIGEST_CHANNEL = 'weekly_digest';
const DIGEST_TRIGGER_KEY = 'tally_digest_trigger_id';

export async function setupWeeklyDigestChannel() {
  await notifee.createChannel({
    id: DIGEST_CHANNEL,
    name: 'Weekly Summary',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function scheduleWeeklyDigest() {
  await setupWeeklyDigestChannel();

  const existingId = await AsyncStorage.getItem(DIGEST_TRIGGER_KEY);
  if (existingId) {
    await notifee.cancelTriggerNotification(existingId).catch(() => {});
  }

  const now = new Date();
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
  nextSunday.setHours(9, 0, 0, 0);

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextSunday.getTime(),
    repeatFrequency: RepeatFrequency.WEEKLY,
  };

  const id = await notifee.createTriggerNotification(
    {
      title: 'Your weekly Tally summary',
      body: 'Open Tally to see where your money went this week.',
      android: { channelId: DIGEST_CHANNEL, pressAction: { id: 'open_insights' } },
    },
    trigger
  );

  await AsyncStorage.setItem(DIGEST_TRIGGER_KEY, id);
}

export async function sendInstantDigest({ total, topCategory, txnCount }) {
  await notifee.displayNotification({
    title: `This week: ${total.toLocaleString('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' })} spent`,
    body: `${txnCount} transactions · Most on ${topCategory}`,
    android: {
      channelId: DIGEST_CHANNEL,
      pressAction: { id: 'open_insights' },
    },
  });
}

const MONTH_END_KEY = 'tally_month_end_trigger_id';

export async function scheduleMonthEndSummary() {
  await setupWeeklyDigestChannel();

  // cancel any existing month-end trigger
  const existingId = await AsyncStorage.getItem(MONTH_END_KEY);
  if (existingId) await notifee.cancelTriggerNotification(existingId).catch(() => {});

  // last day of this month at 20:00; if that's past, use next month
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 20, 0, 0, 0);
  if (lastDay.getTime() <= now.getTime() + 60_000) {
    lastDay.setMonth(lastDay.getMonth() + 2, 0); // last day of next month
    lastDay.setHours(20, 0, 0, 0);
  }

  const id = await notifee.createTriggerNotification(
    {
      title: 'Month-end damage report',
      body: "The month's over. Open Tally and face the music.",
      android: { channelId: DIGEST_CHANNEL, pressAction: { id: 'open_insights' } },
    },
    { type: TriggerType.TIMESTAMP, timestamp: lastDay.getTime() }
  );

  await AsyncStorage.setItem(MONTH_END_KEY, id);
}

export async function sendWeeklyDigestWithRealData(userId) {
  if (!userId) return;

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);

  const { data } = await supabase
    .from('transactions')
    .select('amount, category, type')
    .eq('user_id', userId)
    .eq('type', 'debit')
    .gte('txn_date', fromDate.toISOString());

  if (!data || data.length === 0) return;

  const total = data.reduce((sum, t) => sum + (t.amount || 0), 0);
  const catTotals = {};
  data.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'misc';

  await sendInstantDigest({ total, topCategory, txnCount: data.length });
}
