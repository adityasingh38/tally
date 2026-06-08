// src/tally/TallyNavigation.js
// Drop-in replacement for your src/navigation/index.js.
// Wraps everything in TallyProvider, renders the custom tab bar, and mounts
// the Add + Paywall modals globally so any screen can open them.
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import { TallyProvider, useTally } from './TallyContext';
import TallyTabBar from './TallyTabBar';

import HomeScreen from './screens/HomeScreen';
import FeedScreen from './screens/FeedScreen';
import DamageScreen from './screens/DamageScreen';
import BudgetScreen from './screens/BudgetScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import AddSheet from './screens/AddSheet';
import Paywall from './screens/Paywall';

// keep your existing real auth hook
import { useAuth } from '../hooks/useAuth';
import { useTransactions } from '../hooks/useTransactions';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
export const navigationRef = createNavigationContainerRef();

export function routeFromPressAction(pressActionId) {
  if (!navigationRef.isReady()) return;
  if (pressActionId === 'open_insights') navigationRef.navigate('Main', { screen: 'Insights' });
  else navigationRef.navigate('Main');
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

// OPTIONAL real-data bridge. Mounted INSIDE the navigator (so useFocusEffect is
// legal) — it pushes your Supabase transactions into the Tally store. Until you
// pass a userId / wire this, the app shows demo seed data automatically.
function TxBridge({ userId }) {
  const { setRealTransactions } = useTally();
  const { transactions } = useTransactions(userId);
  React.useEffect(() => {
    if (transactions && transactions.length) setRealTransactions(transactions);
  }, [transactions, setRealTransactions]);
  return null;
}

// renders the globally-available modals, reading visibility from the context
function GlobalModals() {
  const { modal, closeModal } = useTally();
  return (
    <>
      <AddSheet visible={modal === 'add'} onClose={closeModal} />
      <Paywall visible={modal === 'paywall'} onClose={closeModal} />
    </>
  );
}

function Inner() {
  // Your real auth gate (kept intact). If you don't have AuthScreen wired yet,
  // you can temporarily replace this with `const user = true, hasOnboarded = true;`
  const { user, loading, hasOnboarded, completeOnboarding } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: '#0E0F0C' }} />;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasOnboarded ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onDone={completeOnboarding} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
      {/* Real-data bridge (safe inside the navigator). Uncomment + pass userId:
          {user ? <TxBridge userId={user.id} /> : null} */}
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
