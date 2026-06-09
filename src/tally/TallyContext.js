// src/tally/TallyContext.js
// Provides theme + prefs + a live transaction store to all Tally screens.
// Prefs (dark/accent/tone/nihilism) persist via AsyncStorage.
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, resolveAccent } from './theme';
import { SEED_TXS } from './data';

const PREFS_KEY = 'tally_prefs_v1';
const REACT_KEY = 'tally_reactions_v1';
const INCOME_KEY = 'tally_income';
const DEFAULT_PREFS = { dark: true, accent: 'red', tone: 'unhinged', nihil: 2 };

const Ctx = createContext(null);
export const useTally = () => useContext(Ctx);

export function TallyProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [reactions, setReactions] = useState({});
  const [realTxs, setRealTxs] = useState([]);     // fed by TxBridge
  const [txsLoaded, setTxsLoaded] = useState(false); // TxBridge has reported (even if empty)
  const [refreshing, setRefreshing] = useState(false);
  const [localTxs, setLocalTxs] = useState(null);  // manual adds layer on top
  const [modal, setModal] = useState(null); // 'add' | 'paywall' | 'txDetail' | null
  const [selectedTx, setSelectedTx] = useState(null);
  const [income, setIncomeState] = useState(null); // monthly income (₹), user-set
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
      return [{ id: 'u' + Date.now(), when: 'just now', sms: false, type: 'debit', ...tx }, ...base];
    });
  }, [realTxs, txsLoaded]);

  // Seed is only a pre-load placeholder; once your data loads we show YOURS
  // (even if empty → honest empty states, not fake demo spends).
  const txs = localTxs || (txsLoaded ? realTxs : SEED_TXS);

  const theme = THEMES[prefs.dark ? 'dark' : 'light'];
  const { accent, accentInk } = resolveAccent(theme, prefs.accent);

  const value = {
    T: theme, accent, accentInk,
    prefs, setPref,
    income, setIncome,
    store: { txs, addTx, reactions, react },
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
