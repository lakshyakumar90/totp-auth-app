import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { formatCode, generateCode, getCounter, getRemaining } from '@/lib/totp';
import { selectVisibleAccounts } from '@/lib/accounts-select';
import type { Account } from '@/lib/types';

const R = 20;
const STROKE = 3.5;
const CIRC = 2 * Math.PI * R;

function Ring({ progress, remaining, color }: { progress: number; remaining: number; color: string }) {
  return (
    <View style={styles.ring}>
      <Svg width={48} height={48}>
        <Circle cx={24} cy={24} r={R} stroke="rgba(128,128,128,0.25)" strokeWidth={STROKE} fill="none" />
        <Circle
          cx={24}
          cy={24}
          r={R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRC}`}
          strokeDashoffset={CIRC * (1 - progress)}
          transform="rotate(-90 24 24)"
        />
      </Svg>
      <Text style={[styles.seconds, { color }]}>{remaining}</Text>
    </View>
  );
}

function AccountCard({ account }: { account: Account }) {
  const c = useColors();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const period = account.period ?? 30;
  const counter = getCounter(period, now);
  const remaining = getRemaining(period, now);
  const progress = remaining / period;
  const urgent = remaining <= 5;

  // Recompute the HMAC only when the time-step rolls over.
  const code = useMemo(
    () => (account.secret ? generateCode(account, now) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account.secret, account.algorithm, account.digits, account.period, counter],
  );

  const copy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (!account.secret) {
    // No cached secret: offer QR pairing; the server code keeps working online.
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.issuer, { color: c.foreground }]} numberOfLines={1}>{account.issuer}</Text>
            <Text style={[styles.labelText, { color: c.mutedForeground }]} numberOfLines={1}>{account.label}</Text>
          </View>
          <Feather name="cloud-off" size={20} color={c.warning} />
        </View>
        <Pressable onPress={() => router.push('/scan')} style={({ pressed }) => [styles.activate, pressed && { opacity: 0.7 }]}>
          <Feather name="camera" size={16} color={c.primary} />
          <Text style={{ color: c.primary, fontFamily: 'Inter_700Bold', fontSize: 14 }}>Scan pairing QR to activate</Text>
        </Pressable>
        <Text style={[styles.tapHint, { color: c.mutedForeground }]}>
          This secret was created on another device. Scanning links it here and enables offline codes.
        </Text>
      </View>
    );
  }

  return (
    <Pressable onPress={copy} style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && { transform: [{ scale: 0.985 }] }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.issuer, { color: c.foreground }]} numberOfLines={1}>{account.issuer}</Text>
            {account.localOnly ? (
              <View style={[styles.tag, { backgroundColor: c.secondary }]}>
                <Text style={{ color: c.mutedForeground, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>DEVICE</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.labelText, { color: c.mutedForeground }]} numberOfLines={1}>{account.label}</Text>
        </View>
        <Ring progress={progress} remaining={remaining} color={urgent ? c.warning : c.primary} />
      </View>

      <View style={styles.codeRow}>
        <Text style={[styles.code, { color: c.accent }]}>{code ? formatCode(code) : '··· ···'}</Text>
        <Feather name="copy" size={18} color={c.mutedForeground} />
      </View>
      <Text style={[styles.tapHint, { color: c.mutedForeground }]}>Tap to copy · rotates every {period}s</Text>
    </Pressable>
  );
}

export default function Home() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const net = useNetInfo();
  const { token, accounts, locked, hydrated, busy, error, sync, unlock } = useAuth();
  const [unlocked, setUnlocked] = useState(!locked);

  useEffect(() => {
    if (locked && hydrated) unlock().then(setUnlocked);
  }, [locked, hydrated, unlock]);

  if (!hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.mutedForeground }}>Unlocking vault…</Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={[styles.brandMark, { backgroundColor: c.primary }]}>
          <Feather name="shield" size={28} color={c.primaryForeground} />
        </View>
        <Text style={[styles.welcome, { color: c.foreground }]}>Your codes, offline.</Text>
        <Text style={[styles.sub, { color: c.mutedForeground }]}>VaultKey keeps your authenticator secrets encrypted on this device.</Text>
        <Pressable onPress={() => router.push('/auth/login')} style={[styles.primaryCta, { backgroundColor: c.primary }]}>
          <Text style={{ color: c.primaryForeground, fontFamily: 'Inter_700Bold' }}>Sign in to continue</Text>
        </Pressable>
      </View>
    );
  }

  if (locked && !unlocked) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <Feather name="lock" size={30} color={c.primary} />
        <Text style={[styles.welcome, { color: c.foreground }]}>Vault locked</Text>
        <Pressable onPress={() => unlock().then(setUnlocked)} style={[styles.primaryCta, { backgroundColor: c.primary }]}>
          <Text style={{ color: c.primaryForeground, fontFamily: 'Inter_700Bold' }}>Unlock</Text>
        </Pressable>
      </View>
    );
  }

  const offline = net.isInternetReachable === false;
  // Collapse rescan twins + identical unpaired orphans for display only.
  // Settings still lists every account so orphans can be deleted.
  const visibleAccounts = useMemo(
    () => selectVisibleAccounts(accounts),
    [accounts],
  );

  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: c.primary }]}>VAULTKEY</Text>
          <Text style={[styles.title, { color: c.foreground }]}>Authenticator</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {offline ? (
            <View style={[styles.offlinePill, { borderColor: c.warning }]}>
              <Feather name="wifi-off" size={12} color={c.warning} />
              <Text style={{ color: c.warning, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>Offline — codes still work</Text>
            </View>
          ) : null}
          <Feather.Button
            name="settings"
            size={18}
            color={c.foreground}
            backgroundColor="transparent"
            underlayColor="transparent"
            onPress={() => router.push('/settings')}
            accessibilityLabel="Open settings"
          />
        </View>
      </View>

      <FlatList
        data={visibleAccounts}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => <AccountCard account={item} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={sync} tintColor={c.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: c.muted }]}>
              <Feather name="key" size={24} color={c.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.foreground }]}>No accounts yet</Text>
            <Text style={[styles.sub, { color: c.mutedForeground }]}>Scan the pairing QR from the web dashboard, or add an account manually.</Text>
            {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}
            <Pressable onPress={() => router.push('/scan')} style={[styles.primaryCta, { backgroundColor: c.primary, marginTop: 10 }]}>
              <Text style={{ color: c.primaryForeground, fontFamily: 'Inter_700Bold' }}>Scan a QR code</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/add')} style={{ paddingVertical: 10 }}>
              <Text style={{ color: c.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Type details instead</Text>
            </Pressable>
          </View>
        }
      />

      <Pressable
        accessibilityLabel="Add account"
        testID="Add account"
        onPress={() => router.push('/scan')}
        style={[styles.fab, { backgroundColor: c.primary, bottom: insets.bottom + 24 }]}
      >
        <Feather name="plus" size={25} color={c.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 18 },
  header: { paddingHorizontal: 20, paddingBottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 27, marginTop: 5 },
  offlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  list: { paddingHorizontal: 16, gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18, minHeight: 170 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  issuer: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  labelText: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 5 },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  ring: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  seconds: { position: 'absolute', fontFamily: 'Inter_700Bold', fontSize: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  code: { fontFamily: 'Inter_700Bold', fontSize: 39, letterSpacing: 3, flex: 1 },
  tapHint: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 8 },
  activate: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, borderWidth: 1, borderColor: 'rgba(121,242,192,0.35)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignSelf: 'flex-start' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30, gap: 10 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 21 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  error: { fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 8 },
  primaryCta: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  brandMark: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  welcome: { fontFamily: 'Inter_700Bold', fontSize: 28, textAlign: 'center' },
  fab: { position: 'absolute', right: 22, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
});