import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen, BodyText, BrandMark, Button, SectionTitle, ui } from '@/components/mobile-ui';
import { Brand } from '@/constants/brand';
import { useSession } from '@/context/session';
import { createSubject, createSubtopic, createTopic, listSubjects, type Subject } from '@/services/api';

export default function LearnScreen() {
  const { profile } = useSession();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [firstTopic, setFirstTopic] = useState('');
  const [topicDraft, setTopicDraft] = useState('');
  const [subtopicDrafts, setSubtopicDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setSubjects(await listSubjects()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load your subjects.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  const addSubject = async () => {
    if (!subjectName.trim() || saving) return;
    setSaving(true); setError('');
    try {
      await createSubject(subjectName.trim(), firstTopic);
      setSubjectName(''); setFirstTopic(''); setShowCreate(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create this subject.'); }
    finally { setSaving(false); }
  };

  const addTopic = async () => {
    const name = topicDraft.trim();
    if (!selected || !name || saving) return;
    setSaving(true); setError('');
    try { await createTopic(selected.id, name); setTopicDraft(''); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add this topic.'); }
    finally { setSaving(false); }
  };

  const addSubtopic = async (topic: Subject['topics'][number]) => {
    const name = (subtopicDrafts[topic.id ?? -1] || '').trim();
    if (topic.id == null || !name || saving) return;
    setSaving(true); setError('');
    try { await createSubtopic(topic.id, name); setSubtopicDrafts((drafts) => ({ ...drafts, [topic.id!]: '' })); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add this subtopic.'); }
    finally { setSaving(false); }
  };

  const selected = subjects.find((subject) => subject.id === selectedId);
  const startLesson = (subject: Subject, unit: string, lesson: string, goal = '') => {
    router.push({ pathname: '/lesson', params: { subject: subject.name, unit, topic: lesson, goal, grade: profile?.grade || '' } });
  };

  return (
    <>
      <AppScreen scroll contentStyle={styles.page}>
        {selected ? <>
          <Pressable accessibilityRole="button" onPress={() => { setSelectedId(null); setError(''); }} style={styles.back}><Text style={styles.backText}>‹  All subjects</Text></Pressable>
          <View style={styles.detailHero}><View style={styles.subjectIcon}><Text style={styles.subjectIconText}>{selected.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.subjectCopy}><Text style={styles.eyebrow}>SUBJECT WORKSPACE</Text><Text style={styles.hello}>{selected.name}</Text><Text style={styles.subjectMeta}>{selected.topics.length} {selected.topics.length === 1 ? 'topic' : 'topics'} · plan your learning path</Text></View></View>
          <SectionTitle>Topics & subtopics</SectionTitle>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Button variant="plain" onPress={load}>Try again</Button></View> : null}
          {selected.topics.length ? selected.topics.map((topic, index) => {
            const leaves = topic.subtopics.filter((leaf) => leaf.id !== topic.id || leaf.name !== topic.name);
            return <View key={`${topic.id}-${topic.name}`} style={styles.topicCard}>
              <View style={styles.topicHeading}><Text style={styles.topicNumber}>{String(index + 1).padStart(2, '0')}</Text><View style={styles.flex}><Text style={styles.topicTitle}>{topic.name}</Text><Text style={styles.subjectMeta}>{leaves.length} {leaves.length === 1 ? 'lesson' : 'lessons'}</Text></View></View>
              {leaves.length ? leaves.map((leaf, lessonIndex) => <Pressable key={`${leaf.id}-${leaf.name}`} accessibilityRole="button" onPress={() => startLesson(selected, topic.name, leaf.name, leaf.learningGoal)} style={({ pressed }) => [styles.lessonRow, pressed && styles.pressed]}><View style={styles.lessonDot}><Text style={styles.lessonNumber}>{lessonIndex + 1}</Text></View><Text numberOfLines={2} style={styles.lessonText}>{leaf.name}</Text><Text style={styles.arrow}>›</Text></Pressable>) : <Text style={styles.emptyHint}>Add a subtopic to create the first lesson in this topic.</Text>}
              {topic.id != null ? <View style={styles.addSubtopic}><TextInput value={subtopicDrafts[topic.id] || ''} onChangeText={(value) => setSubtopicDrafts((drafts) => ({ ...drafts, [topic.id!]: value }))} placeholder="Add a subtopic…" placeholderTextColor="#87918B" style={styles.inlineInput} returnKeyType="done" onSubmitEditing={() => void addSubtopic(topic)} accessibilityLabel={`New subtopic in ${topic.name}`} /><Pressable accessibilityRole="button" disabled={saving || !(subtopicDrafts[topic.id] || '').trim()} onPress={() => void addSubtopic(topic)} style={styles.addInline}><Text style={styles.addInlineText}>＋ Add</Text></Pressable></View> : null}
            </View>;
          }) : <View style={[ui.card, styles.empty]}><Text style={styles.emptyGlyph}>✦</Text><Text style={styles.emptyTitle}>Your learning path starts here</Text><BodyText style={styles.emptyBody}>Add a topic to begin organizing this subject.</BodyText></View>}
          <View style={styles.topicForm}><Text style={styles.fieldLabel}>Add a topic</Text><TextInput value={topicDraft} onChangeText={setTopicDraft} style={styles.input} placeholder="e.g. Introduction to algebra" placeholderTextColor="#87918B" returnKeyType="done" onSubmitEditing={() => void addTopic()} accessibilityLabel="New topic"/><Button busy={saving} disabled={!topicDraft.trim()} onPress={() => void addTopic()}>＋  Add topic</Button></View>
        </> : <>
          <View style={styles.topline}><BrandMark size={40} /><View style={styles.greeting}><Text style={styles.eyebrow}>LEARN WITH KINDLING</Text><Text style={styles.hello}>What shall we learn?</Text></View></View>
          <BodyText>Choose a subject and Kindling will teach a focused lesson, practise with you, and adapt as you go.</BodyText>
          <SectionTitle action={<Pressable accessibilityRole="button" onPress={() => { setError(''); setShowCreate(true); }} hitSlop={8}><Text style={styles.add}>＋ Add</Text></Pressable>}>Your subjects</SectionTitle>
          {loading ? <View style={styles.loading}><ActivityIndicator color={Brand.teal} /><Text style={styles.loadingText}>Loading your subjects…</Text></View> : null}
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Button variant="plain" onPress={load}>Try again</Button></View> : null}
          {!loading && !error && subjects.length === 0 ? <View style={[ui.card, styles.empty]}><Text style={styles.emptyGlyph}>✦</Text><Text style={styles.emptyTitle}>Start with a subject</Text><BodyText style={styles.emptyBody}>Create a subject, then add topics and lesson subtopics to build your path.</BodyText><Button onPress={() => setShowCreate(true)}>Add your first subject</Button></View> : null}
          {subjects.map((subject) => <Pressable key={subject.id} accessibilityRole="button" accessibilityLabel={`Open ${subject.name}`} onPress={() => setSelectedId(subject.id)} style={({ pressed }) => [styles.subjectCard, pressed && styles.pressed]}><View style={styles.subjectTop}><View style={styles.subjectIcon}><Text style={styles.subjectIconText}>{subject.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.subjectCopy}><Text style={styles.subjectName}>{subject.name}</Text><Text style={styles.subjectMeta}>{subject.topics.length} {subject.topics.length === 1 ? 'topic' : 'topics'} · {subject.topics.reduce((n, topic) => n + topic.subtopics.length, 0)} lessons</Text></View><Text style={styles.arrow}>›</Text></View><Text style={styles.openSubject}>Open learning path  ›</Text></Pressable>)}
        </>}
      </AppScreen>
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalShade}><View style={styles.modal}>
          <Text style={styles.modalTitle}>Add a subject</Text><BodyText>Start a subject now. You can add topics and subtopic lessons any time.</BodyText>
          <View style={styles.modalField}><Text style={styles.fieldLabel}>Subject name</Text><TextInput style={styles.input} value={subjectName} onChangeText={setSubjectName} placeholder="Biology, algebra…" placeholderTextColor="#87918B" returnKeyType="next" /></View>
          <View style={styles.modalField}><Text style={styles.fieldLabel}>First topic <Text style={styles.optional}>(optional)</Text></Text><TextInput style={styles.input} value={firstTopic} onChangeText={setFirstTopic} placeholder="Cell structure, fractions…" placeholderTextColor="#87918B" returnKeyType="done" onSubmitEditing={addSubject} /></View>
          {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
          <Button busy={saving} disabled={!subjectName.trim()} onPress={addSubject}>Create subject</Button><Button variant="plain" onPress={() => setShowCreate(false)}>Cancel</Button>
        </View></View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 18, paddingBottom: 32, gap: 16 }, flex: { flex: 1 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 12 }, greeting: { flex: 1, gap: 2 }, eyebrow: { color: Brand.teal, fontSize: 11, letterSpacing: 1.4, fontWeight: '800' }, hello: { fontSize: 25, fontWeight: '700', color: Brand.pine }, add: { color: Brand.teal, fontSize: 15, fontWeight: '700' },
  loading: { padding: 34, alignItems: 'center', gap: 12 }, loadingText: { color: Brand.muted, fontSize: 14 }, empty: { alignItems: 'center', padding: 24, gap: 12 }, emptyGlyph: { color: Brand.gold, fontSize: 30 }, emptyTitle: { color: Brand.pine, fontSize: 18, fontWeight: '700' }, emptyBody: { textAlign: 'center' },
  subjectCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: Brand.line, padding: 16, gap: 12 }, subjectTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, subjectIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: Brand.tealPale, alignItems: 'center', justifyContent: 'center' }, subjectIconText: { color: Brand.pine, fontSize: 19, fontWeight: '800' }, subjectCopy: { flex: 1, gap: 3 }, subjectName: { color: Brand.pine, fontSize: 18, fontWeight: '700' }, subjectMeta: { color: Brand.muted, fontSize: 13 }, openSubject: { color: Brand.teal, fontSize: 14, fontWeight: '700' },
  back: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' }, backText: { color: Brand.teal, fontWeight: '700', fontSize: 15 }, detailHero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 5 }, topicCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: Brand.line, padding: 15, gap: 8 }, topicHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 5 }, topicNumber: { color: Brand.teal, fontSize: 13, fontWeight: '800', backgroundColor: Brand.tealPale, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }, topicTitle: { color: Brand.pine, fontSize: 17, fontWeight: '700' }, lessonRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1, borderTopColor: '#EEF0EC' }, lessonDot: { height: 28, width: 28, borderRadius: 14, backgroundColor: '#F7F1E4', alignItems: 'center', justifyContent: 'center' }, lessonNumber: { color: Brand.pine, fontSize: 12, fontWeight: '700' }, lessonText: { flex: 1, color: Brand.ink, fontSize: 14, fontWeight: '600' }, arrow: { color: Brand.muted, fontSize: 25 }, emptyHint: { color: Brand.muted, fontSize: 13, lineHeight: 19, paddingVertical: 6 }, addSubtopic: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#EEF0EC', paddingTop: 10 }, inlineInput: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: Brand.line, paddingHorizontal: 11, backgroundColor: Brand.parchment, color: Brand.ink, fontSize: 14 }, addInline: { justifyContent: 'center', paddingHorizontal: 8 }, addInlineText: { color: Brand.teal, fontWeight: '700' }, topicForm: { gap: 10, backgroundColor: Brand.tealPale, borderRadius: 18, padding: 15 }, fieldLabel: { color: Brand.ink, fontSize: 14, fontWeight: '700' }, input: { minHeight: 50, borderWidth: 1, borderColor: Brand.line, borderRadius: 13, backgroundColor: '#fff', paddingHorizontal: 13, color: Brand.ink, fontSize: 16 },
  pressed: { opacity: 0.65 }, errorBox: { backgroundColor: '#FCECE9', padding: 14, borderRadius: 14, gap: 6 }, errorText: { color: Brand.error, fontSize: 14, lineHeight: 20 }, modalShade: { flex: 1, backgroundColor: 'rgba(17,31,27,0.45)', justifyContent: 'center', padding: 20 }, modal: { backgroundColor: Brand.parchment, borderRadius: 22, padding: 20, gap: 14 }, modalTitle: { color: Brand.pine, fontSize: 22, fontWeight: '700' }, modalField: { gap: 6 }, optional: { color: Brand.muted, fontWeight: '400' },
});
