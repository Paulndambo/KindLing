import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { AppScreen, BodyText, BrandMark, Button, Field, Heading } from '@/components/mobile-ui';
import { Brand } from '@/constants/brand';
import { useSession } from '@/context/session';

const GRADES = ['5th grade', '6th grade', '7th grade', '8th grade', 'High school', 'College'];

export default function OnboardingScreen() {
  const { session, profile, finishOnboarding } = useSession();
  const [name, setName] = useState(profile?.name || session?.name || '');
  const [grade, setGrade] = useState(profile?.grade || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (name.trim().length < 2) { setError('Enter the learner’s name.'); return; }
    if (!grade) { setError('Choose a grade so lessons can use the right language.'); return; }
    setBusy(true); setError('');
    try { await finishOnboarding(name, grade); router.replace('/'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'We couldn’t save your profile. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <AppScreen scroll contentStyle={styles.content}>
      <View style={styles.header}><BrandMark size={48} /><Text style={styles.step}>ONE QUICK STEP</Text></View>
      <Heading>Make lessons feel like yours.</Heading>
      <BodyText>We use a name and grade to tune explanations to the learner. You can update these later.</BodyText>
      <Field label="Learner name" value={name} onChangeText={setName} placeholder="Name" autoCapitalize="words" autoComplete="name" />
      <View style={styles.gradeGroup}>
        <Text style={styles.label}>What grade are you in?</Text>
        <View style={styles.choices}>
          {GRADES.map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: grade === item }} onPress={() => setGrade(item)} style={[styles.choice, grade === item && styles.choiceSelected]}><Text style={[styles.choiceText, grade === item && styles.choiceTextSelected]}>{item}</Text></Pressable>)}
        </View>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button busy={busy} onPress={save}>Continue to your subjects</Button>
      <Text style={styles.privacy}>Kindling uses child-safe defaults when grade details are missing.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingTop: 32, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { color: Brand.teal, fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
  label: { color: Brand.ink, fontSize: 14, fontWeight: '700' },
  gradeGroup: { gap: 10 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: Brand.card, borderWidth: 1, borderColor: Brand.line, justifyContent: 'center' },
  choiceSelected: { backgroundColor: Brand.pine, borderColor: Brand.pine },
  choiceText: { color: Brand.ink, fontSize: 14, fontWeight: '600' },
  choiceTextSelected: { color: '#fff' },
  error: { color: Brand.error, backgroundColor: '#FCECE9', borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 20 },
  privacy: { color: Brand.muted, textAlign: 'center', fontSize: 13, lineHeight: 19 },
});
