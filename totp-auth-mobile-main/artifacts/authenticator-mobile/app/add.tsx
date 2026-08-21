import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { Field, IconButton, PrimaryButton } from '@/components/ui';

export default function AddAccount() {
  const c = useColors();
  const { addAccount, busy } = useAuth();
  const [issuer, setIssuer] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (!issuer.trim() || !label.trim()) {
      setError('Issuer and account label are required.');
      return;
    }
    if (issuer.length > 128 || label.length > 256) {
      setError('Issuer or account label is too long.');
      return;
    }
    try {
      const result = await addAccount({ issuer: issuer.trim(), label: label.trim() });
      router.replace({ pathname: '/backup', params: { codes: JSON.stringify(result.backupCodes), qrCode: result.qrCode, label: result.account.label } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save account');
    }
  };

  return <View style={[styles.screen, { backgroundColor: c.background }]}>
    <View style={styles.header}><IconButton icon="x" label="Close add account" onPress={() => router.back()} /><Text style={[styles.heading, { color: c.foreground }]}>Add account</Text><View style={{ width: 42 }} /></View>
    <View style={styles.body}>
      <View style={[styles.info, { backgroundColor: c.secondary, borderColor: c.border }]}>
        <Text style={[styles.infoTitle, { color: c.primary }]}>The server creates your key</Text>
        <Text style={[styles.infoCopy, { color: c.mutedForeground }]}>Enter the provider and account label. VaultKey will securely receive the setup key once, cache it locally, and never send it back.</Text>
      </View>
      <Field label="Issuer" value={issuer} onChangeText={setIssuer} placeholder="Example Bank" autoCapitalize="words" />
      <Field label="Account label" value={label} onChangeText={setLabel} placeholder="you@example.com" />
      {error ? <Text style={{ color: c.destructive, fontFamily: 'Inter_500Medium' }}>{error}</Text> : null}
      <PrimaryButton title="Create account" onPress={save} loading={busy} />
      <Text onPress={() => router.push('/scan')} style={[styles.altAction, { color: c.primary }]}>
        Have a QR code? Scan it instead
      </Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingTop: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  body: { padding: 20, gap: 17 },
  info: { borderRadius: 16, borderWidth: 1, padding: 17, gap: 7, marginBottom: 4 },
  infoTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  infoCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  altAction: { fontFamily: 'Inter_600SemiBold', fontSize: 14, textAlign: 'center', paddingVertical: 6 },
});