// src/tally/screens/SettingsScreen.js  → your "Settings" tab
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTally } from '../TallyContext';
import { FONTS } from '../theme';
import { MonoLabel, Rule, ScreenHeader, Brand } from '../ui';

function Toggle({ T, accent, on, onChange }) {
  return (
    <Pressable onPress={() => onChange(!on)}
      style={{ width: 48, height: 28, borderRadius: 999, backgroundColor: on ? accent : T.lineStrong, justifyContent: 'center' }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', marginLeft: on ? 23 : 3 }} />
    </Pressable>
  );
}
function Seg({ T, accent, accentInk, options, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, backgroundColor: T.chip, borderRadius: 999, padding: 3 }}>
      {options.map(([val, label]) => {
        const on = value === val;
        return (
          <Pressable key={String(val)} onPress={() => onChange(val)}
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? accent : 'transparent' }}>
            <Text style={{ fontFamily: on ? FONTS.monoBold : FONTS.mono, fontSize: 11, letterSpacing: 0.4,
              textTransform: 'uppercase', color: on ? accentInk : T.dim }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
function Row({ T, label, sub, control }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingVertical: 15 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: T.text, lineHeight: 19 }}>{label}</Text>
        {sub ? <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: T.dim, marginTop: 3, lineHeight: 16 }}>{sub}</Text> : null}
      </View>
      <View>{control}</View>
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const { T, accent, accentInk, prefs, setPref, openPaywall } = useTally();
  const [sms, setSms] = useState(true);
  const [notif, setNotif] = useState(true);
  const NIHIL = [[1, 'mild'], [2, 'medium'], [3, 'feral']];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 54, paddingBottom: 120 }}>
      <ScreenHeader T={T} accent={accent} title="you" />

      {/* profile */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 24, color: accentInk }}>b</Text>
        </View>
        <View>
          <Text style={{ fontFamily: FONTS.display, fontSize: 22, color: T.text }}>@brokeboi</Text>
          <MonoLabel T={T} color={T.dim} size={10.5} style={{ marginTop: 3 }}>tally free · since jun 2026</MonoLabel>
        </View>
      </View>

      {/* pro upsell */}
      <Pressable onPress={openPaywall} style={{ marginTop: 20, backgroundColor: T.text, borderRadius: 16, padding: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 19, color: T.bg, lineHeight: 23 }}>go Pro → unlock the carnage</Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.bg, opacity: 0.7, marginTop: 7 }}>full history · receipts · ₹199/mo</Text>
          </View>
          <Text style={{ fontSize: 20, color: T.bg }}>↗</Text>
        </View>
      </Pressable>

      {/* vibe */}
      <MonoLabel T={T} color={T.faint} style={{ marginTop: 28, marginBottom: 4 }}>the vibe</MonoLabel>
      <Rule T={T} />
      <Row T={T} label="Dark mode" sub="ink or paper" control={<Toggle T={T} accent={accent} on={prefs.dark} onChange={(v) => setPref('dark', v)} />} />
      <Rule T={T} />
      <Row T={T} label="Accent" sub="the one colour" control={<Seg T={T} accent={accent} accentInk={accentInk}
        options={[['red', 'red'], ['mono', 'mono'], ['acid', 'acid']]} value={prefs.accent} onChange={(v) => setPref('accent', v)} />} />
      <Rule T={T} />
      <Row T={T} label="AI tone" sub="how it talks to you" control={<Seg T={T} accent={accent} accentInk={accentInk}
        options={[['dry', 'dry'], ['unhinged', 'unhinged']]} value={prefs.tone} onChange={(v) => setPref('tone', v)} />} />
      <Rule T={T} />
      <Row T={T} label="Nihilism" sub="how dark it goes" control={<Seg T={T} accent={accent} accentInk={accentInk}
        options={NIHIL} value={prefs.nihil} onChange={(v) => setPref('nihil', v)} />} />

      {/* data */}
      <MonoLabel T={T} color={T.faint} style={{ marginTop: 28, marginBottom: 4 }}>data</MonoLabel>
      <Rule T={T} />
      <Row T={T} label="SMS auto-capture" sub="reads bank texts · logs spends" control={<Toggle T={T} accent={accent} on={sms} onChange={setSms} />} />
      <Rule T={T} />
      <Row T={T} label="Connected banks" sub="HDFC · ICICI · GPay · PhonePe" control={<MonoLabel T={T} color={T.dim} size={11}>4 →</MonoLabel>} />
      <Rule T={T} />
      <Row T={T} label="Export the damage" sub="csv · pdf receipt" control={<MonoLabel T={T} color={T.dim} size={11}>↗</MonoLabel>} />

      {/* account */}
      <MonoLabel T={T} color={T.faint} style={{ marginTop: 28, marginBottom: 4 }}>account</MonoLabel>
      <Rule T={T} />
      <Row T={T} label="Notifications" sub="weekly damage report" control={<Toggle T={T} accent={accent} on={notif} onChange={setNotif} />} />
      <Rule T={T} />
      <Row T={T} label="Log out" control={<MonoLabel T={T} color={accent} size={11}>bye →</MonoLabel>} />

      <View style={{ alignItems: 'center', marginTop: 34, gap: 10 }}>
        <Brand T={T} color={T.faint} size={20} />
        <MonoLabel T={T} color={T.faint} size={10}>v1.0 · made it worse, beautifully</MonoLabel>
      </View>
    </ScrollView>
  );
}
