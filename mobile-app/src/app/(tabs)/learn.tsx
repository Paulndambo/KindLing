import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AppScreen,
  BodyText,
  BrandMark,
  Button,
  SectionTitle,
  ui,
} from '@/components/mobile-ui';
import { Brand } from '@/constants/brand';
import { FormScrollView } from '@/components/form-scroll-view';
import { useSession } from '@/context/session';
import {
  createSubject,
  createSubtopic,
  createTopic,
  listContinuableConversations,
  listSubjects,
  type ContinuableConversation,
  type LessonItem,
  type Subject,
} from '@/services/api';

type SubjectPalette = {
  accent: string;
  softBg: string;
  softBorder: string;
  badgeBg: string;
  badgeText: string;
};

const SUBJECT_PALETTES: SubjectPalette[] = [
  {
    accent: Brand.teal,
    softBg: Brand.card,
    softBorder: Brand.line,
    badgeBg: Brand.tealPale,
    badgeText: Brand.pine,
  },
  {
    accent: Brand.pine,
    softBg: Brand.card,
    softBorder: Brand.line,
    badgeBg: Brand.subtle,
    badgeText: Brand.pine,
  },
  {
    accent: Brand.teal,
    softBg: Brand.card,
    softBorder: Brand.line,
    badgeBg: Brand.subtle,
    badgeText: Brand.teal,
  },
  {
    accent: Brand.teal,
    softBg: Brand.card,
    softBorder: Brand.line,
    badgeBg: Brand.subtle,
    badgeText: Brand.teal,
  },
];

const SUBJECT_PRESETS = [
  'Mathematics',
  'Biology',
  'Chemistry',
  'Physics',
  'English Literature',
  'World History',
  'Computer Science',
  'Geography',
];

function getSubjectPalette(index: number): SubjectPalette {
  return SUBJECT_PALETTES[index % SUBJECT_PALETTES.length];
}

function getTopicLessons(topic: Subject['topics'][number]): LessonItem[] {
  const leaves = topic.subtopics.filter(
    (leaf) => leaf.id !== topic.id || leaf.name !== topic.name,
  );
  if (leaves.length > 0) return leaves;
  return [
    {
      id: topic.id,
      name: topic.name,
      learningGoal: '',
      unitName: topic.name,
    },
  ];
}

