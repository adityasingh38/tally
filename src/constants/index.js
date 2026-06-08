export const COLORS = {
  primary: '#6C63FF',
  primaryDark: '#4B44CC',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#0F0F13',
  surface: '#1A1A24',
  surfaceElevated: '#232334',
  border: '#2D2D42',
  text: '#FFFFFF',
  textSecondary: '#9898B3',
  textMuted: '#5A5A7A',
  debit: '#EF4444',
  credit: '#22C55E',
};

// Playful-pop design tokens.
export const RADII = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 };

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Soft, colored elevation. Spread a category/accent color for a glow.
export const shadow = (color = '#000', elevation = 8, opacity = 0.35) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: elevation / 2 },
  shadowOpacity: opacity,
  shadowRadius: elevation,
  elevation,
});

// Gradient stops (use with expo-linear-gradient).
export const GRADIENTS = {
  hero: ['#7C6CFF', '#A855F7', '#EC4899'], // violet -> purple -> pink
  heroSoft: ['#6C63FF', '#8B5CF6'],
  success: ['#22C55E', '#16A34A'],
  card: ['#1E1E2A', '#16161F'],
};

export const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: '🍔', color: '#F59E0B' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#6C63FF' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#EC4899' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#8B5CF6' },
  { id: 'health', label: 'Health', icon: '💊', color: '#22C55E' },
  { id: 'utilities', label: 'Bills & Utilities', icon: '💡', color: '#F59E0B' },
  { id: 'rent', label: 'Rent & Housing', icon: '🏠', color: '#06B6D4' },
  { id: 'transfer', label: 'Transfers', icon: '↔️', color: '#9898B3' },
  { id: 'investment', label: 'Investment', icon: '📈', color: '#22C55E' },
  { id: 'other', label: 'Other', icon: '📦', color: '#5A5A7A' },
];

export const BANK_SENDER_IDS = [
  'HDFCBK', 'HDFCBANK',
  'AXISBK', 'AXISBANK',
  'ICICIB', 'ICICIBANK',
  'SBIINB', 'SBIPSG', 'SBIBNK', 'SBICRD', 'ATMSBI',
  'KOTAKB', 'KOTAK',
  'IDFCFB', 'IDFC',
  'PAYTMB', 'PYTMBANK',
  'INDBNK', 'BOIIND', 'INDUSB', 'INDUS',
  'CANBNK', 'SYNBNK', 'UNIONB', 'UBOIND',
  'PNBSMS', 'PUNBNK',
  'YESBNK', 'YESBANK',
  'RBLBNK', 'RBLCRD', 'FEDERL', 'FEDBNK',
  'SCBNK', 'SCBANK',
  'HSBCIN', 'CITBNK', 'CITIBK',
  'BARODB', 'BOBTXN', 'BOBSMS', 'CENTBK', 'IOBCHN', 'UCOBNK',
  'MAHABK', 'KARBNK', 'KVBANK', 'AUBANK', 'BANDHN', 'IDBIBK',
  'DBSBNK', 'SIBSMS', 'CSBBNK', 'DCBBNK', 'EQUITS', 'JANABK',
  'AMEXIN', 'ONECRD', 'SLICET', 'CREDCB', 'JUPAXS',
  'GPAY', 'PHONEPE', 'PHONPE', 'AMAZONPAY', 'AMZNPAY', 'MOBIKW', 'FREECH',
];

export const FREEMIUM = {
  FREE_HISTORY_DAYS: 30,
  PREMIUM_MONTHLY_PRICE_INR: 199,
  PREMIUM_YEARLY_PRICE_INR: 1499,
  // RevenueCat public SDK key (Android). Set via EAS/.env REVENUECAT_API_KEY.
  REVENUE_CAT_API_KEY: process.env.REVENUECAT_API_KEY || '',
  // RevenueCat entitlement identifier that grants Pro.
  ENTITLEMENT_ID: 'premium',
};
