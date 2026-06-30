import notifee, { AndroidImportance } from '@notifee/react-native';
import { getBudgets, getSpendingByCategory } from './supabase';

const CHANNEL_ID = 'budget_alerts';

export async function setupNotificationChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Budget Alerts',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function checkBudgetAlerts(userId) {
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const [{ data: budgets }, { data: txns }] = await Promise.all([
    getBudgets(userId),
    getSpendingByCategory({ userId, fromDate, toDate: now }),
  ]);

  if (!budgets || !txns) return;

  // Aggregate spending per category
  const spent = {};
  txns.forEach(({ category, amount }) => {
    spent[category] = (spent[category] || 0) + amount;
  });

  for (const budget of budgets) {
    const categorySpent = spent[budget.category] || 0;
    const ratio = categorySpent / budget.monthly_limit;

    if (ratio >= budget.alert_threshold && ratio < 1) {
      await sendAlert({
        title: `Budget alert: ${budget.category}`,
        body: `You've used ${Math.round(ratio * 100)}% of your ₹${budget.monthly_limit.toLocaleString('en-IN')} ${budget.category} budget.`,
      });
    } else if (ratio >= 1) {
      await sendAlert({
        title: `Over budget: ${budget.category}`,
        body: `You've exceeded your ₹${budget.monthly_limit.toLocaleString('en-IN')} ${budget.category} budget by ₹${Math.round(categorySpent - budget.monthly_limit).toLocaleString('en-IN')}.`,
      });
    }
  }
}

async function sendAlert({ title, body }) {
  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: 'open_budget' },
    },
  });
}

export async function requestNotificationPermission() {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
}
