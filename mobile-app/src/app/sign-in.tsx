import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AppScreen, BodyText, BrandMark, Button, Field, Heading } from '@/components/mobile-ui';
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <BrandMark size={54} />
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>KINDLING · YOUR AI TUTOR</Text>
          <Heading>{isRegister ? 'Meet your new learning partner.' : 'Welcome back.'}</Heading>
          <BodyText>{isRegister ? 'Create your student account, then Kindling will help you learn through clear explanations and practice.' : 'Your tutor, subjects, and lessons are ready when you are.'}</BodyText>
        </View>
        {isRegister && <Field label="Your name" value={name} onChangeText={setName} placeholder="Name" autoCapitalize="words" autoComplete="name" returnKeyType="next" />}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder={isRegister ? 'At least 8 characters' : 'Your password'} secureTextEntry autoComplete={isRegister ? 'new-password' : 'current-password'} onSubmitEditing={submit} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Button onPress={submit} busy={busy}>{isRegister ? 'Create account' : 'Log in'}</Button>
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>{isRegister ? 'Already have an account?' : 'New to Kindling?'}</Text>
          <Button variant="plain" onPress={() => { setError(''); setIsRegister(!isRegister); }}>{isRegister ? 'Log in' : 'Get started'}</Button>
        </View>
        <Text style={styles.privacy}>Your learning profile stays in your Kindling account.</Text>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingTop: 32, paddingBottom: 40 },
  wrap: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 18 },
  intro: { gap: 10, marginBottom: 6 },
  eyebrow: { color: Brand.teal, fontSize: 12, letterSpacing: 1.6, fontWeight: '800' },
  error: { color: Brand.error, backgroundColor: '#FCECE9', borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  switchText: { color: Brand.muted, fontSize: 14 },
  privacy: { textAlign: 'center', color: Brand.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
});
