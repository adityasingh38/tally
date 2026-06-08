import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, PermissionsAndroid, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { usePremium } from '../hooks/usePremium';
import { syncHistoricalSMS } from '../services/smsSync';
import { getTransactions, deleteAccount } from '../services/supabase';
import { exportToCSV } from '../services/export';
import { requestNotificationPermission } from '../services/budgetAlerts';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { isPremium, offerings, purchase, restore } = usePremium();
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleManualSync() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
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
      const fromDate = new Date(0); // all time
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
    if (buttons.length === 0) {
      // Fallback: just buy the first available package.
      doPurchase(offerings.availablePackages[0]);
      return;
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Upgrade to Tally Pro', 'Choose a plan', buttons);
  }

  async function handleRestore() {
    const restored = await restore();
    Alert.alert(restored ? 'Restored! ✓' : 'No purchase found', restored ? 'Premium access restored.' : 'No active subscription found.');
  }

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermission();
    Alert.alert(granted ? 'Notifications enabled ✓' : 'Denied', granted ? 'You\'ll get budget alerts.' : 'Enable in device Settings.');
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
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        {/* Premium status */}
        {isPremium ? (
          <View style={styles.section}>
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
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Upgrade</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.premiumBanner} onPress={handlePurchase}>
                <Text style={styles.premiumTitle}>Upgrade to Tally Pro</Text>
                <Text style={styles.premiumSub}>Full history · Budget alerts · AI advice · Exports</Text>
                <View style={styles.premiumPriceRow}>
                  <Text style={styles.premiumPrice}>₹199/month</Text>
                  <Text style={styles.premiumPriceAlt}> or ₹1499/year</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.restoreRow} onPress={handleRestore}>
                <Text style={styles.restoreText}>Restore purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Data</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleManualSync} disabled={syncing}>
              <View>
                <Text style={styles.rowTitle}>{syncing ? 'Syncing...' : 'Sync SMS history'}</Text>
                <Text style={styles.rowSub}>Re-scan last 500 SMS for missed transactions</Text>
              </View>
              <Text style={styles.rowArrow}>→</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row} onPress={handleExport} disabled={exporting}>
              <View>
                <Text style={styles.rowTitle}>
                  {exporting ? 'Exporting...' : 'Export CSV'}
                  {!isPremium ? '  🔒' : ''}
                </Text>
                <Text style={styles.rowSub}>Download all transactions as spreadsheet</Text>
              </View>
              <Text style={styles.rowArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleEnableNotifications}>
              <View>
                <Text style={styles.rowTitle}>Enable budget alerts</Text>
                <Text style={styles.rowSub}>Get notified when nearing your limits</Text>
              </View>
              <Text style={styles.rowArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 24, paddingHorizontal: 4 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  email: { padding: 16, color: COLORS.text, fontSize: 15 },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowTitle: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowArrow: { color: COLORS.textMuted, fontSize: 18 },
  premiumBanner: { padding: 20, backgroundColor: COLORS.primaryDark + '33' },
  premiumTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  premiumSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  premiumPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  premiumPrice: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  premiumPriceAlt: { fontSize: 13, color: COLORS.textMuted },
  restoreRow: { padding: 14, alignItems: 'center' },
  restoreText: { color: COLORS.textSecondary, fontSize: 13 },
  proBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  proIcon: { fontSize: 28 },
  proTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  proSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  signOutBtn: { margin: 8, padding: 16, alignItems: 'center' },
  signOutText: { color: COLORS.danger, fontSize: 15, fontWeight: '600' },
  deleteBtn: { marginHorizontal: 8, marginBottom: 24, padding: 12, alignItems: 'center' },
  deleteText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', textDecorationLine: 'underline' },
});
