import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppScreen, BodyText, BrandMark, Button, SectionTitle } from '@/components/mobile-ui';
import { Brand } from '@/constants/brand';
import { useSession } from '@/context/session';
import { getLearningDashboard, type LearningDashboard } from '@/services/api';

export default function HomeScreen() {
  const { profile, session } = useSession();
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setDashboard(await getLearningDashboard()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load your learning overview.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  const week = dashboard?.weekStats?.this;
  const metrics = [
    { label: 'Sessions', value: week?.sessions?.value || '0', caption: 'this week', icon: '◷' },
    { label: 'Study time', value: week?.time?.value || '0 min', caption: 'this week', icon: '◴' },
    { label: 'Practice turns', value: week?.questions || '0', caption: 'this week', icon: '✎' },
  ];
  const recent = dashboard?.recentActivity?.[0];

  return (
    <AppScreen scroll contentStyle={styles.page} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={Brand.teal} colors={[Brand.teal]} />}>
      <View style={styles.topline}>
        <BrandMark size={42} />
        <View style={styles.greeting}><Text style={styles.eyebrow}>KINDLING · YOUR AI TUTOR</Text><Text style={styles.hello}>Hi, {profile?.name?.split(' ')[0] || session?.name?.split(' ')[0] || 'there'}.</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/(tabs)/profile')} style={styles.avatar}><Text style={styles.avatarText}>{(profile?.name || session?.name || 'S').slice(0, 1).toUpperCase()}</Text></Pressable>
      </View>

      <View style={styles.welcome}>
        <View style={styles.welcomeCopy}><Text style={styles.welcomeEyebrow}>YOUR PERSONAL TUTOR</Text><Text style={styles.welcomeTitle}>Let’s learn something together.</Text><Text style={styles.welcomeBody}>Kindling explains ideas, works through examples, and practises with you one step at a time.</Text></View>
        <Button onPress={() => router.push('/(tabs)/learn')}>Choose a lesson</Button>
      </View>

      <View style={styles.sectionRow}><SectionTitle>YOUR WEEK</SectionTitle><Text style={styles.sectionAside}>Last 7 days</Text></View>
      {loading && !dashboard ? <View style={styles.loading}><ActivityIndicator color={Brand.teal} /><Text style={styles.muted}>Gathering your learning activity…</Text></View> : <View style={styles.metricGrid}>
        {metrics.map((metric) => <View key={metric.label} style={styles.metricCard}><View style={styles.metricTop}><Text style={styles.metricIcon}>{metric.icon}</Text><Text style={styles.metricLabel}>{metric.label}</Text></View><Text style={styles.metricValue}>{metric.value}</Text><Text style={styles.metricCaption}>{metric.caption}</Text></View>)}
      </View>}
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Button variant="plain" onPress={() => void load()}>Try again</Button></View> : null}

      <SectionTitle>PICK UP WITH KINDLING</SectionTitle>
      {recent ? <Pressable accessibilityRole="button" accessibilityLabel={`Continue ${recent.title || 'recent lesson'}`} onPress={() => router.push({ pathname: '/lesson', params: { subject: recent.subject || 'Learning', topic: recent.title || recent.subject || 'Learning', unit: recent.title || recent.subject || 'Learning', grade: profile?.grade || '' } })} style={({ pressed }) => [styles.recentCard, pressed && styles.pressed]}>
        <View style={styles.recentIcon}><Text style={styles.recentGlyph}>↗</Text></View><View style={styles.recentCopy}><Text style={styles.recentEyebrow}>{recent.when || 'RECENT LESSON'}{recent.subject ? `  ·  ${recent.subject}` : ''}</Text><Text style={styles.recentTitle} numberOfLines={1}>{recent.title || 'Lesson'}</Text><Text style={styles.recentDetail} numberOfLines={2}>{recent.detail || 'Continue building your understanding.'}</Text></View><Text style={styles.arrow}>›</Text>
      </Pressable> : <View style={styles.emptyCard}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyTitle}>Your first lesson is waiting</Text><BodyText style={styles.emptyBody}>Choose a subject and start with a topic that interests you. Your progress will show up here.</BodyText><Button variant="secondary" onPress={() => router.push('/(tabs)/learn')}>Browse subjects</Button></View>}

      {dashboard?.masteryMap?.length ? <><SectionTitle>SKILLS YOU’RE BUILDING</SectionTitle><View style={styles.skillsCard}>{dashboard.masteryMap.slice(0, 3).map((skill, index) => <View key={`${skill.subject}-${skill.skill}-${index}`} style={[styles.skillRow, index > 0 && styles.skillDivider]}><View style={styles.skillCopy}><Text style={styles.skillName} numberOfLines={1}>{skill.skill || 'Learning skill'}</Text><Text style={styles.skillSubject}>{skill.subject || skill.status || 'In progress'}</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, Number(skill.level) || 0))}%` }]} /></View><Text style={styles.skillPercent}>{Math.max(0, Math.min(100, Number(skill.level) || 0))}%</Text></View>)}</View></> : null}
      <Text style={styles.footerNote}>Small steps make strong foundations.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 18, paddingBottom: 28, gap: 16 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 12 }, greeting: { flex: 1, gap: 2 }, eyebrow: { color: Brand.teal, fontSize: 10, letterSpacing: 1.25, fontWeight: '800' }, hello: { fontSize: 25, fontWeight: '700', color: Brand.pine },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Brand.tealPale, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: Brand.pine, fontWeight: '800', fontSize: 17 },
  welcome: { backgroundColor: Brand.pine, borderRadius: 24, padding: 20, gap: 17, overflow: 'hidden' }, welcomeCopy: { gap: 8 }, welcomeEyebrow: { color: '#B9DAD3', fontSize: 10, letterSpacing: 1.1, fontWeight: '800' }, welcomeTitle: { color: '#fff', fontSize: 23, lineHeight: 29, fontWeight: '700', maxWidth: 280 }, welcomeBody: { color: '#D6E3DE', fontSize: 14, lineHeight: 21 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionAside: { color: Brand.muted, fontSize: 12 }, metricGrid: { flexDirection: 'row', gap: 9 }, metricCard: { flex: 1, minHeight: 112, borderRadius: 17, borderWidth: 1, borderColor: Brand.line, backgroundColor: '#fff', padding: 12, justifyContent: 'space-between' }, metricTop: { gap: 6 }, metricIcon: { color: Brand.teal, fontSize: 17, fontWeight: '700' }, metricLabel: { color: Brand.muted, fontSize: 11, fontWeight: '600' }, metricValue: { color: Brand.pine, fontSize: 20, fontWeight: '800' }, metricCaption: { color: Brand.muted, fontSize: 10 },
  loading: { minHeight: 95, justifyContent: 'center', alignItems: 'center', gap: 10 }, muted: { color: Brand.muted, fontSize: 13 }, errorBox: { backgroundColor: '#FCECE9', padding: 14, borderRadius: 14, gap: 6 }, errorText: { color: Brand.error, fontSize: 13, lineHeight: 19 },
  recentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.line, borderRadius: 18, padding: 14 }, recentIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F7F1E4', alignItems: 'center', justifyContent: 'center' }, recentGlyph: { color: Brand.pine, fontSize: 20 }, recentCopy: { flex: 1, gap: 4 }, recentEyebrow: { color: Brand.teal, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 }, recentTitle: { color: Brand.pine, fontSize: 16, fontWeight: '700' }, recentDetail: { color: Brand.muted, fontSize: 12, lineHeight: 17 }, arrow: { color: Brand.muted, fontSize: 25 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.line, borderRadius: 20, padding: 20, gap: 10 }, emptyIcon: { color: Brand.gold, fontSize: 28 }, emptyTitle: { color: Brand.pine, fontSize: 17, fontWeight: '700' }, emptyBody: { textAlign: 'center', fontSize: 14, lineHeight: 21 }, skillsCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.line, borderRadius: 18, paddingHorizontal: 14 }, skillRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64 }, skillDivider: { borderTopWidth: 1, borderTopColor: Brand.line }, skillCopy: { flex: 1.2, gap: 3 }, skillName: { color: Brand.pine, fontSize: 13, fontWeight: '700' }, skillSubject: { color: Brand.muted, fontSize: 11 }, progressTrack: { height: 7, flex: 0.8, borderRadius: 6, backgroundColor: '#E9EFEB', overflow: 'hidden' }, progressFill: { height: 7, borderRadius: 6, backgroundColor: Brand.teal }, skillPercent: { width: 32, color: Brand.pine, fontSize: 11, fontWeight: '700', textAlign: 'right' }, footerNote: { color: Brand.muted, textAlign: 'center', fontSize: 12, paddingTop: 4 }, pressed: { opacity: 0.7 },
});
