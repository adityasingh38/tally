// src/tally/TallyNavigation.js
// Drop-in replacement for your src/navigation/index.js.
// Wraps everything in TallyProvider, renders the custom tab bar, and mounts
// the Add + Paywall modals globally so any screen can open them.
import React from 'react';
import { View, Linking } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import notifee from '@notifee/react-native';
import NetInfo from '@react-native-community/netinfo';
import { TallyProvider, useTally } from './TallyContext';
import TallyTabBar from './TallyTabBar';
import PlasmaVeilLoader from './PlasmaVeilLoader';
import { flushPendingTransactions } from '../services/offlineQueue';
import { retryPendingCategories } from '../services/categoryRetry';

import HomeScreen from './screens/HomeScreen';
import FeedScreen from './screens/FeedScreen';
import DamageScreen from './screens/DamageScreen';
import BudgetScreen from './screens/BudgetScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import AuthScreen from './screens/AuthScreen';
import AddSheet from './screens/AddSheet';
import Paywall from './screens/Paywall';
import TxDetailSheet from './screens/TxDetailSheet';

// keep your existing real auth hook
import { useAuth } from '../hooks/useAuth';
import { useTransactions } from '../hooks/useTransactions';
import { supabase } from '../services/supabase';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
export const navigationRef = createNavigationContainerRef();
// Set by GlobalModals once TallyProvider is mounted — lets the module-level
// deep-link handler below open the Add sheet, which otherwise has no way to
// reach context (registerRefetch uses the same cross-tree-ref pattern).
const openAddRef = { current: null };

export function routeFromPressAction(pressActionId) {
  if (!navigationRef.isReady()) return;
  if (pressActionId === 'open_insights') navigationRef.navigate('Main', { screen: 'Insights' });
  else if (pressActionId === 'open_budget') navigationRef.navigate('Main', { screen: 'Budget' });
  else navigationRef.navigate('Main');
}

async function handleDeepLink(url) {
  if (!url) return;

  // Handle OAuth callback (e.g. tally://auth-callback#access_token=... or ?code=...)
  if (url.includes('auth-callback') || url.includes('access_token=') || url.includes('code=')) {
    try {
      if (url.includes('#')) {
        const hash = url.split('#')[1];
        const params = Object.fromEntries(new URLSearchParams(hash));
        if (params.access_token && params.refresh_token) {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          return;
        }
      } else if (url.includes('?')) {
        const query = url.split('?')[1];
        const params = Object.fromEntries(new URLSearchParams(query));
        if (params.code) {
          await supabase.auth.exchangeCodeForSession(params.code);
          return;
        }
      }
    } catch (e) {
      console.warn('OAuth deep link exchange failed:', e);
    }
  }

  if (!navigationRef.isReady()) return;
  if (url.includes('tally://insights')) navigationRef.navigate('Main', { screen: 'Insights' });
  else if (url.includes('tally://log')) {
    // navigate home then open add sheet
    navigationRef.navigate('Main', { screen: 'Dashboard' });
    // slight delay so the nav settles before opening the modal
    setTimeout(() => { openAddRef.current?.(); }, 100);
  }
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TallyTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={FeedScreen} />
      <Tab.Screen name="Insights" component={DamageScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Real-data bridge. Mounted INSIDE the navigator (so useFocusEffect is legal) —
// pushes your Supabase transactions into the Tally store. When there are no real
// transactions the store falls back to demo seed data automatically.
// Map a Supabase row onto the shape the Tally screens expect:
// they read tx.when (date label) and tx.sms (source flag), which the DB lacks.
function toTallyTx(tx) {
  return {
    ...tx,
    when: tx.txn_date
      ? new Date(tx.txn_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : '',
    sms: !!tx.source && tx.source !== 'manual',
  };
}

function TxBridge({ userId }) {
  const { setRealTransactions, registerRefetch, isPremium } = useTally();
  const fromDate = React.useMemo(() => {
    if (isPremium) return undefined;
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, [isPremium]);
  const { transactions, loading, refetch } = useTransactions(userId, { fromDate, all: true });

  React.useEffect(() => { registerRefetch(refetch); }, [refetch, registerRefetch]);

  React.useEffect(() => {
    // Report once loaded — even an empty result, so the UI shows honest empty
    // states instead of falling back to demo seed forever.
    if (!loading) setRealTransactions((transactions || []).map(toTallyTx));
  }, [transactions, loading, setRealTransactions]);

  return null;
}

// renders the globally-available modals, reading visibility from the context
function GlobalModals() {
  const { modal, closeModal, selectedTx, openAdd } = useTally();
  React.useEffect(() => { openAddRef.current = openAdd; }, [openAdd]);
  return (
    <>
      <AddSheet visible={modal === 'add'} onClose={closeModal} />
      <Paywall visible={modal === 'paywall'} onClose={closeModal} />
      <TxDetailSheet visible={modal === 'txDetail'} tx={selectedTx} onClose={closeModal} />
    </>
  );
}

function Inner() {
  // Your real auth gate (kept intact). If you don't have AuthScreen wired yet,
  // you can temporarily replace this with `const user = true, hasOnboarded = true;`
  const { user, loading, hasOnboarded, completeOnboarding } = useAuth();
  const { refreshTxs, accent } = useTally();

  React.useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  // Retry any SMS/notification captures that failed to insert while offline,
  // the moment connectivity actually returns (not just next headless event).
  React.useEffect(() => {
    if (!user?.id) return;
    const flush = () => flushPendingTransactions(user.id)
      .then(() => retryPendingCategories(user.id))
      .then(changed => { if (changed) refreshTxs(); })
      .catch(() => {});
    const unsubscribe = NetInfo.addEventListener(state => { if (state.isConnected) flush(); });
    const timer = setInterval(() => {
      NetInfo.fetch().then(state => { if (state.isConnected) flush(); }).catch(() => {});
    }, 5 * 60_000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, [user?.id, refreshTxs]);

  if (loading) return <View style={{ flex: 1, backgroundColor: '#0E0F0C',
    alignItems: 'center', justifyContent: 'center' }}>
    <PlasmaVeilLoader size="large" color={accent} accessibilityLabel="Opening Tally" />
  </View>;

  return (
    <NavigationContainer ref={navigationRef} onReady={() => {
        notifee.getInitialNotification().then(n => {
          if (n?.pressAction?.id) routeFromPressAction(n.pressAction.id);
        }).catch(() => {});
        // Handle app shortcuts (tally://log, tally://insights)
        Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); }).catch(() => {});
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !hasOnboarded ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onDone={completeOnboarding} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
      {/* Real-data bridge: feeds your Supabase transactions into the store.
          Falls back to demo seed data when there are none. */}
      {user ? <TxBridge userId={user.id} /> : null}
      <GlobalModals />
    </NavigationContainer>
  );
}

export default function TallyNavigation() {
  // Demo seed is used until TxBridge feeds real transactions (see above).
  return (
    <TallyProvider>
      <Inner />
    </TallyProvider>
  );
}
