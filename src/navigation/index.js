import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { COLORS } from '../constants';

import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import BudgetScreen from '../screens/BudgetScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';

import { useAuth } from '../hooks/useAuth';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export const navigationRef = createNavigationContainerRef();

// Route a tapped notification to the right screen (called from notifee events).
export function routeFromPressAction(pressActionId) {
  if (!navigationRef.isReady()) return;
  if (pressActionId === 'open_insights') {
    navigationRef.navigate('Main', { screen: 'Insights' });
  } else {
    navigationRef.navigate('Main');
  }
}

const TAB_ICONS = {
  Dashboard: '🏠',
  Transactions: '📋',
  Insights: '📊',
  Budget: '🎯',
  Settings: '⚙️',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: focused ? 22 : 20 }}>{TAB_ICONS[route.name]}</Text>
        ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { user, loading, hasOnboarded } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !hasOnboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
