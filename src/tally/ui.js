// src/tally/ui.js
// Shared receipt-language atoms for the Tally screens (React Native).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import TallyMark from './TallyMark';
import { FONTS, fmtINR } from './theme';
import { catMeta } from './data';

export function MonoLabel({ T, children, color, size = 11, style }) {
  return (
    <Text style={[{ fontFamily: FONTS.mono, fontSize: size, letterSpacing: 1.4,
      textTransform: 'uppercase', color: color || T.faint }, style]}>{children}</Text>
  );
}

export function Rule({ T, dashed = true, color }) {
  return (
    <View style={{ borderTopWidth: 1.5, borderStyle: dashed ? 'dashed' : 'solid',
      borderTopColor: color || T.lineStrong }} />
  );
}

// dotted leader row: LABEL .......... value
export function Leader({ T, label, value, bold, color }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Text style={{ fontFamily: bold ? FONTS.monoBold : FONTS.mono, fontSize: bold ? 14 : 13,
        color: color || T.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <View style={{ flex: 1, borderBottomWidth: 1.5, borderStyle: 'dotted',
        borderBottomColor: T.lineStrong, marginBottom: 4, marginHorizontal: 6 }} />
      <Text style={{ fontFamily: bold ? FONTS.monoBold : FONTS.mono, fontSize: bold ? 14 : 13,
        color: color || T.text }}>{value}</Text>
    </View>
  );
}

export function Btn({ T, accent, accentInk, children, onPress, variant = 'solid', style, disabled }) {
  const v = variant === 'ink' ? { backgroundColor: T.text }
    : variant === 'ghost' ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: T.lineStrong }
    : { backgroundColor: accent };
  const txtColor = variant === 'ink' ? T.bg : variant === 'ghost' ? T.text : accentInk;
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={[{ width: '100%', borderRadius: 4, paddingVertical: 16, alignItems: 'center',
        opacity: disabled ? 0.45 : 1 }, v, style]}>
      <Text style={{ fontFamily: FONTS.monoBold, fontSize: 13, letterSpacing: 1.2,
        textTransform: 'uppercase', color: txtColor }}>{children}</Text>
    </Pressable>
  );
}

export function Tag({ T, accent, accentInk, children, rotate = 0, style }) {
  return (
    <View style={[{ alignSelf: 'flex-start', backgroundColor: accent, paddingVertical: 4,
      paddingHorizontal: 9, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Text style={{ fontFamily: FONTS.monoBold, fontSize: 11, letterSpacing: 0.6,
        textTransform: 'uppercase', color: accentInk }}>{children}</Text>
    </View>
  );
}

export function Brand({ T, color, size = 18 }) {
  return <TallyMark size={size} color={color || T.text} />;
}

export function ScreenHeader({ T, accent, title, right, sub }) {
  return (
    <View style={{ paddingBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Brand T={T} color={accent} size={16} />
          <MonoLabel T={T} color={T.dim}>{title}</MonoLabel>
        </View>
        {right || null}
      </View>
      {sub ? <MonoLabel T={T} color={T.faint} size={10.5} style={{ marginTop: 6 }}>{sub}</MonoLabel> : null}
    </View>
  );
}

// receipt-style transaction line
export function TxRow({ T, tx, onPress }) {
  const m = catMeta(tx.category);
  const credit = tx.type === 'credit';
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
      <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.faint, width: 42, letterSpacing: 0.4 }}>{m.tag}</Text>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: T.text }}>{tx.merchant}</Text>
        {tx.note ? <Text numberOfLines={1} style={{ fontFamily: FONTS.sans, fontSize: 12, color: T.dim, marginTop: 1 }}>{tx.note}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: FONTS.monoBold, fontSize: 14, color: credit ? T.creditText : T.text }}>
          {credit ? '+' : '−'}{fmtINR(tx.amount)}
        </Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.faint, marginTop: 2 }}>{tx.when || ''}</Text>
      </View>
    </Pressable>
  );
}

// jagged-edge receipt paper container
export function ReceiptShell({ T, children, style }) {
  return (
    <View style={[{ backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, borderRadius: 4 }, style]}>
      <Zigzag T={T} flip />
      <View style={{ paddingHorizontal: 20, paddingVertical: 18 }}>{children}</View>
      <Zigzag T={T} />
    </View>
  );
}

// little torn-paper zigzag made of triangles
function Zigzag({ T, flip }) {
  const teeth = 22;
  return (
    <View style={{ flexDirection: 'row', height: 9, overflow: 'hidden', transform: [{ scaleY: flip ? -1 : 1 }] }}>
      {Array.from({ length: teeth }).map((_, i) => (
        <View key={i} style={{ flex: 1, height: 0,
          borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 9,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: T.surface }} />
      ))}
    </View>
  );
}
