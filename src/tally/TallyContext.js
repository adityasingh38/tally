// src/tally/TallyContext.js
// Provides theme + prefs + a live transaction store to all Tally screens.
// Prefs (dark/accent/tone/nihilism) persist via AsyncStorage.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, resolveAccent } from './theme';
import { SEED_TXS } from './data';

const PREFS_KEY = 'tally_prefs_v1';
const REACT_KEY = 'tally_reactions_v1';
const DEFAULT_PREFS = { dark: true, accent: 'red', tone: 'unhinged', nihil: 2 };

const Ctx = createContext(null);
export const useTally = () => useContext(Ctx);

export function TallyProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [reactions, setReactions] = useState({});
  const [realTxs, setRealTxs] = useState([]);     // fed by TxBridge (optional)
  const [localTxs, setLocalTxs] = useState(null);  // manual adds layer on top
  const [modal, setModal] = useState(null); // 'add' | 'paywall' | null

  // hydrate persisted prefs + reactions
  useEffect(() => {
    (async () => {
      try {
        const p = await AsyncStorage.getItem(PREFS_KEY);
        if (p) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(p) });
        const r = await AsyncStorage.getItem(REACT_KEY);
        if (r) setReactions(JSON.parse(r));
      } catch (e) {}
    })();
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

  const setRealTransactions = useCallback((list) => setRealTxs(list || []), []);

  const addTx = useCallback((tx) => {
    setLocalTxs((prev) => {
      const base = prev || (realTxs.length ? realTxs : SEED_TXS);
      return [{ id: 'u' + Date.now(), when: 'just now', sms: false, type: 'debit', ...tx }, ...base];
    });
  }, [realTxs]);

  const txs = localTxs || (realTxs.length ? realTxs : SEED_TXS);

  const theme = THEMES[prefs.dark ? 'dark' : 'light'];
  const { accent, accentInk } = resolveAccent(theme, prefs.accent);

  const value = {
    T: theme, accent, accentInk,
    prefs, setPref,
    store: { txs, addTx, reactions, react },
    setRealTransactions,
    modal,
    openAdd: () => setModal('add'),
    openPaywall: () => setModal('paywall'),
    closeModal: () => setModal(null),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
