import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { IconButton, PrimaryButton } from '@/components/ui';
import { formatCode, generateCode, getRemaining, parseOtpAuthUri } from '@/lib/totp';
import type { Account } from '@/lib/types';

type Phase = 'scanning' | 'connecting' | 'connected' | 'error';

type ScanResult = Account & { linked: boolean };

export default function Scan() {
  const c = useColors();
  const { pairAccount } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lockScan, setLockScan] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Live preview code on the connected screen.
  const preview = useMemo(() => {
    if (!result) return null;
    try {
      return generateCode(result);
    } catch {
      return null;
    }
  }, [result]);

  const onScan = async ({ data }: { data: string }) => {
    if (lockScan) return;
    setLockScan(true);
    setError(null);
    let parsed;
    try {
      parsed = parseOtpAuthUri(data);
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Unrecognized QR code');
      return;
    }
    setPhase('connecting');
    try {
      const { account, linked } = await pairAccount(parsed);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult({ ...account, linked });
      setPhase('connected');
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Could not import this QR code');
      setLockScan(false);
    }
  };

  const reset = () => {
    setPhase('scanning');
    setError(null);
    setLockScan(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <IconButton icon="x" label="Close scanner" onPress={() => router.back()} />
        <Text style={[styles.heading, { color: c.foreground }]}>Scan pairing QR</Text>
        <View style={{ width: 42 }} />
      </View>

      {phase === 'connected' && result ? (
        <View style={styles.center}>
          <View style={[styles.badge, { backgroundColor: c.primary }]}>
            <Feather name="check" size={30} color={c.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: c.foreground }]}>Connected</Text>
          <Text style={[styles.sub, { color: c.mutedForeground }]}>
            {result.linked
              ? 'Linked to your vault account — codes stay in sync.'
              : 'Saved on this device. Codes are generated offline.'}
          </Text>

          <View style={[styles.codeCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.issuer, { color: c.foreground }]}>{result.issuer}</Text>
            <Text style={[styles.labelText, { color: c.mutedForeground }]}>{result.label}</Text>
            <Text style={[styles.code, { color: c.accent }]}>
              {preview ? formatCode(preview) : '··· ···'}
            </Text>
            <Text style={[styles.countdown, { color: c.mutedForeground }]}>
              new code in {getRemaining(result.period ?? 30)}s
            </Text>
          </View>

          <Text style={[styles.hint, { color: c.mutedForeground }]}>
            Compare this code with the web dashboard — they must match and rotate together.
          </Text>
          <PrimaryButton title="Done" onPress={() => router.replace('/')} />
        </View>
      ) : phase === 'error' ? (
        <View style={styles.center}>
          <View style={[styles.badge, { backgroundColor: c.destructive }]}>
            <Feather name="alert-triangle" size={28} color={c.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: c.foreground }]}>Couldn&apos;t read that</Text>
          <Text style={[styles.sub, { color: c.destructive }]}>{error}</Text>
          <PrimaryButton title="Scan again" onPress={reset} />
          <Text onPress={() => router.push('/add')} style={[styles.altAction, { color: c.primary }]}>
            Type details instead
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={[styles.cameraWrap, { borderColor: c.border }]}>
            {permission?.granted ? (
              <View style={styles.cameraBox}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={onScan}
                />
                <View style={[styles.overlay, StyleSheet.absoluteFill]} pointerEvents="none">
                  <View style={[styles.frame, { borderColor: c.primary }]} />
                  <Text style={styles.overlayText}>
                    {phase === 'connecting' ? 'Importing…' : 'Point at the otpauth:// QR'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.camera, styles.center]}>
                <Feather name="camera" size={26} color={c.mutedForeground} />
                <Text style={{ color: c.mutedForeground, marginTop: 10, textAlign: 'center' }}>
                  {permission?.granted === false && !permission.canAskAgain
                    ? 'Camera permission was denied. Enable it in system settings.'
                    : 'Requesting camera…'}
                </Text>
              </View>
            )}
          </View>
          {error ? <Text style={{ color: c.destructive, fontFamily: 'Inter_500Medium', textAlign: 'center' }}>{error}</Text> : null}
          <Text onPress={() => router.push('/add')} style={[styles.altAction, { color: c.primary }]}>
            Prefer typing? Add manually
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingTop: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  body: { padding: 20, gap: 16 },
  cameraWrap: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  cameraBox: { width: '100%', aspectRatio: 1 },
  camera: { width: '100%', aspectRatio: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 30 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  frame: { width: '62%', aspectRatio: 1, borderWidth: 3, borderRadius: 18 },
  overlayText: { color: '#fff', marginTop: 16, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  badge: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  codeCard: { width: '100%', borderRadius: 18, borderWidth: 1, padding: 22, alignItems: 'center', gap: 4, marginTop: 8 },
  issuer: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  labelText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  code: { fontFamily: 'Inter_700Bold', fontSize: 38, letterSpacing: 4, marginTop: 8 },
  countdown: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  hint: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 6 },
  altAction: { fontFamily: 'Inter_600SemiBold', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
});