import SmsAndroid from 'react-native-get-sms-android';
import { parseSMS, isBankSMS, looksLikeBankSMS } from './smsParser';
import { categoriseTransactions } from './categoriser';
import { supabase, insertTransactions, checkDuplicate } from './supabase';
import { checkBudgetAlerts } from './budgetAlerts';

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
export async function handleHeadlessSms({ originatingAddress, messageBody }) {
  if (!isBankSMS(originatingAddress) && !looksLikeBankSMS(messageBody)) return;

  const parsed = parseSMS(messageBody, originatingAddress);
  if (!parsed) return;

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return; // not signed in — nothing to attribute the txn to

  const txn = { ...parsed, user_id: userId, txn_date: new Date().toISOString() };
  const isDup = await checkDuplicate({
    userId,
    amount: txn.amount,
    type: txn.type,
    txnDate: new Date(),
    merchantTail: txn.merchant_tail,
  });
  if (isDup) return;

  const [categorised] = await categoriseTransactions([txn]);
  await insertTransactions([{
    user_id: userId,
    amount: categorised.amount,
    type: categorised.type,
    merchant: categorised.merchant,
    merchant_tail: categorised.merchant_tail,
    category: categorised.category,
    source: categorised.source,
    txn_date: categorised.txn_date,
  }]);

  await checkBudgetAlerts(userId).catch(() => {});
}
