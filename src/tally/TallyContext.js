// src/tally/TallyContext.js
// Provides theme + prefs + a live transaction store to all Tally screens.
// Prefs (dark/accent/tone/nihilism) persist via AsyncStorage.
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, resolveAccent } from './theme';
import { SEED_TXS } from './data';
import { deleteTransaction, updateTransactionCategory } from '../services/supabase';
import { usePremium } from '../hooks/usePremium';

const FREE_HISTORY_DAYS = 30;

const PREFS_KEY = 'tally_prefs_v1';
const REACT_KEY = 'tally_reactions_v1';
const INCOME_KEY = 'tally_income';
const DEFAULT_PREFS = { dark: true, accent: 'red', tone: 'unhinged', nihil: 2 };

function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

const Ctx = createContext(null);
export const useTally = () => useContext(Ctx);

export function TallyProvider({ children }) {
  const { isPremium } = usePremium();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [reactions, setReactions] = useState({});
  const [realTxs, setRealTxs] = useState([]);     // fed by TxBridge
  const [txsLoaded, setTxsLoaded] = useState(false); // TxBridge has reported (even if empty)
  const [refreshing, setRefreshing] = useState(false);
  const [localTxs, setLocalTxs] = useState(null);  // manual adds layer on top
  const [modal, setModal] = useState(null); // 'add' | 'paywall' | 'txDetail' | null
  const [selectedTx, setSelectedTx] = useState(null);
  const [income, setIncomeState] = useState(null); // monthly income (₹), user-set
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const refetchRef = useRef(null);                  // TxBridge registers its refetch here

  // hydrate persisted prefs + reactions + income
  useEffect(() => {
    (async () => {
      try {
        const p = await AsyncStorage.getItem(PREFS_KEY);
        if (p) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(p) });
        const r = await AsyncStorage.getItem(REACT_KEY);
        if (r) setReactions(JSON.parse(r));
        const inc = await AsyncStorage.getItem(INCOME_KEY);
        if (inc) setIncomeState(Number(inc) || null);
      } catch (e) {}
    })();
  }, []);

  const setIncome = useCallback((v) => {
    const n = Number(v) || 0;
    setIncomeState(n || null);
    AsyncStorage.setItem(INCOME_KEY, String(n)).catch(() => {});
  }, []);

  const setPref = useCallback((k, v) => {
    setPrefs((prev) => {
      const next = { ...prev, [k]: v };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const react = useCallback((id, r) => {
    setReactions((prev) => {
      const next = { ...prev, [id]: prev[id] === r ? null : r };
      AsyncStorage.setItem(REACT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setRealTransactions = useCallback((list) => {
    setRealTxs(list || []);
    setTxsLoaded(true);
    setRefreshing(false);
  }, []);

  // TxBridge hands us its refetch so pull-to-refresh can re-pull from Supabase.
  const registerRefetch = useCallback((fn) => { refetchRef.current = fn; }, []);
  const refreshTxs = useCallback(() => {
    if (refetchRef.current) {
      setRefreshing(true);
      Promise.resolve(refetchRef.current()).catch(() => setRefreshing(false));
    }
  }, []);

  const addTx = useCallback((tx) => {
    setLocalTxs((prev) => {
      const base = prev || (txsLoaded ? realTxs : SEED_TXS);
      return [{ id: 'u' + Date.now(), when: 'just now', sms: false, type: 'debit',
        txn_date: new Date().toISOString(), ...tx }, ...base];
    });
  }, [realTxs, txsLoaded]);

  const deleteTx = useCallback(async (tx) => {
    const isLocal = String(tx.id).startsWith('u');
    if (!isLocal) await deleteTransaction(tx.id).catch(() => {});
    setLocalTxs((prev) => {
      const base = prev || (txsLoaded ? realTxs : SEED_TXS);
      return base.filter(t => t.id !== tx.id);
    });
    if (!isLocal) setRealTxs(prev => prev.filter(t => t.id !== tx.id));
  }, [realTxs, txsLoaded]);

  const updateTxCategory = useCallback(async (tx, category) => {
    const isLocal = String(tx.id).startsWith('u');
    if (!isLocal) await updateTransactionCategory(tx.id, category).catch(() => {});
    const patch = (list) => list.map(t => t.id === tx.id ? { ...t, category } : t);
    setLocalTxs(prev => prev ? patch(prev) : patch(txsLoaded ? realTxs : SEED_TXS));
    if (!isLocal) setRealTxs(prev => patch(prev));
  }, [realTxs, txsLoaded]);

  // Seed is only a pre-load placeholder; once your data loads we show YOURS
  // (even if empty → honest empty states, not fake demo spends).
  const rawAllTxs = localTxs || (txsLoaded ? realTxs : SEED_TXS);
  const freeFrom = isPremium ? null : (() => {
    const d = new Date(); d.setDate(d.getDate() - FREE_HISTORY_DAYS); return d;
  })();
  const allTxs = freeFrom
    ? rawAllTxs.filter(tx => !tx.txn_date || new Date(tx.txn_date) >= freeFrom)
    : rawAllTxs;
  // Filter to selected month — txns without txn_date (old seeds) pass through.
  const txs = allTxs.filter(tx => {
    if (!tx.txn_date) return true;
    const d = new Date(tx.txn_date);
    return d.getFullYear() === selectedMonth.year && d.getMonth() === selectedMonth.month;
  });

  const theme = THEMES[prefs.dark ? 'dark' : 'light'];
  const { accent, accentInk } = resolveAccent(theme, prefs.accent);

  const value = {
    T: theme, accent, accentInk,
    isPremium,
    prefs, setPref,
    income, setIncome,
    store: { txs, allTxs, addTx, deleteTx, updateTxCategory, reactions, react },
    selectedMonth, setSelectedMonth,
    setRealTransactions,
    registerRefetch,
    refreshing,
    refreshTxs,
    modal,
    selectedTx,
    openAdd: () => setModal('add'),
    openPaywall: () => setModal('paywall'),
    openTx: (tx) => { setSelectedTx(tx); setModal('txDetail'); },
    closeModal: () => setModal(null),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
