import notifee, { AndroidImportance, TriggerType, RepeatFrequency } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  // Channel must exist before a trigger notification targets it
  await setupWeeklyDigestChannel();

  // Cancel existing trigger first
  const existingId = await AsyncStorage.getItem(DIGEST_TRIGGER_KEY);
  if (existingId) {
    await notifee.cancelTriggerNotification(existingId).catch(() => {});
  }

  // Next Sunday 9am
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
      title: 'Your weekly Tally summary 📊',
      body: 'Tap to see where your money went this week.',
      android: { channelId: DIGEST_CHANNEL, pressAction: { id: 'open_insights' } },
    },
    trigger
  );

  await AsyncStorage.setItem(DIGEST_TRIGGER_KEY, id);
}

export async function sendInstantDigest({ total, topCategory, txnCount }) {
  await notifee.displayNotification({
    title: `This week: ₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })} spent`,
    body: `${txnCount} transactions · Most on ${topCategory}`,
    android: {
      channelId: DIGEST_CHANNEL,
      pressAction: { id: 'open_insights' },
    },
  });
}
