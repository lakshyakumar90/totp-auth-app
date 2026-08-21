import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export default function Backup() {
  const c = useColors();
  const { codes: raw, label, qrCode } = useLocalSearchParams<{ codes?: string; label?: string; qrCode?: string }>();
  let codes: string[] = [];
  try {
    codes = raw ? JSON.parse(raw) as string[] : [];
    if (!Array.isArray(codes)) codes = [];
  } catch {
    codes = [];
  }
  const copy = async () => {
    await Clipboard.setStringAsync(codes.join('\n'));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  return <ScrollView contentContainerStyle={[styles.wrap, { backgroundColor: c.background }]}>
    <View style={[styles.icon, { backgroundColor: c.warning }]}><Feather name="alert-triangle" size={24} color={c.primaryForeground} /></View>
    <Text style={[styles.title, { color: c.foreground }]}>Save your backup codes</Text>
    <Text style={[styles.sub, { color: c.mutedForeground }]}>These codes are shown once for {label || 'this account'}. Store them somewhere safe in case you lose access to your device.</Text>
    {qrCode ? <Image source={{ uri: qrCode }} style={styles.qr} /> : null}
    <View style={[styles.codeBox, { backgroundColor: c.card, borderColor: c.border }]}>{codes.length ? codes.map(code => <Text key={code} style={[styles.code, { color: c.accent }]}>{code}</Text>) : <Text style={{ color: c.mutedForeground }}>No backup codes were returned by the server.</Text>}</View>
    <Pressable onPress={copy} style={[styles.copy, { backgroundColor: c.secondary }]}><Feather name="copy" size={17} color={c.primary} /><Text style={{ color: c.primary, fontFamily: 'Inter_700Bold' }}>Copy codes</Text></Pressable>
    <Pressable onPress={() => router.replace('/')} style={[styles.done, { backgroundColor: c.primary }]}><Text style={{ color: c.primaryForeground, fontFamily: 'Inter_700Bold' }}>I've saved these</Text></Pressable>
    <Text style={[styles.note, { color: c.mutedForeground }]}>VaultKey will not display this list again.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 17 },
  icon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  qr: { width: 152, height: 152, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 12 },
  codeBox: { borderRadius: 16, borderWidth: 1, padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  code: { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 1, width: '45%' },
  copy: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  done: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  note: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 12 },
});