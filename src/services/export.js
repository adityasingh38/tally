import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Export transactions to CSV and open the native share sheet.
 * Uses expo-file-system (New Architecture safe) + expo-sharing.
 */
export async function exportToCSV(transactions) {
  const csv = generateCSVString(transactions);
  const file = new File(Paths.cache, `tally_export_${Date.now()}.csv`);
  if (file.exists) file.delete();
  file.write(csv);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Tally Export',
    UTI: 'public.comma-separated-values-text',
  });
}

export function generateCSVString(transactions) {
  const header = 'Date,Merchant,Category,Type,Amount (INR)\n';
  const rows = transactions.map(tx => {
    const date = new Date(tx.txn_date).toLocaleDateString('en-IN');
    const merchant = `"${(tx.merchant || '').replace(/"/g, '""')}"`;
    return `${date},${merchant},${tx.category},${tx.type},${tx.amount}`;
  }).join('\n');
  return header + rows;
}
