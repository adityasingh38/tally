import { useState, useEffect } from 'react';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { FREEMIUM } from '../constants';

const API_KEY = FREEMIUM.REVENUE_CAT_API_KEY;
const ENTITLEMENT = FREEMIUM.ENTITLEMENT_ID;

let initialized = false;

function initRevenueCat() {
  if (initialized || !API_KEY) return;
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: API_KEY });
  initialized = true;
}

// Pro is granted by an active RevenueCat entitlement, not a raw subscription.
function hasPremium(info) {
  return !!info?.entitlements?.active?.[ENTITLEMENT];
}

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offerings, setOfferings] = useState(null);

  useEffect(() => {
    if (!API_KEY) {
      // Billing not configured: unlocked in development and in builds that opt in
      // via FORCE_PREMIUM (e.g. internal preview), but locked otherwise so we
      // never give Pro away by accident in a real release.
      setIsPremium(__DEV__ || process.env.FORCE_PREMIUM === '1');
      setLoading(false);
      return;
    }

    initRevenueCat();

    Purchases.getCustomerInfo()
      .then(info => setIsPremium(hasPremium(info)))
      .catch(() => setIsPremium(false))
      .finally(() => setLoading(false));

    Purchases.getOfferings()
      .then(o => setOfferings(o.current))
      .catch(() => {});
  }, []);

  async function purchase(packageToBuy) {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
      const active = hasPremium(customerInfo);
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
      const active = hasPremium(info);
      setIsPremium(active);
      return active;
    } catch {
      return false;
    }
  }

  return { isPremium, loading, offerings, purchase, restore };
}
