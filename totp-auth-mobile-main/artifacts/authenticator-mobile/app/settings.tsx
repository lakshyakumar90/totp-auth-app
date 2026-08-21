import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { IconButton } from '@/components/ui';

export default function Settings() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { locked, setLocked, sync, busy, logout, accounts, removeAccount, selfCheck } = useAuth();
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);

  const toggle = async (value: boolean) => {
    try { await setLocked(value); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Biometric lock unavailable'); }
  };

  const remove = (id: string, name: string) => Alert.alert(
    'Delete account?',
    'This removes ' + name + ' from this device and your synced vault.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await removeAccount(id); }
        catch (e) { setMessage(e instanceof Error ? e.message : 'Could not delete account'); }
      } },
    ],
  );

  const runSelfCheck = async () => {
    setChecking(true);
    setMessage('');
    try {
      const res = await selfCheck();
      if (res.checked === 0) {
        setMessage('No linked accounts with cached secrets to check yet.');
      } else if (res.driftSteps != null) {
        setMessage(
          `⚠ Your device clock appears to be off by ${Math.abs(res.driftSteps)} step(s). ` +
          'Enable automatic date & time in system settings.',
        );
      } else {
        setMessage('✓ Time sync looks good — codes verified against the server.');
      }
    } catch {
      setMessage('Self-check needs a connection to the server.');
    } finally {
      setChecking(false);
    }
  };

  return <ScrollView contentContainerStyle={[styles.wrap, { backgroundColor: c.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
    <View style={styles.header}><IconButton icon="arrow-left" label="Back" onPress={() => router.back()} /><Text style={[styles.title, { color: c.foreground }]}>Settings</Text><View style={{ width: 42 }} /></View>

    <View style={[styles.section, { borderColor: c.border, backgroundColor: c.card }]}>
      <View style={styles.row}><View style={styles.rowCopy}><Feather name="shield" size={19} color={c.primary} /><View><Text style={[styles.rowTitle, { color: c.foreground }]}>Biometric lock</Text><Text style={[styles.rowSub, { color: c.mutedForeground }]}>Require Face ID or fingerprint to view codes</Text></View></View><Switch value={locked} onValueChange={toggle} trackColor={{ false: c.muted, true: c.primary }} thumbColor={locked ? c.primaryForeground : c.mutedForeground} /></View>
      <View style={[styles.rule, { backgroundColor: c.border }]} />
      <Pressable style={styles.row} disabled={busy} onPress={async () => { try { await sync(); setMessage('Vault synced just now'); } catch {} }}>
        <View style={styles.rowCopy}><Feather name="refresh-cw" size={19} color={c.primary} /><View><Text style={[styles.rowTitle, { color: c.foreground }]}>Sync accounts</Text><Text style={[styles.rowSub, { color: c.mutedForeground }]}>{busy ? 'Syncing…' : accounts.length + ' accounts in your vault'}</Text></View></View>
        <Feather name="chevron-right" size={18} color={c.mutedForeground} />
      </Pressable>
      <View style={[styles.rule, { backgroundColor: c.border }]} />
      <Pressable style={styles.row} disabled={checking} onPress={runSelfCheck}>
        <View style={styles.rowCopy}><Feather name="clock" size={19} color={c.primary} /><View><Text style={[styles.rowTitle, { color: c.foreground }]}>Check time sync</Text><Text style={[styles.rowSub, { color: c.mutedForeground }]}>{checking ? 'Verifying…' : 'Verify your clock against the server'}</Text></View></View>
        <Feather name="chevron-right" size={18} color={c.mutedForeground} />
      </Pressable>
    </View>

    {message ? <Text style={[styles.message, { color: message.startsWith('⚠') ? c.warning : c.mutedForeground }]}>{message}</Text> : null}

    <Text style={[styles.caption, { color: c.mutedForeground }]}>ACCOUNT MANAGEMENT</Text>
    <View style={[styles.section, { borderColor: c.border, backgroundColor: c.card }]}>{accounts.map((a, index) =>
      <View key={a.id} style={styles.row}>
        <View style={styles.rowCopy}>
          <View style={[styles.dot, { backgroundColor: index % 2 ? c.accent : c.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: c.foreground }]}>{a.issuer}{a.localOnly ? ' · device' : ''}</Text>
            <Text style={[styles.rowSub, { color: c.mutedForeground }]}>{a.label}</Text>
          </View>
          {!a.secret ? <Feather name="cloud-off" size={15} color={c.warning} /> : null}
        </View>
        <Pressable accessibilityLabel={'Delete ' + a.issuer} onPress={() => remove(a.id, a.issuer)} style={styles.trash}>
          <Feather name="trash-2" size={17} color={c.destructive} />
        </Pressable>
      </View>
    )}</View>
    <Text style={[styles.rowSub, { color: c.mutedForeground }]}>Accounts marked “device” exist only on this phone.</Text>

    <Pressable onPress={logout} style={styles.logout}><Feather name="log-out" size={17} color={c.destructive} /><Text style={{ color: c.destructive, fontFamily: 'Inter_700Bold' }}>Sign out</Text></Pressable>
    <Text style={[styles.version, { color: c.mutedForeground }]}>VaultKey · Offline-first security</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  section: { borderRadius: 17, borderWidth: 1, overflow: 'hidden' },
  row: { minHeight: 72, paddingHorizontal: 17, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13 },
  rowTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  rowSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  rule: { height: 1, marginLeft: 50 },
  caption: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5, marginTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  message: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 },
  logout: { minHeight: 52, borderRadius: 14, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#4A2528', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  version: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 'auto' },
});