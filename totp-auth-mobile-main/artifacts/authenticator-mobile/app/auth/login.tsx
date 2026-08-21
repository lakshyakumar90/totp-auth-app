import React, { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { Field, PrimaryButton } from '@/components/ui';

export default function Login() {
  const c = useColors();
  const { login, busy, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signup, setSignup] = useState(false);
  const validPassword = password.length >= 8 && password.length <= 128;
  const submit = async () => {
    if (!email || !validPassword) return;
    try { await login(email, password, signup); } catch {}
  };
  return <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.wrap, { backgroundColor: c.background }]} bottomOffset={20}>
    <View style={styles.hero}><Text style={[styles.eyebrow, { color: c.primary }]}>VAULTKEY</Text><Text style={[styles.title, { color: c.foreground }]}>{signup ? 'Create your vault.' : 'Welcome back.'}</Text><Text style={[styles.sub, { color: c.mutedForeground }]}>{signup ? 'One secure home for every verification code.' : 'Your codes are generated on-device, even without signal.'}</Text></View>
    <View style={styles.form}><Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" /><Field label="Password" value={password} onChangeText={setPassword} placeholder="8–128 characters" secureTextEntry /><PrimaryButton title={signup ? 'Create vault' : 'Sign in'} onPress={submit} loading={busy} disabled={!email || !validPassword} />{error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}</View>
    <Text style={[styles.switch, { color: c.mutedForeground }]}>{signup ? 'Already have an account?' : 'New to VaultKey?'} <Text onPress={() => setSignup(!signup)} style={{ color: c.primary, fontFamily: 'Inter_700Bold' }}>{signup ? 'Sign in' : 'Create one'}</Text></Text>
    <Text onPress={() => router.back()} style={[styles.cancel, { color: c.mutedForeground }]}>Cancel</Text>
  </KeyboardAwareScrollViewCompat>;
}

const styles = StyleSheet.create({ wrap: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 26 }, hero: { gap: 10 }, eyebrow: { fontFamily: 'Inter_700Bold', letterSpacing: 2, fontSize: 12 }, title: { fontFamily: 'Inter_700Bold', fontSize: 32 }, sub: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 23 }, form: { gap: 16 }, error: { fontFamily: 'Inter_500Medium' }, switch: { textAlign: 'center', fontFamily: 'Inter_500Medium' }, cancel: { textAlign: 'center', fontFamily: 'Inter_500Medium' } });