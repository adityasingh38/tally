import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getTransactions, getSpendingByCategory } from '../services/supabase';
import { CATEGORIES } from '../constants';

export function useTransactions(userId, { fromDate, limit = 50 } = {}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await getTransactions({ userId, limit, fromDate });
    if (error) setError(error.message);
    else setTransactions(data || []);
    setLoading(false);
  }, [userId, fromDate, limit]);

  // Refetch whenever the screen regains focus (covers live SMS inserts,
  // post-sync data, and edits made on other screens).
  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  return { transactions, loading, error, refetch: fetch };
}

export function useSpendingByCategory(userId, { fromDate, toDate }) {
  const [spending, setSpending] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId || !fromDate || !toDate) return;
    setLoading(true);
    const { data } = await getSpendingByCategory({ userId, fromDate, toDate });
    if (!data) { setLoading(false); return; }

    const grouped = {};
    data.forEach(({ category, amount }) => {
      grouped[category] = (grouped[category] || 0) + Number(amount);
    });

    const result = CATEGORIES
      .filter(c => grouped[c.id])
      .map(c => ({ ...c, amount: grouped[c.id] }))
      .sort((a, b) => b.amount - a.amount);

    setSpending(result);
    setTotal(result.reduce((acc, c) => acc + c.amount, 0));
    setLoading(false);
  }, [userId, fromDate, toDate]);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  return { spending, total, loading, refetch: fetch };
}
