import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen, BodyText, BrandMark, Button, Field, Heading } from '@/components/mobile-ui';
import { Brand } from '@/constants/brand';
import { COUNTRIES, CURRICULUM_HINTS, GRADE_OPTIONS, LEARNING_STYLES, profileOptions, isHigherEducation } from '@/constants/learner-profile';
import { useSession } from '@/context/session';

const AVATARS = [
  { id: 'sparkles', label: 'Sparkles', icon: '✦' },
  { id: 'rocket', label: 'Rocket', icon: '🚀' },
  { id: 'flame', label: 'Flame', icon: '🔥' },
  { id: 'bot', label: 'Robot', icon: '🤖' },
  { id: 'compass', label: 'Explorer', icon: '🧭' },
];

export default function OnboardingScreen() {
  const { session, profile, finishOnboarding } = useSession();
  const [name, setName] = useState(profile?.name || session?.name || '');
  const [grade, setGrade] = useState(profile?.grade || '');
  const [avatar, setAvatar] = useState(profile?.avatar || 'sparkles');
  const [country, setCountry] = useState(profile?.country || '');
  const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferredLanguage || '');
  const [schoolName, setSchoolName] = useState(profile?.schoolName || '');
  const [curriculum, setCurriculum] = useState(profile?.curriculum || '');
  const [learningStyle, setLearningStyle] = useState(profile?.learningStyle || 'visual');
  const [interests, setInterests] = useState<string[]>(Array.isArray(profile?.interests) ? profile.interests : []);
  const [goal, setGoal] = useState(profile?.goal || '');
  const [customInterest, setCustomInterest] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const higherEd = isHigherEducation(grade);
  const { curricula, interests: interestOptions, goals } = profileOptions(grade);
  const countryFlag = COUNTRIES.find(([label]) => label === country)?.[1] || profile?.countryFlag || '';

  const chooseGrade = (nextGrade: string) => {
    if (isHigherEducation(grade) !== isHigherEducation(nextGrade)) {
      setCurriculum('');
      setGoal('');
      setInterests([]);
    }
    setGrade(nextGrade);
  };

  const toggleInterest = (item: string) => {
    setInterests((current) => current.includes(item)
      ? current.filter((value) => value !== item)
      : current.length < 6 ? [...current, item] : current);
  };

  const addCustomInterest = () => {
    const item = customInterest.trim();
    if (item && !interests.includes(item) && interests.length < 6) setInterests((current) => [...current, item]);
    setCustomInterest('');
  };

  const save = async () => {
    if (name.trim().length < 2) { setError('Enter the learner’s name.'); return; }
    if (!grade) { setError('Choose a grade or study level.'); return; }
    setBusy(true); setError('');
    try {
      await finishOnboarding({
        name: name.trim(), grade, avatar, country, countryFlag, preferredLanguage: preferredLanguage.trim(),
        schoolName: schoolName.trim(), schoolType: profile?.schoolType || '', curriculum,
        academicTarget: profile?.academicTarget || '', learningStyle, interests,
        focusSubjects: profile?.focusSubjects || [], goal,
        weekFocus: profile?.weekFocus || '', targetLabel: profile?.targetLabel || '', targetDate: profile?.targetDate || null,
        isOnboarded: true, digestOptIn: profile?.digestOptIn || false, familyEmail: profile?.familyEmail || '',
      });
      router.replace('/(tabs)/profile');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We couldn’t save the profile. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <AppScreen scroll contentStyle={styles.content}>
      <View style={styles.header}><BrandMark size={48} /><Text style={styles.step}>{profile?.isOnboarded ? 'EDIT LEARNER PROFILE' : 'LEARNER PROFILE'}</Text></View>
      <Heading>{profile?.isOnboarded ? 'Update learner details.' : 'Make lessons feel like yours.'}</Heading>
      <BodyText>Personalize how Kindling teaches. You can update these details at any time.</BodyText>

      <Field label="Learner name" value={name} onChangeText={setName} placeholder="Name" autoCapitalize="words" autoComplete="name" />
      <ChoiceGroup label="Grade or study level" options={GRADE_OPTIONS} value={grade} onChange={chooseGrade} />

      <View style={styles.group}>
        <Text style={styles.label}>Pick an avatar</Text>
        <View style={styles.choices}>{AVATARS.map((item) => <Choice key={item.id} label={`${item.icon}  ${item.label}`} selected={avatar === item.id} onPress={() => setAvatar(item.id)} />)}</View>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Country</Text>
        <View style={styles.choices}>{COUNTRIES.map(([label, flag]) => <Choice key={label} label={`${flag} ${label}`} selected={country === label} onPress={() => { setCountry(label); if (!curriculum && !higherEd && CURRICULUM_HINTS[label]) setCurriculum(CURRICULUM_HINTS[label]); }} />)}</View>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{higherEd ? 'Programme track' : 'Curriculum'}</Text>
        <Text style={styles.hint}>Optional · choose a pathway or leave as standard.</Text>
        <View style={styles.choices}>{curricula.map((item) => <Choice key={item} label={item} selected={curriculum === item} onPress={() => setCurriculum((current) => current === item ? '' : item)} />)}</View>
      </View>

      <Field label="Tutoring language" value={preferredLanguage} onChangeText={setPreferredLanguage} placeholder="e.g. English, Español" maxLength={80} />
      <Field label={higherEd ? 'University / college' : 'School name'} value={schoolName} onChangeText={setSchoolName} placeholder="Optional" autoCapitalize="words" />

      <View style={styles.group}>
        <Text style={styles.label}>Explanation style</Text>
        <View style={styles.choices}>{LEARNING_STYLES.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: learningStyle === item.id }} onPress={() => setLearningStyle(item.id)} style={[styles.styleChoice, learningStyle === item.id && styles.selected]}><Text style={[styles.choiceText, learningStyle === item.id && styles.selectedText]}>{item.label}</Text><Text style={[styles.styleDetail, learningStyle === item.id && styles.selectedText]}>{item.detail}</Text></Pressable>)}</View>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Interests for examples <Text style={styles.hint}>· optional · {interests.length}/6</Text></Text>
        <View style={styles.choices}>{interestOptions.map((item) => <Choice key={item} label={item} selected={interests.includes(item)} disabled={!interests.includes(item) && interests.length >= 6} onPress={() => toggleInterest(item)} />)}</View>
        <View style={styles.customRow}><TextInput accessibilityLabel="Add a custom interest" style={styles.customInput} placeholder="Or add your own interest" placeholderTextColor={Brand.muted} value={customInterest} onChangeText={setCustomInterest} onSubmitEditing={addCustomInterest} returnKeyType="done" maxLength={60} /><Button variant="secondary" disabled={!customInterest.trim() || interests.length >= 6} onPress={addCustomInterest}>Add</Button></View>
        {interests.filter((item) => !interestOptions.includes(item)).map((item) => <Choice key={item} label={`${item}  ×`} selected onPress={() => toggleInterest(item)} />)}
      </View>

      <ChoiceGroup label="Main goal · optional" options={goals} value={goal} onChange={(item) => setGoal((current) => current === item ? '' : item)} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button busy={busy} onPress={() => void save()}>{profile?.isOnboarded ? 'Save profile changes' : 'Save learner profile'}</Button>
      {profile?.isOnboarded ? <Button variant="plain" disabled={busy} onPress={() => router.back()}>Cancel</Button> : null}
      <Text style={styles.privacy}>You can leave optional details blank and change them later.</Text>
    </AppScreen>
  );
}

function ChoiceGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.group}><Text style={styles.label}>{label}</Text><View style={styles.choices}>{options.map((item) => <Choice key={item} label={item} selected={value === item} onPress={() => onChange(item)} />)}</View></View>;
}

function Choice({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={[styles.choice, selected && styles.selected, disabled && styles.disabled]}><Text style={[styles.choiceText, selected && styles.selectedText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 28, paddingBottom: 44, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { color: Brand.teal, fontSize: 12, fontWeight: '600', letterSpacing: 0.8 },
  group: { gap: 10 },
  label: { color: Brand.ink, fontSize: 14, fontWeight: '700' },
  hint: { color: Brand.muted, fontSize: 12, fontWeight: '400' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 42, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 14, backgroundColor: Brand.card, borderWidth: 1, borderColor: Brand.line, justifyContent: 'center', maxWidth: '100%' },
  choiceText: { color: Brand.ink, fontSize: 13, fontWeight: '600' },
  selected: { backgroundColor: Brand.pine, borderColor: Brand.pine },
  selectedText: { color: '#fff' },
  disabled: { opacity: 0.45 },
  styleChoice: { width: '48%', flexGrow: 1, minHeight: 92, justifyContent: 'center', gap: 6, padding: 12, borderRadius: 15, backgroundColor: Brand.card, borderWidth: 1, borderColor: Brand.line },
  styleDetail: { color: Brand.muted, fontSize: 12, lineHeight: 17 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customInput: { flex: 1, height: 48, paddingHorizontal: 13, backgroundColor: Brand.card, borderWidth: 1, borderColor: Brand.line, borderRadius: 13, color: Brand.ink },
  error: { color: Brand.error, backgroundColor: '#FCECE9', borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 20 },
  privacy: { color: Brand.muted, textAlign: 'center', fontSize: 13, lineHeight: 19 },
});