function formatRelativeDate(iso?: string | null): string {
  if (!iso) return 'Recently';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 2) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function LearnScreen() {
  const { profile } = useSession();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [continuable, setContinuable] = useState<ContinuableConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Navigation & filter state
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<'all' | 'active'>('all');
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});

  // Create Subject modal state
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectGoal, setSubjectGoal] = useState('');
  const [firstTopic, setFirstTopic] = useState('');

  // Create Topic modal state (inside Subject Workspace)
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState('');
  const [topicGoalDraft, setTopicGoalDraft] = useState('');
  const [topicFirstSubtopic, setTopicFirstSubtopic] = useState('');

  // Inline Subtopic composer state (per topic ID)
  const [activeSubtopicTopicId, setActiveSubtopicTopicId] = useState<number | null>(null);
  const [subtopicDrafts, setSubtopicDrafts] = useState<Record<number, string>>({});
  const [subtopicGoalDrafts, setSubtopicGoalDrafts] = useState<Record<number, string>>({});

  // Quick Custom Lesson modal state
  const [showQuickLesson, setShowQuickLesson] = useState(false);
  const [quickSubject, setQuickSubject] = useState('');
  const [quickTopic, setQuickTopic] = useState('');
  const [quickGoal, setQuickGoal] = useState('');

  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [loadedSubjects, loadedContinuable] = await Promise.all([
        listSubjects(),
        listContinuableConversations(15),
      ]);
      setSubjects(loadedSubjects);
      setContinuable(loadedContinuable);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not load your learning subjects.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  const selected = useMemo(
    () => subjects.find((subject) => subject.id === selectedId) || null,
    [subjects, selectedId],
  );

  // Map active conversations by normalized "subject::topic"
  const activeMap = useMemo(() => {
    const map = new Map<string, ContinuableConversation>();
    for (const item of continuable) {
      const key = `${(item.subject || '').trim().toLowerCase()}::${(item.topic || '').trim().toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
    return map;
  }, [continuable]);

  const getConversationForLesson = useCallback(
    (subjectNameValue: string, lessonNameValue: string): ContinuableConversation | undefined => {
      const key = `${subjectNameValue.trim().toLowerCase()}::${lessonNameValue.trim().toLowerCase()}`;
      return activeMap.get(key);
    },
    [activeMap],
  );

  // Aggregate curriculum KPIs
  const curriculumStats = useMemo(() => {
    let totalTopics = 0;
    let totalLessons = 0;
    for (const subject of subjects) {
      totalTopics += subject.topics.length;
      for (const topic of subject.topics) {
        totalLessons += getTopicLessons(topic).length;
      }
    }
    return {
      subjectCount: subjects.length,
      totalTopics,
      totalLessons,
      activeCount: continuable.length,
    };
  }, [subjects, continuable]);

  // Search filtering for the All-Subjects Hub
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredSubjects = useMemo(() => {
    if (!normalizedSearch) return subjects;
    return subjects.filter((subject) => {
      if (subject.name.toLowerCase().includes(normalizedSearch)) return true;
      if ((subject.learningGoal || '').toLowerCase().includes(normalizedSearch)) return true;
      return subject.topics.some(
        (topic) =>
          topic.name.toLowerCase().includes(normalizedSearch) ||
          topic.subtopics.some((sub) => sub.name.toLowerCase().includes(normalizedSearch)),
      );
    });
  }, [subjects, normalizedSearch]);

  const matchingLessons = useMemo(() => {
    if (!normalizedSearch) return [];
    const matches: {
      subject: Subject;
      unitName: string;
      lesson: LessonItem;
      activeConv?: ContinuableConversation;
    }[] = [];
    for (const subject of subjects) {
      for (const topic of subject.topics) {
        const lessons = getTopicLessons(topic);
        for (const lesson of lessons) {
          if (
            lesson.name.toLowerCase().includes(normalizedSearch) ||
            topic.name.toLowerCase().includes(normalizedSearch) ||
            (lesson.learningGoal || '').toLowerCase().includes(normalizedSearch)
          ) {
            matches.push({
              subject,
              unitName: topic.name,
              lesson,
              activeConv: getConversationForLesson(subject.name, lesson.name),
            });
          }
        }
      }
    }
    return matches.slice(0, 8);
  }, [subjects, normalizedSearch, getConversationForLesson]);

  const startLesson = (subjectTitle: string, unit: string, lesson: string, goal = '') => {
    router.push({
      pathname: '/lesson',
      params: {
        subject: subjectTitle,
        unit: unit || lesson,
        topic: lesson,
        goal,
        grade: profile?.grade || '',
      },
    });
  };

  const launchQuickLesson = () => {
    const subj = quickSubject.trim() || 'General Learning';
    const top = quickTopic.trim();
    if (!top) return;
    setShowQuickLesson(false);
    setQuickTopic('');
    setQuickGoal('');
    startLesson(subj, top, top, quickGoal.trim());
  };

  const addSubject = async () => {
    if (!subjectName.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await createSubject(subjectName.trim(), firstTopic.trim(), subjectGoal.trim());
      setSubjectName('');
      setSubjectGoal('');
      setFirstTopic('');
      setShowCreateSubject(false);
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create this subject.');
    } finally {
      setSaving(false);
    }
  };

  const addTopic = async () => {
    const name = topicDraft.trim();
    if (!selected || !name || saving) return;
    setSaving(true);
    setError('');
    try {
      const created = (await createTopic(
        selected.id,
        name,
        topicGoalDraft.trim(),
      )) as { id?: number } | null;
      const firstSub = topicFirstSubtopic.trim();
      if (firstSub && created?.id != null) {
        await createSubtopic(Number(created.id), firstSub, topicGoalDraft.trim());
      }
      setTopicDraft('');
      setTopicGoalDraft('');
      setTopicFirstSubtopic('');
      setShowCreateTopic(false);
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add this topic unit.');
    } finally {
      setSaving(false);
    }
  };

  const addSubtopic = async (topic: Subject['topics'][number]) => {
    const topicId = topic.id;
    const name = (subtopicDrafts[topicId ?? -1] || '').trim();
    const goal = (subtopicGoalDrafts[topicId ?? -1] || '').trim();
    if (topicId == null || !name || saving) return;
    setSaving(true);
    setError('');
    try {
      await createSubtopic(topicId, name, goal);
      setSubtopicDrafts((drafts) => ({ ...drafts, [topicId]: '' }));
      setSubtopicGoalDrafts((drafts) => ({ ...drafts, [topicId]: '' }));
      setActiveSubtopicTopicId(null);
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add this lesson subtopic.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTopicCollapse = (key: string) => {
    setCollapsedTopics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to find best next/active lesson in a subject
  const getNextLessonForSubject = useCallback(
    (subject: Subject): { unit: string; lesson: LessonItem; isResume: boolean } | null => {
      for (const topic of subject.topics) {
        const lessons = getTopicLessons(topic);
        for (const lesson of lessons) {
          if (getConversationForLesson(subject.name, lesson.name)) {
            return { unit: topic.name, lesson, isResume: true };
          }
        }
      }
      for (const topic of subject.topics) {
        const lessons = getTopicLessons(topic);
        if (lessons.length > 0) {
          return { unit: topic.name, lesson: lessons[0], isResume: false };
        }
      }
      return null;
    },
    [getConversationForLesson],
  );

  const latestContinuable = continuable[0] || null;

  return (
    <>
      <AppScreen
        scroll
        contentStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={Brand.teal}
            colors={[Brand.teal]}
          />
        }
      >
        {selected ? (
          /* ================================================================
           * SUBJECT WORKSPACE VIEW (DETAILED CURRICULUM & UNITS)
           * ================================================================ */
          <>
            {/* Top Navigation Row + Subject Switcher */}
            <View style={styles.workspaceTopBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to all subjects"
                onPress={() => {
                  setSelectedId(null);
                  setUnitFilter('all');
                  setError('');
                }}
                style={({ pressed }) => [styles.backPill, pressed && styles.pressed]}
              >
                <Text style={styles.backPillGlyph}>‹</Text>
                <Text style={styles.backPillText}>All subjects</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setQuickSubject(selected.name);
                  setShowQuickLesson(true);
                }}
                style={({ pressed }) => [styles.topGhostPill, pressed && styles.pressed]}
              >
                <Text style={styles.topGhostPillText}>✦ Custom topic</Text>
              </Pressable>
            </View>

            {subjects.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subjectSwitcherRow}
              >
                {subjects.map((subj) => {
                  const isCurrent = subj.id === selected.id;
                  return (
                    <Pressable
                      key={subj.id}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isCurrent }}
                      onPress={() => {
                        setSelectedId(subj.id);
                        setUnitFilter('all');
                        setError('');
                      }}
                      style={[
                        styles.subjectSwitchChip,
                        isCurrent && styles.subjectSwitchChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.subjectSwitchChipText,
                          isCurrent && styles.subjectSwitchChipTextActive,
                        ]}
                      >
                        {subj.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* Subject Hero Banner */}
            {(() => {
              const subjectIndex = Math.max(
                0,
                subjects.findIndex((s) => s.id === selected.id),
              );
              const totalSubjLessons = selected.topics.reduce(
                (sum, t) => sum + getTopicLessons(t).length,
                0,
              );
              const activeInSubject = continuable.filter(
                (c) => c.subject.trim().toLowerCase() === selected.name.trim().toLowerCase(),
              ).length;
              const nextTarget = getNextLessonForSubject(selected);

              return (
                <View style={styles.subjectHeroCard}>
                  <View style={styles.subjectHeroHeader}>
                    <View
                      style={[
                        styles.subjectHeroMonogram,
                        { backgroundColor: getSubjectPalette(subjectIndex).badgeBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subjectHeroMonogramText,
                          { color: getSubjectPalette(subjectIndex).badgeText },
                        ]}
                      >
                        {selected.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.subjectHeroEyebrow}>SUBJECT WORKSPACE</Text>
                      <Text style={styles.subjectHeroTitle}>{selected.name}</Text>
                      <Text style={styles.subjectHeroSubtitle}>
                        {selected.learningGoal
                          ? selected.learningGoal
                          : 'Structured units, guided examples, and adaptive 1-on-1 tutoring'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.subjectHeroStatsRow}>
                    <View style={styles.subjectHeroStatPill}>
                      <Text style={styles.subjectHeroStatValue}>{selected.topics.length}</Text>
                      <Text style={styles.subjectHeroStatLabel}>
                        {selected.topics.length === 1 ? 'Topic unit' : 'Topic units'}
                      </Text>
                    </View>
                    <View style={styles.subjectHeroStatPill}>
                      <Text style={styles.subjectHeroStatValue}>{totalSubjLessons}</Text>
                      <Text style={styles.subjectHeroStatLabel}>
                        {totalSubjLessons === 1 ? 'Lesson' : 'Lessons'}
                      </Text>
                    </View>
                    <View style={styles.subjectHeroStatPill}>
                      <Text style={styles.subjectHeroStatValue}>{activeInSubject}</Text>
                      <Text style={styles.subjectHeroStatLabel}>In progress</Text>
                    </View>
                  </View>

                  <View style={styles.subjectHeroActions}>
                    {nextTarget ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          startLesson(
                            selected.name,
                            nextTarget.unit,
                            nextTarget.lesson.name,
                            nextTarget.lesson.learningGoal,
                          )
                        }
                        style={({ pressed }) => [
                          styles.heroPrimaryBtn,
                          styles.flex,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.heroPrimaryBtnText} numberOfLines={1}>
                          {nextTarget.isResume
                            ? `Resume: ${nextTarget.lesson.name} →`
                            : `Start: ${nextTarget.lesson.name} →`}
                        </Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setError('');
                        setShowCreateTopic(true);
                      }}
                      style={({ pressed }) => [
                         nextTarget ? styles.heroSecondaryBtn : [styles.heroPrimaryBtn, styles.flex],
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={
                          nextTarget ? styles.heroSecondaryBtnText : styles.heroPrimaryBtnText
                        }
                      >
                        ＋ Add topic
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })()}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Button variant="plain" onPress={() => void load(true)}>
                  Try again
                </Button>
              </View>
            ) : null}

            {/* Filter & Collapse Toolbar */}
            {selected.topics.length > 0 ? (
              <View style={styles.unitToolbar}>
                <View style={styles.filterPillsRow}>
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: unitFilter === 'all' }}
                    onPress={() => setUnitFilter('all')}
                    style={[
                      styles.filterPill,
                      unitFilter === 'all' && styles.filterPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        unitFilter === 'all' && styles.filterPillTextActive,
                      ]}
                    >
                      All units ({selected.topics.length})
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: unitFilter === 'active' }}
                    onPress={() => setUnitFilter('active')}
                    style={[
                      styles.filterPill,
                      unitFilter === 'active' && styles.filterPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        unitFilter === 'active' && styles.filterPillTextActive,
                      ]}
                    >
                      In progress
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const allCollapsed = selected.topics.every(
                      (t, idx) => collapsedTopics[`${t.id}-${idx}`],
                    );
                    if (allCollapsed) {
                      setCollapsedTopics({});
                    } else {
                      const next: Record<string, boolean> = {};
                      selected.topics.forEach((t, idx) => {
                        next[`${t.id}-${idx}`] = true;
                      });
                      setCollapsedTopics(next);
                    }
                  }}
                >
                  <Text style={styles.collapseToggleText}>
                    {selected.topics.every((t, idx) => collapsedTopics[`${t.id}-${idx}`])
                      ? 'Expand all'
                      : 'Collapse all'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* Topic Unit Cards */}
            {selected.topics.length > 0 ? (
              (() => {
                const visibleTopics = selected.topics.filter((topic) => {
                  if (unitFilter !== 'active') return true;
                  const lessons = getTopicLessons(topic);
                  return lessons.some((lesson) =>
                    Boolean(getConversationForLesson(selected.name, lesson.name)),
                  );
                });

                if (visibleTopics.length === 0) {
                  return (
                    <View style={[ui.card, styles.emptyCard]}>
                      <View style={styles.emptyIconCircle}>
                        <Text style={styles.emptyGlyph}>◷</Text>
                      </View>
                      <Text style={styles.emptyTitle}>No units in progress yet</Text>
                      <BodyText style={styles.emptyBody}>
                        Tap any lesson in your units to begin a guided 1-on-1 session with Kindling.
                      </BodyText>
                      <Button variant="secondary" onPress={() => setUnitFilter('all')}>
                        Show all units
                      </Button>
                    </View>
                  );
                }

                return visibleTopics.map((topic, index) => {
                  const lessons = getTopicLessons(topic);
                  const collapseKey = `${topic.id}-${index}`;
                  const isCollapsed = Boolean(collapsedTopics[collapseKey]);
                  const activeLessonsCount = lessons.filter((l) =>
                    Boolean(getConversationForLesson(selected.name, l.name)),
                  ).length;
                  const isComposerOpen =
                    topic.id != null && activeSubtopicTopicId === topic.id;

                  return (
                    <View key={`${topic.id}-${topic.name}-${index}`} style={styles.topicCard}>
                      {/* Topic Unit Header */}
                      <View style={styles.topicCardHeader}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Toggle ${topic.name}`}
                          onPress={() => toggleTopicCollapse(collapseKey)}
                          style={styles.topicHeaderMain}
                        >
                          <View style={styles.topicBadgeBox}>
                            <Text style={styles.topicBadgeNumber}>
                              {String(index + 1).padStart(2, '0')}
                            </Text>
                          </View>
                          <View style={styles.flex}>
                            <Text style={styles.topicEyebrow}>UNIT {index + 1}</Text>
                            <Text style={styles.topicTitle}>{topic.name}</Text>
                            <View style={styles.topicMetaRow}>
                              <Text style={styles.topicMetaText}>
                                {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
                              </Text>
                              {activeLessonsCount > 0 ? (
                                <View style={styles.topicActiveBadge}>
                                  <View style={styles.topicActiveDot} />
                                  <Text style={styles.topicActiveBadgeText}>
                                    {activeLessonsCount} active
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                          <Text style={styles.collapseChevron}>
                            {isCollapsed ? '▾' : '▴'}
                          </Text>
                        </Pressable>

                        {topic.id != null ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Add lesson to ${topic.name}`}
                            onPress={() => {
                              setCollapsedTopics((prev) => ({
                                ...prev,
                                [collapseKey]: false,
                              }));
                              setActiveSubtopicTopicId(
                                isComposerOpen ? null : topic.id,
                              );
                            }}
                            style={[
                              styles.addLessonChip,
                              isComposerOpen && styles.addLessonChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.addLessonChipText,
                                isComposerOpen && styles.addLessonChipTextActive,
                              ]}
                            >
                              {isComposerOpen ? 'Close' : '＋ Lesson'}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>

                      {/* Expandable Lesson List */}
                      {!isCollapsed ? (
                        <View style={styles.lessonListContainer}>
                          {lessons.map((leaf, lessonIndex) => {
                            const activeConv = getConversationForLesson(
                              selected.name,
                              leaf.name,
                            );
                            const turnCount = activeConv?.messageCount || 0;

                            return (
                              <Pressable
                                key={`${leaf.id}-${leaf.name}-${lessonIndex}`}
                                accessibilityRole="button"
                                accessibilityLabel={`${
                                  activeConv ? 'Resume' : 'Start'
                                } lesson ${leaf.name}`}
                                onPress={() =>
                                  startLesson(
                                    selected.name,
                                    topic.name,
                                    leaf.name,
                                    leaf.learningGoal,
                                  )
                                }
                                style={({ pressed }) => [
                                  styles.lessonCard,
                                  activeConv && styles.lessonCardActive,
                                  pressed && styles.pressed,
                                ]}
                              >
                                <View style={styles.lessonCardTop}>
                                  <View
                                    style={[
                                      styles.lessonIndexBadge,
                                      activeConv && styles.lessonIndexBadgeActive,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.lessonIndexText,
                                        activeConv && styles.lessonIndexTextActive,
                                      ]}
                                    >
                                      { lessonIndex + 1 }
                                    </Text>
                                  </View>

                                  <View style={styles.lessonCopy}>
                                    <View style={styles.lessonPillRow}>
                                      {activeConv ? (
                                        <View style={styles.lessonStatusActivePill}>
                                          <Text style={styles.lessonStatusActiveText}>
                                            IN PROGRESS
                                            {turnCount > 0 ? ` · ${turnCount} turns` : ''}
                                          </Text>
                                        </View>
                                      ) : (
                                        <Text style={styles.lessonStepLabel}>
                                          LESSON {index + 1}.{lessonIndex + 1}
                                        </Text>
                                      )}
                                      {activeConv?.updatedAt ? (
                                        <Text style={styles.lessonTimeText}>
                                          {formatRelativeDate(activeConv.updatedAt)}
                                        </Text>
                                      ) : null}
                                    </View>

                                    <Text style={styles.lessonTitle}>{leaf.name}</Text>

                                    {activeConv?.previewText ? (
                                      <Text numberOfLines={2} style={styles.lessonPreviewText}>
                                        {activeConv.previewText}
                                      </Text>
                                    ) : leaf.learningGoal ? (
                                      <Text numberOfLines={2} style={styles.lessonGoalText}>
                                        Goal: {leaf.learningGoal}
                                      </Text>
                                    ) : (
                                      <Text style={styles.lessonHintText}>
                                        Guided explanation, worked examples & check-ins
                                      </Text>
                                    )}
                                  </View>

                                  <View
                                    style={[
                                      styles.lessonLaunchBtn,
                                      activeConv && styles.lessonLaunchBtnActive,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.lessonLaunchBtnText,
                                        activeConv && styles.lessonLaunchBtnTextActive,
                                      ]}
                                    >
                                      {activeConv ? 'Resume →' : 'Start →'}
                                    </Text>
                                  </View>
                                </View>
                              </Pressable>
                            );
                          })}

                          {/* On-demand Inline Subtopic Composer */}
                          {isComposerOpen && topic.id != null ? (
                            <View style={styles.inlineComposerCard}>
                              <Text style={styles.inlineComposerTitle}>
                                Add a lesson to {topic.name}
                              </Text>
                              <TextInput
                                value={subtopicDrafts[topic.id] || ''}
                                onChangeText={(value) =>
                                  setSubtopicDrafts((drafts) => ({
                                    ...drafts,
                                    [topic.id!]: value,
                                  }))
                                }
                                placeholder="Lesson title (e.g. Solving two-step equations)"
                                placeholderTextColor="#87918B"
                                style={styles.composerInput}
                                returnKeyType="next"
                                accessibilityLabel={`New lesson in ${topic.name}`}
                              />
                              <TextInput
                                value={subtopicGoalDrafts[topic.id] || ''}
                                onChangeText={(value) =>
                                  setSubtopicGoalDrafts((drafts) => ({
                                    ...drafts,
                                    [topic.id!]: value,
                                  }))
                                }
                                placeholder="Learning goal (optional)"
                                placeholderTextColor="#87918B"
                                style={styles.composerInput}
                                returnKeyType="done"
                                onSubmitEditing={() => void addSubtopic(topic)}
                                accessibilityLabel={`Learning goal for new lesson in ${topic.name}`}
                              />
                              <View style={styles.inlineComposerActions}>
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => setActiveSubtopicTopicId(null)}
                                  style={styles.composerCancelBtn}
                                >
                                  <Text style={styles.composerCancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                  accessibilityRole="button"
                                  disabled={
                                    saving || !(subtopicDrafts[topic.id] || '').trim()
                                  }
                                  onPress={() => void addSubtopic(topic)}
                                  style={[
                                    styles.composerSaveBtn,
                                    (saving ||
                                      !(subtopicDrafts[topic.id] || '').trim()) &&
                                      styles.btnDisabled,
                                  ]}
                                >
                                  <Text style={styles.composerSaveText}>
                                    {saving ? 'Adding…' : '＋ Save lesson'}
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                });
              })()
            ) : (
              <View style={[ui.card, styles.emptyCard]}>
                <View style={styles.emptyIconCircle}>
                  <Text style={styles.emptyGlyph}>✦</Text>
                </View>
                <Text style={styles.emptyTitle}>Your learning path starts here</Text>
                <BodyText style={styles.emptyBody}>
                  Organize {selected.name} into topic units and lesson subtopics so Kindling can guide you step by step.
                </BodyText>
                <Button onPress={() => setShowCreateTopic(true)}>
                  ＋ Add your first topic unit
                </Button>
              </View>
            )}

            {/* Dashed Add Topic Unit Card */}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError('');
                setShowCreateTopic(true);
              }}
              style={({ pressed }) => [styles.dashedAddCard, pressed && styles.pressed]}
            >
              <View style={styles.dashedAddIconBox}>
                <Text style={styles.dashedAddIconText}>＋</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.dashedAddTitle}>
                  Add a new topic unit to {selected.name}
                </Text>
                <Text style={styles.dashedAddSubtitle}>
                  Create a unit and add focused subtopic lessons
                </Text>
              </View>
            </Pressable>
          </>
        ) : (
          /* ================================================================
           * ALL-SUBJECTS CURRICULUM HUB VIEW
           * ================================================================ */
          <>
            {/* Top Header Row */}
            <View style={styles.topline}>
              <BrandMark size={42} />
              <View style={styles.greeting}>
                <Text style={styles.eyebrow}>KINDLING CURRICULUM</Text>
                <Text style={styles.hello}>Learn & Explore</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add new subject"
                onPress={() => {
                  setError('');
                  setShowCreateSubject(true);
                }}
                style={({ pressed }) => [styles.topCtaButton, pressed && styles.pressed]}
              >
                <Text style={styles.topCtaButtonText}>＋ Subject</Text>
              </Pressable>
            </View>

            {/* Dark Pine Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroBadgePill}>
                  <View style={styles.heroLiveDot} />
                  <Text style={styles.heroBadgeText}>1-ON-1 ADAPTIVE TUTOR</Text>
                </View>
                {profile?.grade ? (
                  <Text style={styles.heroGradeLabel}>{profile.grade}</Text>
                ) : null}
              </View>

              <Text style={styles.heroTitle}>
                {latestContinuable
                  ? `Ready to continue ${latestContinuable.topic}?`
                  : 'What shall we learn today?'}
              </Text>
              <Text style={styles.heroBody}>
                {latestContinuable
                  ? `You have an active lesson in ${latestContinuable.subject}. Pick up right where you left off or explore any topic below.`
                  : 'Choose a subject from your learning path or launch a custom lesson on any topic you are curious about.'}
              </Text>

              <View style={styles.heroActionsRow}>
                {latestContinuable ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      startLesson(
                        latestContinuable.subject || 'Learning',
                        latestContinuable.topic || 'Lesson',
                        latestContinuable.topic || 'Lesson',
                      )
                    }
                    style={({ pressed }) => [
                      styles.heroPrimaryBtn,
                      styles.flex,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.heroPrimaryBtnText} numberOfLines={1}>
                      Resume: {latestContinuable.topic} →
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowQuickLesson(true)}
                    style={({ pressed }) => [
                      styles.heroPrimaryBtn,
                      styles.flex,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.heroPrimaryBtnText}>
                      ✦ Start a custom lesson
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (latestContinuable) {
                      setShowQuickLesson(true);
                    } else {
                      setError('');
                      setShowCreateSubject(true);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.heroSecondaryBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.heroSecondaryBtnText}>
                    {latestContinuable ? '✦ Custom topic' : '＋ New subject'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 3-Card Curriculum KPI Strip */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, styles.kpiCardTeal]}>
                <Text style={styles.kpiLabel}>SUBJECTS</Text>
                <Text style={styles.kpiValue}>{curriculumStats.subjectCount}</Text>
                <Text style={styles.kpiSub}>active paths</Text>
              </View>
              <View style={[styles.kpiCard, styles.kpiCardPine]}>
                <Text style={styles.kpiLabel}>UNITS</Text>
                <Text style={styles.kpiValue}>{curriculumStats.totalTopics}</Text>
                <Text style={styles.kpiSub}>structured topics</Text>
              </View>
              <View style={[styles.kpiCard, styles.kpiCardGold]}>
                <Text style={styles.kpiLabel}>LESSONS</Text>
                <Text style={styles.kpiValue}>{curriculumStats.totalLessons}</Text>
                <Text style={styles.kpiSub}>
                  {curriculumStats.activeCount > 0
                    ? `${curriculumStats.activeCount} in progress`
                    : 'ready to start'}
                </Text>
              </View>
            </View>

            {/* Search Input Bar */}
            {(subjects.length > 0 || searchQuery.length > 0) ? (
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search subjects, units, or lessons…"
                  placeholderTextColor="#7A8680"
                  style={styles.searchInput}
                  returnKeyType="search"
                  accessibilityLabel="Search subjects, units, or lessons"
                />
                {searchQuery.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    onPress={() => setSearchQuery('')}
                    hitSlop={8}
                    style={styles.searchClearBtn}
                  >
                    <Text style={styles.searchClearText}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Continue Where You Left Off Shelf */}
            {!normalizedSearch && continuable.length > 0 ? (
              <View style={styles.sectionBlock}>
                <SectionTitle
                  action={
                    <Text style={styles.sectionCounterText}>
                      {continuable.length} active
                    </Text>
                  }
                >
                  Continue learning
                </SectionTitle>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.continueScrollRow}
                >
                  {continuable.slice(0, 6).map((conv) => (
                    <Pressable
                      key={conv.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Continue ${conv.topic} in ${conv.subject}`}
                      onPress={() =>
                        startLesson(
                          conv.subject || 'Learning',
                          conv.topic || 'Lesson',
                          conv.topic || 'Lesson',
                        )
                      }
                      style={({ pressed }) => [
                        styles.continueCard,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.continueCardTop}>
                        <View style={styles.continueSubjectBadge}>
                          <Text numberOfLines={1} style={styles.continueSubjectText}>
                            {conv.subject || 'Subject'}
                          </Text>
                        </View>
                        <Text style={styles.continueDateText}>
                          {formatRelativeDate(conv.updatedAt)}
                        </Text>
                      </View>

                      <Text numberOfLines={2} style={styles.continueTopicTitle}>
                        {conv.topic || conv.title || 'Active lesson'}
                      </Text>

                      <Text numberOfLines={2} style={styles.continuePreviewText}>
                        {conv.previewText ||
                          conv.summary ||
                          'Pick up your conversation with Kindling.'}
                      </Text>

                      <View style={styles.continueCardFooter}>
                        <Text style={styles.continueTurnsText}>
                          {conv.messageCount || 1}{' '}
                          {(conv.messageCount || 1) === 1 ? 'message' : 'messages'}
                        </Text>
                        <View style={styles.continueResumePill}>
                          <Text style={styles.continueResumePillText}>Resume →</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Direct Lesson Matches When Searching */}
            {normalizedSearch && matchingLessons.length > 0 ? (
              <View style={styles.sectionBlock}>
                <SectionTitle
                  action={
                    <Text style={styles.sectionCounterText}>
                      {matchingLessons.length}{' '}
                      {matchingLessons.length === 1 ? 'match' : 'matches'}
                    </Text>
                  }
                >
                  Matching lessons
                </SectionTitle>
                <View style={styles.searchLessonsList}>
                  {matchingLessons.map(({ subject, unitName, lesson, activeConv }, idx) => (
                    <Pressable
                      key={`${subject.id}-${unitName}-${lesson.name}-${idx}`}
                      accessibilityRole="button"
                      onPress={() =>
                        startLesson(
                          subject.name,
                          unitName,
                          lesson.name,
                          lesson.learningGoal,
                        )
                      }
                      style={({ pressed }) => [
                        styles.searchLessonRow,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.searchLessonDot}>
                        <Text style={styles.searchLessonDotText}>▶</Text>
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.searchLessonBreadcrumb}>
                          {subject.name.toUpperCase()}  ·  {unitName}
                        </Text>
                        <Text style={styles.searchLessonTitle}>{lesson.name}</Text>
                      </View>
                      <View
                        style={[
                          styles.lessonLaunchBtn,
                          activeConv && styles.lessonLaunchBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.lessonLaunchBtnText,
                            activeConv && styles.lessonLaunchBtnTextActive,
                          ]}
                        >
                          {activeConv ? 'Resume →' : 'Start →'}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Subjects Section */}
            <SectionTitle
              action={
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setError('');
                    setShowCreateSubject(true);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.addLinkText}>＋ Add subject</Text>
                </Pressable>
              }
            >
              Your subjects
            </SectionTitle>

            {loading && subjects.length === 0 ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={Brand.teal} size="large" />
                <Text style={styles.loadingTitle}>Loading your curriculum…</Text>
                <Text style={styles.loadingSubtitle}>
                  Syncing subjects, units, and active lessons
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Button variant="plain" onPress={() => void load(true)}>
                  Try again
                </Button>
              </View>
            ) : null}

            {!loading && !error && subjects.length === 0 ? (
              <View style={[ui.card, styles.emptyCard]}>
                <View style={styles.emptyIconCircle}>
                  <Text style={styles.emptyGlyph}>✦</Text>
                </View>
                <Text style={styles.emptyTitle}>Build your first subject path</Text>
                <BodyText style={styles.emptyBody}>
                  Create a subject like Mathematics, Biology, or History, then add topic units and lesson subtopics to study with Kindling.
                </BodyText>
                <Button onPress={() => setShowCreateSubject(true)}>
                  ＋ Add your first subject
                </Button>
              </View>
            ) : null}

            {!loading &&
            normalizedSearch &&
            filteredSubjects.length === 0 &&
            matchingLessons.length === 0 ? (
              <View style={[ui.card, styles.emptyCard]}>
                <Text style={styles.emptyTitle}>
                  No matches for “{searchQuery.trim()}”
                </Text>
                <BodyText style={styles.emptyBody}>
                  You can clear your search or start a custom 1-on-1 lesson on this exact topic right now.
                </BodyText>
                <View style={styles.emptyActionsRow}>
                  <Button
                    variant="secondary"
                    onPress={() => {
                      setQuickSubject(subjects[0]?.name || 'General');
                      setQuickTopic(searchQuery.trim());
                      setShowQuickLesson(true);
                    }}
                  >
                    Teach me “{searchQuery.trim()}”
                  </Button>
                  <Button variant="plain" onPress={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                </View>
              </View>
            ) : null}

            {/* Rich Subject Cards List */}
            {filteredSubjects.map((subject, index) => {
              const palette = getSubjectPalette(index);
              const lessonCount = subject.topics.reduce(
                (sum, t) => sum + getTopicLessons(t).length,
                0,
              );
              const activeInSubject = continuable.filter(
                (c) => c.subject.trim().toLowerCase() === subject.name.trim().toLowerCase(),
              ).length;
              const nextTarget = getNextLessonForSubject(subject);

              return (
                <View
                  key={subject.id}
                  style={[
                    styles.subjectCard,
                    { borderColor: palette.softBorder },
                  ]}
                >
                  {/* Top Accent Bar */}
                  <View
                    style={[
                      styles.subjectCardAccentBar,
                      { backgroundColor: palette.accent },
                    ]}
                  />

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${subject.name} learning path`}
                    onPress={() => {
                      setSelectedId(subject.id);
                      setUnitFilter('all');
                      setError('');
                    }}
                    style={({ pressed }) => [
                      styles.subjectCardBody,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.subjectTopRow}>
                      <View
                        style={[
                          styles.subjectIconBox,
                          { backgroundColor: palette.badgeBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subjectIconLetter,
                            { color: palette.badgeText },
                          ]}
                        >
                          {subject.name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.subjectHeaderCopy}>
                        <View style={styles.subjectBadgeLine}>
                          <Text
                            style={[styles.subjectCategoryTag, { color: palette.accent }]}
                          >
                            {subject.topics.length}{' '}
                            {subject.topics.length === 1 ? 'UNIT' : 'UNITS'} ·{' '}
                            {lessonCount} {lessonCount === 1 ? 'LESSON' : 'LESSONS'}
                          </Text>
                          {activeInSubject > 0 ? (
                            <View style={styles.subjectActiveChip}>
                              <View style={styles.topicActiveDot} />
                              <Text style={styles.subjectActiveChipText}>
                                {activeInSubject} active
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.subjectName}>{subject.name}</Text>
                        {subject.learningGoal ? (
                          <Text numberOfLines={2} style={styles.subjectGoalText}>
                            {subject.learningGoal}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Topic Unit Preview Chips */}
                    {subject.topics.length > 0 ? (
                      <View style={styles.topicPreviewWrap}>
                        {subject.topics.slice(0, 3).map((topic, tIdx) => (
                          <View
                            key={`${topic.id}-${topic.name}-${tIdx}`}
                            style={[
                              styles.topicPreviewChip,
                              { backgroundColor: palette.softBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.topicPreviewIndex,
                                { color: palette.accent },
                              ]}
                            >
                              {String(tIdx + 1).padStart(2, '0')}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={styles.topicPreviewText}
                            >
                              {topic.name}
                            </Text>
                          </View>
                        ))}
                        {subject.topics.length > 3 ? (
                          <View style={styles.topicMoreChip}>
                            <Text style={styles.topicMoreChipText}>
                              +{subject.topics.length - 3} more
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.noTopicsHint}>
                        No topic units yet — tap to add your first unit.
                      </Text>
                    )}
                  </Pressable>

                  {/* Subject Card Action Footer */}
                  <View style={styles.subjectCardFooter}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setSelectedId(subject.id);
                        setUnitFilter('all');
                        setError('');
                      }}
                      style={({ pressed }) => [
                        styles.openPathBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.openPathBtnText}>
                        Open path ({subject.topics.length}) ›
                      </Text>
                    </Pressable>

                    {nextTarget ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          startLesson(
                            subject.name,
                            nextTarget.unit,
                            nextTarget.lesson.name,
                            nextTarget.lesson.learningGoal,
                          )
                        }
                        style={({ pressed }) => [
                          styles.quickStartSubjectBtn,
                          { backgroundColor: palette.accent },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text numberOfLines={1} style={styles.quickStartSubjectBtnText}>
                          {nextTarget.isResume ? 'Resume lesson →' : 'Start next →'}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setSelectedId(subject.id);
                          setShowCreateTopic(true);
                        }}
                        style={({ pressed }) => [
                          styles.quickStartOutlineBtn,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.quickStartOutlineBtnText}>
                          ＋ Add unit
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Dashed Create Subject Card */}
            {subjects.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setError('');
                  setShowCreateSubject(true);
                }}
                style={({ pressed }) => [styles.dashedAddCard, pressed && styles.pressed]}
              >
                <View style={styles.dashedAddIconBox}>
                  <Text style={styles.dashedAddIconText}>＋</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.dashedAddTitle}>Create a new subject</Text>
                  <Text style={styles.dashedAddSubtitle}>
                    Add another subject path with units and guided lessons
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </>
        )}
      </AppScreen>

      {/* ====================================================================
       * MODAL 1: CREATE NEW SUBJECT
       * ==================================================================== */}
      <Modal
        visible={showCreateSubject}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateSubject(false)}
      >
        <KeyboardAvoidingView
          enabled={Platform.OS !== 'web'}
          behavior="padding"
          style={styles.modalShade}
        >
          <FormScrollView style={styles.modalScroll} contentContainerStyle={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.flex}>
                <Text style={styles.modalEyebrow}>NEW LEARNING PATH</Text>
                <Text style={styles.modalTitle}>Add a subject</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                onPress={() => setShowCreateSubject(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <BodyText>
              Pick a popular subject or enter your own. You can add topic units and lesson subtopics any time.
            </BodyText>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.presetChipsRow}
            >
              {SUBJECT_PRESETS.map((preset) => {
                const isSelected =
                  subjectName.trim().toLowerCase() === preset.toLowerCase();
                return (
                  <Pressable
                    key={preset}
                    accessibilityRole="button"
                    onPress={() => setSubjectName(preset)}
                    style={[
                      styles.presetChip,
                      isSelected && styles.presetChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isSelected && styles.presetChipTextActive,
                      ]}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Subject name</Text>
              <TextInput
                style={styles.input}
                value={subjectName}
                onChangeText={setSubjectName}
                placeholder="e.g. Biology, Algebra, World History…"
                placeholderTextColor="#87918B"
                returnKeyType="next"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>
                First topic unit <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={firstTopic}
                onChangeText={setFirstTopic}
                placeholder="e.g. Cell structure, Linear equations…"
                placeholderTextColor="#87918B"
                returnKeyType="next"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>
                Learning goal <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={subjectGoal}
                onChangeText={setSubjectGoal}
                placeholder="e.g. Build strong problem-solving foundations"
                placeholderTextColor="#87918B"
                returnKeyType="done"
                onSubmitEditing={() => void addSubject()}
              />
            </View>

            {error ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            <Button
              busy={saving}
              disabled={!subjectName.trim()}
              onPress={() => void addSubject()}
            >
              Create subject
            </Button>
            <Button variant="plain" onPress={() => setShowCreateSubject(false)}>
              Cancel
            </Button>
          </FormScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ====================================================================
       * MODAL 2: ADD TOPIC UNIT TO SELECTED SUBJECT
       * ==================================================================== */}
      <Modal
        visible={showCreateTopic}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateTopic(false)}
      >
        <KeyboardAvoidingView
          enabled={Platform.OS !== 'web'}
          behavior="padding"
          style={styles.modalShade}
        >
          <FormScrollView style={styles.modalScroll} contentContainerStyle={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.flex}>
                <Text style={styles.modalEyebrow}>
                  {selected?.name.toUpperCase() || 'SUBJECT'}
                </Text>
                <Text style={styles.modalTitle}>Add a topic unit</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                onPress={() => setShowCreateTopic(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <BodyText>
              Units group related subtopic lessons together so you can work through {selected?.name || 'your subject'} in clear steps.
            </BodyText>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Topic unit title</Text>
              <TextInput
                style={styles.input}
                value={topicDraft}
                onChangeText={setTopicDraft}
                placeholder="e.g. Introduction to quadratics"
                placeholderTextColor="#87918B"
                returnKeyType="next"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>
                First lesson subtopic <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={topicFirstSubtopic}
                onChangeText={setTopicFirstSubtopic}
                placeholder="e.g. Factoring simple expressions"
                placeholderTextColor="#87918B"
                returnKeyType="next"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>
                Unit learning goal <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={topicGoalDraft}
                onChangeText={setTopicGoalDraft}
                placeholder="What do you want to master in this unit?"
                placeholderTextColor="#87918B"
                returnKeyType="done"
                onSubmitEditing={() => void addTopic()}
              />
            </View>

            {error ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            <Button
              busy={saving}
              disabled={!topicDraft.trim()}
              onPress={() => void addTopic()}
            >
              ＋ Add topic unit
            </Button>
            <Button variant="plain" onPress={() => setShowCreateTopic(false)}>
              Cancel
            </Button>
          </FormScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ====================================================================
       * MODAL 3: QUICK CUSTOM LESSON LAUNCHER
       * ==================================================================== */}
      <Modal
        visible={showQuickLesson}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickLesson(false)}
      >
        <KeyboardAvoidingView
          enabled={Platform.OS !== 'web'}
          behavior="padding"
          style={styles.modalShade}
        >
          <FormScrollView style={styles.modalScroll} contentContainerStyle={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.flex}>
                <Text style={styles.modalEyebrow}>INSTANT 1-ON-1 SESSION</Text>
                <Text style={styles.modalTitle}>Start a custom lesson</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                onPress={() => setShowQuickLesson(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            <BodyText>
              Want to learn something right now? Tell Kindling the topic and jump straight into a personalized tutoring session.
            </BodyText>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Subject area</Text>
              <TextInput
                style={styles.input}
                value={quickSubject}
                onChangeText={setQuickSubject}
                placeholder="e.g. Mathematics, Science, History…"
                placeholderTextColor="#87918B"
                returnKeyType="next"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>What topic should we cover?</Text>
              <TextInput
                style={styles.input}
                value={quickTopic}
                onChangeText={setQuickTopic}
                placeholder="e.g. How photosynthesis works, Newton's Second Law…"
                placeholderTextColor="#87918B"
                returnKeyType="next"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>
                Specific question or goal <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={quickGoal}
                onChangeText={setQuickGoal}
                placeholder="e.g. Help me prepare for tomorrow's quiz"
                placeholderTextColor="#87918B"
                returnKeyType="done"
                onSubmitEditing={launchQuickLesson}
              />
            </View>

            <Button disabled={!quickTopic.trim()} onPress={launchQuickLesson}>
              Start lesson with Kindling →
            </Button>
            <Button variant="plain" onPress={() => setShowQuickLesson(false)}>
              Cancel
            </Button>
          </FormScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 36,
    gap: 24,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  btnDisabled: {
    opacity: 0.48,
  },

  /* Top Header Row */
  topline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: Brand.teal,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  hello: {
    fontSize: 28,
    letterSpacing: -0.8,
    fontWeight: '700',
    color: Brand.pine,
  },
  topCtaButton: {
    backgroundColor: Brand.pine,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCtaButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Hero Banner */
  heroCard: {
    backgroundColor: Brand.pine,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Brand.pineLight,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  heroLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6AD2B6',
  },
  heroBadgeText: {
    color: '#D7ECE6',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  heroGradeLabel: {
    color: '#B9DAD3',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  heroBody: {
    color: '#D6E4DF',
    fontSize: 14,
    lineHeight: 21,
  },
  heroActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  heroPrimaryBtn: {
    minHeight: 46,
    backgroundColor: Brand.gold,
    borderRadius: 14,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPrimaryBtnText: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '600',
  },
  heroSecondaryBtn: {
    minHeight: 46,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* 3-Card KPI Strip */
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    gap: 3,
  },
  kpiCardTeal: {
    backgroundColor: Brand.card,
    borderColor: Brand.line,
  },
  kpiCardPine: {
    backgroundColor: Brand.card,
    borderColor: Brand.line,
  },
  kpiCardGold: {
    backgroundColor: Brand.card,
    borderColor: Brand.line,
  },
  kpiLabel: {
    color: Brand.muted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  kpiValue: {
    color: Brand.pine,
    fontSize: 22,
    fontWeight: '600',
  },
  kpiSub: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '600',
  },

  /* Search Input */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 10,
  },
  searchIcon: {
    color: Brand.teal,
    fontSize: 18,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    color: Brand.ink,
    fontSize: 15,
    paddingVertical: 10,
  },
  searchClearBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EEF1EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: Brand.pine,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 19,
  },

  /* Continue Shelf */
  sectionBlock: {
    gap: 10,
  },
  sectionCounterText: {
    color: Brand.teal,
    fontSize: 12,
    fontWeight: '700',
  },
  continueScrollRow: {
    gap: 12,
    paddingRight: 8,
  },
  continueCard: {
    width: 266,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7DFDD',
    padding: 15,
    gap: 8,
    justifyContent: 'space-between',
  },
  continueCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  continueSubjectBadge: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '68%',
  },
  continueSubjectText: {
    color: Brand.pine,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  continueDateText: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  continueTopicTitle: {
    color: Brand.pine,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  continuePreviewText: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  continueCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Brand.line,
  },
  continueTurnsText: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  continueResumePill: {
    backgroundColor: Brand.pine,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  continueResumePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  /* Search Matching Lessons */
  searchLessonsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    overflow: 'hidden',
  },
  searchLessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EE',
  },
  searchLessonDot: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchLessonDotText: {
    color: Brand.teal,
    fontSize: 12,
    fontWeight: '600',
  },
  searchLessonBreadcrumb: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  searchLessonTitle: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },

  /* Subject Cards */
  addLinkText: {
    color: Brand.teal,
    fontSize: 14,
    fontWeight: '600',
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  subjectCardAccentBar: {
    height: 5,
    width: '100%',
  },
  subjectCardBody: {
    padding: 16,
    gap: 14,
  },
  subjectTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  subjectIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIconLetter: {
    fontSize: 21,
    fontWeight: '600',
  },
  subjectHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  subjectBadgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectCategoryTag: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  subjectActiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FDF3DC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  subjectActiveChipText: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
  },
  subjectName: {
    color: Brand.pine,
    fontSize: 19,
    fontWeight: '600',
  },
  subjectGoalText: {
    color: Brand.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  topicPreviewWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  topicPreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '100%',
  },
  topicPreviewIndex: {
    fontSize: 11,
    fontWeight: '600',
  },
  topicPreviewText: {
    color: Brand.ink,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 190,
  },
  topicMoreChip: {
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F3F0',
  },
  topicMoreChipText: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  noTopicsHint: {
    color: Brand.muted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  subjectCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAF9F5',
    borderTopWidth: 1,
    borderTopColor: '#ECEFE9',
  },
  openPathBtn: {
    paddingVertical: 6,
  },
  openPathBtnText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '600',
  },
  quickStartSubjectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartSubjectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  quickStartOutlineBtn: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: '#FFFFFF',
  },
  quickStartOutlineBtnText: {
    color: Brand.teal,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Subject Workspace Detail View */
  workspaceTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 13,
  },
  backPillGlyph: {
    color: Brand.pine,
    fontSize: 20,
    lineHeight: 21,
    fontWeight: '700',
  },
  backPillText: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '700',
  },
  topGhostPill: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 13,
  },
  topGhostPillText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '600',
  },
  subjectSwitcherRow: {
    gap: 8,
    paddingVertical: 2,
  },
  subjectSwitchChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
  },
  subjectSwitchChipActive: {
    backgroundColor: Brand.pine,
    borderColor: Brand.pine,
  },
  subjectSwitchChipText: {
    color: Brand.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  subjectSwitchChipTextActive: {
    color: '#FFFFFF',
  },
  subjectHeroCard: {
    backgroundColor: Brand.pine,
    borderRadius: 20,
    padding: 18,
    gap: 15,
  },
  subjectHeroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  subjectHeroMonogram: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectHeroMonogramText: {
    fontSize: 22,
    fontWeight: '600',
  },
  subjectHeroEyebrow: {
    color: '#B9DAD3',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.1,
  },
  subjectHeroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '600',
    marginTop: 2,
  },
  subjectHeroSubtitle: {
    color: '#D6E4DF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  subjectHeroStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subjectHeroStatPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 11,
    gap: 2,
  },
  subjectHeroStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  subjectHeroStatLabel: {
    color: '#C7DDD6',
    fontSize: 11,
    fontWeight: '600',
  },
  subjectHeroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  /* Unit Filter & Collapse Toolbar */
  unitToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
  },
  filterPillActive: {
    backgroundColor: Brand.pine,
    borderColor: Brand.pine,
  },
  filterPillText: {
    color: Brand.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  collapseToggleText: {
    color: Brand.teal,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Topic Unit Card */
  topicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 16,
    gap: 14,
  },
  topicCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  topicHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topicBadgeBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicBadgeNumber: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '600',
  },
  topicEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  topicTitle: {
    color: Brand.pine,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 1,
  },
  topicMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  topicMetaText: {
    color: Brand.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  topicActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FDF3DC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  topicActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D9901A',
  },
  topicActiveBadgeText: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
  },
  collapseChevron: {
    color: Brand.muted,
    fontSize: 16,
    paddingHorizontal: 4,
  },
  addLessonChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: Brand.tealPale,
  },
  addLessonChipActive: {
    backgroundColor: '#E9ECE9',
  },
  addLessonChipText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '600',
  },
  addLessonChipTextActive: {
    color: Brand.muted,
  },

  /* Spacious Lesson Subtopic Cards */
  lessonListContainer: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EE',
    paddingTop: 12,
  },
  lessonCard: {
    backgroundColor: '#FAF9F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EAE4',
    padding: 13,
  },
  lessonCardActive: {
    backgroundColor: '#F2F9F7',
    borderColor: '#B8DAD5',
  },
  lessonCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lessonIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#EFECE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonIndexBadgeActive: {
    backgroundColor: Brand.teal,
  },
  lessonIndexText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '600',
  },
  lessonIndexTextActive: {
    color: '#FFFFFF',
  },
  lessonCopy: {
    flex: 1,
    gap: 3,
  },
  lessonPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lessonStepLabel: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  lessonStatusActivePill: {
    backgroundColor: '#DDF0EC',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lessonStatusActiveText: {
    color: Brand.pine,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  lessonTimeText: {
    color: Brand.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  lessonTitle: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  lessonPreviewText: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  lessonGoalText: {
    color: Brand.teal,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  lessonHintText: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  lessonLaunchBtn: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonLaunchBtnActive: {
    backgroundColor: Brand.pine,
  },
  lessonLaunchBtnText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '600',
  },
  lessonLaunchBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Inline On-Demand Lesson Composer */
  inlineComposerCard: {
    backgroundColor: Brand.subtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 14,
    gap: 10,
  },
  inlineComposerTitle: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '600',
  },
  composerInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    color: Brand.ink,
    fontSize: 14,
  },
  inlineComposerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 2,
  },
  composerCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 11,
    justifyContent: 'center',
  },
  composerCancelText: {
    color: Brand.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  composerSaveBtn: {
    backgroundColor: Brand.pine,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 11,
    justifyContent: 'center',
  },
  composerSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Dashed Add Card */
  dashedAddCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#BCCAC3',
    padding: 16,
  },
  dashedAddIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedAddIconText: {
    color: Brand.pine,
    fontSize: 20,
    fontWeight: '600',
  },
  dashedAddTitle: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '600',
  },
  dashedAddSubtitle: {
    color: Brand.muted,
    fontSize: 12,
    marginTop: 2,
  },

  /* Loading, Empty & Error States */
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  loadingTitle: {
    color: Brand.pine,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingSubtitle: {
    color: Brand.muted,
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGlyph: {
    color: Brand.gold,
    fontSize: 26,
  },
  emptyTitle: {
    color: Brand.pine,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
  emptyActionsRow: {
    width: '100%',
    gap: 8,
  },
  errorBox: {
    backgroundColor: '#FCECE9',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3C7C0',
    gap: 6,
  },
  errorText: {
    color: Brand.error,
    fontSize: 14,
    lineHeight: 20,
  },

  /* Modals */
  modalShade: {
    flex: 1,
    backgroundColor: 'rgba(17,31,27,0.5)',
    justifyContent: 'center',
    padding: 18,
  },
  modalScroll: {
    flexGrow: 0,
    flexShrink: 1,
    width: '100%',
    maxHeight: '100%',
    borderRadius: 20,
  },
  modalCard: {
    backgroundColor: Brand.parchment,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  modalTitle: {
    color: Brand.pine,
    fontSize: 22,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Brand.line,
  },
  modalCloseText: {
    color: Brand.pine,
    fontSize: 22,
    lineHeight: 24,
  },
  presetChipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
  },
  presetChipActive: {
    backgroundColor: Brand.pine,
    borderColor: Brand.pine,
  },
  presetChipText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  modalField: {
    gap: 6,
  },
  fieldLabel: {
    color: Brand.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  optional: {
    color: Brand.muted,
    fontWeight: '400',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    color: Brand.ink,
    fontSize: 15,
  },
});
