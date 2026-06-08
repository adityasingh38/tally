import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, PermissionsAndroid, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, RADII, GRADIENTS, shadow } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { usePremium } from '../hooks/usePremium';
import { syncHistoricalSMS } from '../services/smsSync';
import { getTransactions, deleteAccount } from '../services/supabase';
import { exportToCSV } from '../services/export';
import { requestNotificationPermission } from '../services/budgetAlerts';
import Bouncy from '../components/Bouncy';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { isPremium, offerings, purchase, restore } = usePremium();
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleManualSync() {
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission required', 'Enable SMS permission in device Settings.');
        return;
      }
      setSyncing(true);
      const result = await syncHistoricalSMS(user.id, null);
      Alert.alert('Sync complete', `Imported ${result.inserted} new transactions.`);
    } catch (e) {
      Alert.alert('Sync failed', e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleExport() {
    if (!isPremium) {
      Alert.alert('Premium feature', 'Upgrade to Tally Pro to export transactions.');
      return;
    }
    setExporting(true);
    try {
      const fromDate = new Date(0);
      const { data } = await getTransactions({ userId: user.id, limit: 5000, fromDate });
      if (!data?.length) {
        Alert.alert('No data', 'No transactions to export yet.');
        return;
      }
      await exportToCSV(data);
    } catch (e) {
      Alert.alert('Export failed', e.message);
    } finally {
      setExporting(false);
    }
  }

  async function doPurchase(pkg) {
    const { success, cancelled, error } = await purchase(pkg);
    if (success) Alert.alert('Welcome to Pro! 🎉', 'All premium features unlocked.');
    else if (!cancelled) Alert.alert('Purchase failed', error || 'Please try again.');
  }

  function handlePurchase() {
    if (!offerings?.availablePackages?.length) {
      Alert.alert('Not available', 'In-app purchase not set up yet. Check back soon.');
      return;
    }
    const monthly = offerings.availablePackages.find(p => p.packageType === 'MONTHLY');
    const annual = offerings.availablePackages.find(p => p.packageType === 'ANNUAL');
    const buttons = [];
    if (monthly) buttons.push({ text: monthly.product.priceString + ' / month', onPress: () => doPurchase(monthly) });
    if (annual) buttons.push({ text: annual.product.priceString + ' / year', onPress: () => doPurchase(annual) });
    if (buttons.length === 0) { doPurchase(offerings.availablePackages[0]); return; }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Upgrade to Tally Pro', 'Choose a plan', buttons);
  }

  async function handleRestore() {
    const restored = await restore();
    Alert.alert(restored ? 'Restored! ✓' : 'No purchase found', restored ? 'Premium access restored.' : 'No active subscription found.');
  }

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermission();
    Alert.alert(granted ? 'Notifications enabled ✓' : 'Denied', granted ? "You'll get budget alerts." : 'Enable in device Settings.');
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and all transactions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const { error } = await deleteAccount();
            if (error) { Alert.alert('Delete failed', error.message); return; }
            await signOut();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={FadeInDown.springify()} style={styles.title}>Settings ⚙️</Animated.Text>

        {/* Account */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </Animated.View>

        {/* Premium */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.section}>
          {isPremium ? (
            <>
              <Text style={styles.sectionLabel}>Subscription</Text>
              <View style={styles.card}>
                <View style={styles.proBadgeRow}>
                  <Text style={styles.proIcon}>⭐</Text>
                  <View>
                    <Text style={styles.proTitle}>Tally Pro</Text>
                    <Text style={styles.proSub}>All features unlocked</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Upgrade</Text>
              <Bouncy scaleTo={0.98} onPress={handlePurchase} style={styles.premiumWrap}>
                <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.premiumBanner}>
                  <Text style={styles.premiumTitle}>Upgrade to Tally Pro ✨</Text>
                  <Text style={styles.premiumSub}>Full history · Budget alerts · AI advice · Exports</Text>
                  <View style={styles.premiumPriceRow}>
                    <Text style={styles.premiumPrice}>₹199/mo</Text>
                    <Text style={styles.premiumPriceAlt}>  or ₹1499/year</Text>
                  </View>
                </LinearGradient>
              </Bouncy>
              <Bouncy haptic={false} style={styles.restoreRow} onPress={handleRestore}>
                <Text style={styles.restoreText}>Restore purchase</Text>
              </Bouncy>
            </>
          )}
        </Animated.View>

        {/* Data */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.section}>
          <Text style={styles.sectionLabel}>Data</Text>
          <View style={styles.card}>
            <Row emoji="🔄" title={syncing ? 'Syncing…' : 'Sync SMS history'}
              sub="Re-scan last 500 SMS for missed transactions" onPress={handleManualSync} disabled={syncing} />
            <View style={styles.divider} />
            <Row emoji="📤" title={(exporting ? 'Exporting…' : 'Export CSV') + (!isPremium ? '  🔒' : '')}
              sub="Download all transactions as a spreadsheet" onPress={handleExport} disabled={exporting} />
          </View>
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.section}>
          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.card}>
            <Row emoji="🔔" title="Enable budget alerts" sub="Get nudged when nearing your limits"
              onPress={handleEnableNotifications} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Bouncy onPress={handleSignOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Bouncy>
          <Bouncy haptic={false} onPress={handleDeleteAccount} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Delete account</Text>
          </Bouncy>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ emoji, title, sub, onPress, disabled }) {
  return (
    <Bouncy scaleTo={0.98} style={styles.row} onPress={onPress} disabled={disabled}>
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={styles.rowArrow}>→</Text>
    </Bouncy>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text, marginBottom: 20, paddingHorizontal: 4, letterSpacing: -0.5 },
  section: { marginBottom: 22 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, paddingHorizontal: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADII.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  email: { padding: 18, color: COLORS.text, fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  rowEmoji: { fontSize: 20 },
  rowTitle: { fontSize: 15, color: COLORS.text, fontWeight: '700' },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowArrow: { color: COLORS.textMuted, fontSize: 18 },
  premiumWrap: { borderRadius: RADII.lg, ...shadow(COLORS.primary, 14, 0.4) },
  premiumBanner: { padding: 22, borderRadius: RADII.lg },
  premiumTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  premiumSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, lineHeight: 18 },
  premiumPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 14 },
  premiumPrice: { fontSize: 22, fontWeight: '900', color: '#fff' },
  premiumPriceAlt: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  restoreRow: { padding: 14, alignItems: 'center' },
  restoreText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  proBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  proIcon: { fontSize: 28 },
  proTitle: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  proSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  signOutBtn: { margin: 8, padding: 16, alignItems: 'center' },
  signOutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
  deleteBtn: { marginHorizontal: 8, marginBottom: 24, padding: 12, alignItems: 'center' },
  deleteText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});
