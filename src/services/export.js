import { Share, Platform } from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Export transactions to CSV and share via Android share sheet.
 * react-native-fs needed: npm install react-native-fs
 */
export async function exportToCSV(transactions) {
  const header = 'Date,Merchant,Category,Type,Amount (INR)\n';
  const rows = transactions.map(tx => {
    const date = new Date(tx.txn_date).toLocaleDateString('en-IN');
    const merchant = `"${tx.merchant.replace(/"/g, '""')}"`;
    return `${date},${merchant},${tx.category},${tx.type},${tx.amount}`;
  }).join('\n');

  const csv = header + rows;
  const filename = `tally_export_${Date.now()}.csv`;
  const path = `${RNFS.CachesDirectoryPath}/${filename}`;

  await RNFS.writeFile(path, csv, 'utf8');

  await Share.share({
    title: 'Tally Export',
    url: Platform.OS === 'android' ? `file://${path}` : path,
    message: `Tally transaction export — ${transactions.length} transactions`,
  });
}

export function generateCSVString(transactions) {
  const header = 'Date,Merchant,Category,Type,Amount (INR)\n';
  const rows = transactions.map(tx => {
    const date = new Date(tx.txn_date).toLocaleDateString('en-IN');
    const merchant = `"${tx.merchant.replace(/"/g, '""')}"`;
    return `${date},${merchant},${tx.category},${tx.type},${tx.amount}`;
  }).join('\n');
  return header + rows;
}
