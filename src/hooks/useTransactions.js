import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => { fetch(); }, [fetch]);

  return { transactions, loading, error, refetch: fetch };
}

export function useSpendingByCategory(userId, { fromDate, toDate }) {
  const [spending, setSpending] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !fromDate || !toDate) return;

    getSpendingByCategory({ userId, fromDate, toDate }).then(({ data }) => {
      if (!data) { setLoading(false); return; }

      const grouped = {};
      data.forEach(({ category, amount }) => {
        grouped[category] = (grouped[category] || 0) + amount;
      });

      const result = CATEGORIES
        .filter(c => grouped[c.id])
        .map(c => ({ ...c, amount: grouped[c.id] }))
        .sort((a, b) => b.amount - a.amount);

      const sum = result.reduce((acc, c) => acc + c.amount, 0);
      setSpending(result);
      setTotal(sum);
      setLoading(false);
    });
  }, [userId, fromDate, toDate]);

  return { spending, total, loading };
}
