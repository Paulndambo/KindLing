import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AppScreen, BrandMark, Button, Field, Heading } from '@/components/mobile-ui';
import { Brand } from '@/constants/brand';
import { useSession } from '@/context/session';

export default function SignInScreen() {
  const { signIn, register } = useSession();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Enter your email and password to continue.'); return; }
    if (isRegister && name.trim().length < 2) { setError('Add your name to set up your learner profile.'); return; }
    if (isRegister && password.length < 8) { setError('Choose a password with at least 8 characters.'); return; }
    setBusy(true);
    try {
      if (isRegister) await register(name, email, password);
      else await signIn(email, password);
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We couldn’t sign you in. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <AppScreen scroll contentStyle={styles.content}>
      <View style={styles.wrap}>
        <View style={styles.brandRow}>
          <BrandMark size={28} />
          <Text style={styles.wordmark}>kindling</Text>
        </View>
        <Heading style={styles.title}>{isRegister ? 'Create an account' : 'Welcome back'}</Heading>
        {isRegister && <Field label="Your name" value={name} onChangeText={setName} placeholder="Name" autoCapitalize="words" autoComplete="name" returnKeyType="next" />}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder={isRegister ? 'At least 8 characters' : 'Your password'} secureTextEntry autoComplete={isRegister ? 'new-password' : 'current-password'} onSubmitEditing={submit} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Button onPress={submit} busy={busy}>{isRegister ? 'Create account' : 'Log in'}</Button>
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>{isRegister ? 'Already have an account?' : 'New to Kindling?'}</Text>
          <Button variant="plain" onPress={() => { setError(''); setIsRegister(!isRegister); }}>{isRegister ? 'Log in' : 'Create account'}</Button>
        </View>
        <Text style={styles.tagline}>Your progress. Your pace. Your Kindling.</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingTop: 32, paddingBottom: 32 },
  wrap: { width: '100%', maxWidth: 400, alignSelf: 'center', gap: 16 },
  brandRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  wordmark: { color: Brand.pine, fontSize: 22, fontWeight: '600', letterSpacing: -0.6 },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6, marginBottom: 8, textAlign: 'center' },
  error: { color: Brand.error, backgroundColor: '#FCECE9', borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  switchText: { color: Brand.muted, fontSize: 14 },
  tagline: { textAlign: 'center', color: Brand.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
});
