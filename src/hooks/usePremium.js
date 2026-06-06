import { useState, useEffect } from 'react';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { FREEMIUM } from '../constants';

let initialized = false;

function initRevenueCat() {
  if (initialized || !FREEMIUM.REVENUE_CAT_API_KEY) return;
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: FREEMIUM.REVENUE_CAT_API_KEY });
  initialized = true;
}

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offerings, setOfferings] = useState(null);

  useEffect(() => {
    initRevenueCat();
    if (!FREEMIUM.REVENUE_CAT_API_KEY) {
      // Dev mode — treat as premium so UI isn't blocked during dev
      setIsPremium(true);
      setLoading(false);
      return;
    }

    Purchases.getCustomerInfo()
      .then(info => {
        setIsPremium(info.activeSubscriptions.length > 0);
      })
      .catch(() => setIsPremium(false))
      .finally(() => setLoading(false));

    Purchases.getOfferings()
      .then(o => setOfferings(o.current))
      .catch(() => {});
  }, []);

  async function purchase(packageToBuy) {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
      const active = customerInfo.activeSubscriptions.length > 0;
      setIsPremium(active);
      return { success: active };
    } catch (e) {
      if (!e.userCancelled) return { success: false, error: e.message };
      return { success: false, cancelled: true };
    }
  }

  async function restore() {
    try {
      const info = await Purchases.restorePurchases();
      const active = info.activeSubscriptions.length > 0;
      setIsPremium(active);
      return active;
    } catch {
      return false;
    }
  }

  return { isPremium, loading, offerings, purchase, restore };
}
