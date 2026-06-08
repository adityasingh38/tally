// src/tally/theme.js
// Tally design tokens for React Native. Light + dark, accent-aware.

// Font family names match the @expo-google-fonts packages (loaded in App.js).
export const FONTS = {
  display:    'BricolageGrotesque_800ExtraBold', // big numbers + titles
  displaySemi:'BricolageGrotesque_700Bold',
  sans:       'SpaceGrotesk_400Regular',
  sansMed:    'SpaceGrotesk_500Medium',
  sansSemi:   'SpaceGrotesk_600SemiBold',
  sansBold:   'SpaceGrotesk_700Bold',
  mono:       'SpaceMono_400Regular',
  monoBold:   'SpaceMono_700Bold',
};

export const THEMES = {
  dark: {
    name: 'dark',
    bg: '#0E0F0C', surface: '#15160E',
    card: '#181A12', cardEl: '#20221A',
    line: 'rgba(233,255,208,0.10)', lineStrong: 'rgba(233,255,208,0.18)',
    text: '#F2F3EC', dim: '#9DA08F', faint: '#63655A',
    acid: '#D4FF2E', acidInk: '#0E0F0C', acidSoft: '#E9FFD0',
    red: '#FF5436',
    chip: 'rgba(233,255,208,0.06)',
    statusBar: 'light',
    creditText: '#D4FF2E',
  },
  light: {
    name: 'light',
    bg: '#F1EDE3', surface: '#FFFFFF',
    card: '#FBF9F3', cardEl: '#FFFFFF',
    line: 'rgba(23,22,20,0.10)', lineStrong: 'rgba(23,22,20,0.16)',
    text: '#16150F', dim: '#6C695E', faint: '#A39E92',
    acid: '#C7F22E', acidInk: '#16150F', acidSoft: '#3a3a1a',
    red: '#E8442A',
    chip: 'rgba(23,22,20,0.045)',
    statusBar: 'dark',
    creditText: '#4a7a1f',
  },
};

// Resolve the single accent colour from a preference key.
export function resolveAccent(theme, accentKey) {
  if (accentKey === 'acid') return { accent: theme.acid, accentInk: theme.acidInk };
  if (accentKey === 'mono') return { accent: theme.text, accentInk: theme.bg };
  return { accent: theme.red, accentInk: '#FFFFFF' }; // default: red
}

export const fmtINR = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
