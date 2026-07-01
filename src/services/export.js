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

// Neutralise CSV formula injection: a field starting with = + - @ (or a tab)
// is interpreted as a formula by Excel/Sheets even when quoted, so prefix
// with a leading quote to force it back to plain text.
function csvField(value) {
  const s = (value || '').replace(/"/g, '""');
  const safe = /^[=+\-@\t]/.test(s) ? `'${s}` : s;
  return `"${safe}"`;
}

export function generateCSVString(transactions) {
  const header = 'Date,Merchant,Category,Type,Amount (INR),Note\n';
  const rows = transactions.map(tx => {
    const date = new Date(tx.txn_date).toLocaleDateString('en-IN');
    const merchant = csvField(tx.merchant);
    const note = tx.note ? csvField(tx.note) : '';
    return `${date},${merchant},${tx.category},${tx.type},${tx.amount},${note}`;
  }).join('\n');
  return header + rows;
}
