// src/services/offlineQueue.js
// A captured SMS/notification is a one-shot event — if insertTransactionIfNew
// fails because there's no network, the transaction is gone forever unless
// it's buffered somewhere. This queues it locally and retries on reconnect
// (see NetInfo listener in TallyContext) and opportunistically on every new
// headless capture.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertTransactionIfNew } from './supabase';
import { checkBudgetAlerts } from './budgetAlerts';

const QUEUE_KEY = 'tally_offline_queue_v1';
const MAX_QUEUE = 200; // defensive cap — a phone offline long enough to hit this has bigger problems

async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // best-effort; if this fails the item that triggered it is already lost,
    // nothing further to do
  }
}

export async function enqueuePending(tx) {
  const queue = await readQueue();
  queue.push(tx);
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  await writeQueue(queue);
}

// Retries queued transactions for the given user only — if a different
// account is signed in when connectivity returns, that user's items stay
// queued untouched rather than leaking into the wrong account.
export async function flushPendingTransactions(userId) {
  if (!userId) return;
  const queue = await readQueue();
  if (queue.length === 0) return;

  const mine = queue.filter(tx => tx.user_id === userId);
  const others = queue.filter(tx => tx.user_id !== userId);
  if (mine.length === 0) return;

  const stillPending = [];
  let insertedAny = false;
  for (const tx of mine) {
    const { data, error } = await insertTransactionIfNew(tx);
    if (error) { stillPending.push(tx); continue; } // still offline / still failing — keep it queued
    if (data?.[0]?.inserted) insertedAny = true;
    // no error + not inserted == real duplicate, safe to drop
  }

  await writeQueue([...others, ...stillPending]);
  if (insertedAny) await checkBudgetAlerts(userId).catch(() => {});
}
