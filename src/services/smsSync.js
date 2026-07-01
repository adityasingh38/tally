import SmsAndroid from 'react-native-get-sms-android';
import { parseSMS, isBankSMS, looksLikeBankSMS } from './smsParser';
import { categoriseTransactions } from './categoriser';
import { supabase, insertTransactions, checkDuplicate, insertTransactionIfNew } from './supabase';
import { checkBudgetAlerts } from './budgetAlerts';
import { enqueuePending, flushPendingTransactions } from './offlineQueue';

const BATCH_SIZE = 20;

export async function syncHistoricalSMS(userId, onProgress) {
  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox', maxCount: 500 }),
      reject,
      async (count, smsList) => {
        const messages = JSON.parse(smsList);
        // Match by known sender ID, or fall back to content for unlisted banks.
        const bankMessages = messages.filter(
          sms => isBankSMS(sms.address) || looksLikeBankSMS(sms.body)
        );

        onProgress?.({ total: bankMessages.length, processed: 0 });

        const parsed = bankMessages
          .map(sms => {
            const result = parseSMS(sms.body, sms.address);
            if (!result) return null;
            return {
              ...result,
              txn_date: new Date(parseInt(sms.date)).toISOString(),
              user_id: userId,
            };
          })
          .filter(Boolean);

        // Deduplicate and categorise in batches
        let inserted = 0;
        for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
          const batch = parsed.slice(i, i + BATCH_SIZE);

          // Filter duplicates
          const fresh = [];
          for (const tx of batch) {
            const isDup = await checkDuplicate({
              userId,
              amount: tx.amount,
              type: tx.type,
              txnDate: new Date(tx.txn_date),
              merchantTail: tx.merchant_tail,
            });
            if (!isDup) fresh.push(tx);
          }

          if (fresh.length === 0) continue;

          const categorised = await categoriseTransactions(fresh);
          const toInsert = categorised.map(tx => ({
            user_id: tx.user_id,
            amount: tx.amount,
            type: tx.type,
            merchant: tx.merchant,
            merchant_tail: tx.merchant_tail,
            category: tx.category,
            source: tx.source,
            txn_date: tx.txn_date,
          }));

          await insertTransactions(toInsert);
          inserted += toInsert.length;
          onProgress?.({ total: bankMessages.length, processed: i + batch.length, inserted });
        }

        if (inserted > 0) {
          checkBudgetAlerts(userId).catch(() => {});
        }
        resolve({ total: bankMessages.length, inserted });
      }
    );
  });
}

/**
 * Headless JS entry point for an incoming SMS (registered as "TallySmsTask" in
 * index.js, started by the native HeadlessSmsService). Runs whether the app is
 * foreground, background, or killed. Reads the user from the persisted Supabase
 * session, so no userId needs to be passed in.
 */
export async function handleHeadlessSms({ originatingAddress, messageBody, timestampMillis }) {
  if (!isBankSMS(originatingAddress) && !looksLikeBankSMS(messageBody)) return;

  const parsed = parseSMS(messageBody, originatingAddress);
  if (!parsed) return;

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return; // not signed in — nothing to attribute the txn to

  // Opportunistic retry of anything queued from a previous offline capture —
  // this may be the first headless invocation since connectivity returned.
  await flushPendingTransactions(userId).catch(() => {});

  // Real SMS timestamp from the native receiver, not the time this headless
  // task happened to run (Android can defer it minutes under Doze).
  const txnDate = timestampMillis ? new Date(timestampMillis) : new Date();
  const txn = { ...parsed, user_id: userId, txn_date: txnDate.toISOString() };

  const [categorised] = await categoriseTransactions([txn]);
  const toInsert = {
    user_id: userId,
    amount: categorised.amount,
    type: categorised.type,
    merchant: categorised.merchant,
    merchant_tail: categorised.merchant_tail,
    category: categorised.category,
    source: categorised.source,
    txn_date: categorised.txn_date,
  };
  // Atomic dedup+insert — closes the race between this and the notification
  // capture path firing for the same real-world transaction near-simultaneously.
  const { data, error } = await insertTransactionIfNew(toInsert);
  if (error) { await enqueuePending(toInsert); return; } // no network — retry later, don't lose the capture
  if (!data?.[0]?.inserted) return; // genuine duplicate, nothing to do

  await checkBudgetAlerts(userId).catch(() => {});
}

/**
 * Headless JS entry point for a captured bank/UPI app notification (registered
 * as "TallyNotifTask" in index.js, started by HeadlessNotifService). The native
 * side has already whitelisted the source app, so — unlike SMS — we don't gate
 * on a bank sender ID; we trust the package and let parseSMS gatekeep the body
 * (amount + debit/credit keyword, promo/OTP filtered out).
 *
 * Dedup is what keeps this honest when both a bank SMS *and* a UPI-app
 * notification fire for the same transaction: same amount/type/date/tail within
 * the dedup window collapses to one row.
 */
export async function handleHeadlessNotification({ packageName, body, postTime }) {
  if (!body) return;

  const parsed = parseSMS(body, packageName || 'notification');
  if (!parsed) return;

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  await flushPendingTransactions(userId).catch(() => {});

  // Real notification post time, not headless-task-execution time.
  const txnDate = postTime ? new Date(postTime) : new Date();
  const txn = { ...parsed, user_id: userId, txn_date: txnDate.toISOString() };

  const [categorised] = await categoriseTransactions([txn]);
  const toInsert = {
    user_id: userId,
    amount: categorised.amount,
    type: categorised.type,
    merchant: categorised.merchant,
    merchant_tail: categorised.merchant_tail,
    category: categorised.category,
    source: categorised.source,
    txn_date: categorised.txn_date,
  };
  // Atomic dedup+insert — see handleHeadlessSms for why this replaced
  // checkDuplicate+insertTransactions here.
  const { data, error } = await insertTransactionIfNew(toInsert);
  if (error) { await enqueuePending(toInsert); return; }
  if (!data?.[0]?.inserted) return;

  await checkBudgetAlerts(userId).catch(() => {});
}
