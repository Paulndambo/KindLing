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
  badgeBg: string;
  badgeText: string;
};

const SUBJECT_PALETTES: SubjectPalette[] = [
  {
    accent: Brand.teal,
    badgeBg: Brand.tealPale,
    badgeText: Brand.pine,
  },
  {
    accent: Brand.pine,
    badgeBg: Brand.subtle,
    badgeText: Brand.pine,
  },
  {
    accent: Brand.amber,
    badgeBg: Brand.amberPale,
    badgeText: Brand.pine,
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
      learningGoal: topic.learningGoal || '',
      familiarity: topic.familiarity || 'unknown',
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
        cause instanceof Error
          ? cause.message
          : 'Could not load your learning subjects.',
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
    (
      subjectNameValue: string,
      lessonNameValue: string,
    ): ContinuableConversation | undefined => {
      const key = `${subjectNameValue.trim().toLowerCase()}::${lessonNameValue.trim().toLowerCase()}`;
      return activeMap.get(key);
    },
    [activeMap],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredSubjects = useMemo(() => {
    if (!normalizedSearch) return subjects;
    return subjects.filter((subject) => {
      if (subject.name.toLowerCase().includes(normalizedSearch)) return true;
      if ((subject.learningGoal || '').toLowerCase().includes(normalizedSearch))
        return true;
      return subject.topics.some(
        (topic) =>
          topic.name.toLowerCase().includes(normalizedSearch) ||
          topic.subtopics.some((sub) =>
            sub.name.toLowerCase().includes(normalizedSearch),
          ),
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

  const startLesson = (
    subjectTitle: string,
    unit: string,
    lesson: string,
    goal = '',
    familiarity = 'unknown',
  ) => {
    router.push({
      pathname: '/lesson',
      params: {
        subject: subjectTitle,
        unit: unit || lesson,
        topic: lesson,
        goal,
        familiarity,
        grade: profile?.grade || '',
      },
    });
  };

  const launchQuickLesson = () => {
    const subj = quickSubject.trim() || subjects[0]?.name || 'General Learning';
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
      await createSubject(
        subjectName.trim(),
        firstTopic.trim(),
        subjectGoal.trim(),
      );
      setSubjectName('');
      setSubjectGoal('');
      setFirstTopic('');
      setShowCreateSubject(false);
      await load(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not create this subject.',
      );
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
        await createSubtopic(
          Number(created.id),
          firstSub,
          topicGoalDraft.trim(),
        );
      }
      setTopicDraft('');
      setTopicGoalDraft('');
      setTopicFirstSubtopic('');
      setShowCreateTopic(false);
      await load(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not add this topic unit.',
      );
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
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not add this lesson subtopic.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleTopicCollapse = (key: string) => {
    setCollapsedTopics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getNextLessonForSubject = useCallback(
    (
      subject: Subject,
    ): { unit: string; lesson: LessonItem; isResume: boolean } | null => {
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
            {/* Top Navigation Row */}
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
                style={({ pressed }) => [
                  styles.topGhostPill,
                  pressed && styles.pressed,
                ]}
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
                        numberOfLines={1}
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
                (c) =>
                  c.subject.trim().toLowerCase() ===
                  selected.name.trim().toLowerCase(),
              ).length;
              const nextTarget = getNextLessonForSubject(selected);

              return (
                <View style={styles.subjectHeroCard}>
                  <View style={styles.subjectHeroHeader}>
                    <View
                      style={[
                        styles.subjectHeroMonogram,
                        {
                          backgroundColor:
                            getSubjectPalette(subjectIndex).badgeBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subjectHeroMonogramText,
                          {
                            color: getSubjectPalette(subjectIndex).badgeText,
                          },
                        ]}
                      >
                        {selected.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.subjectHeroEyebrow}>
                        {selected.topics.length}{' '}
                        {selected.topics.length === 1 ? 'UNIT' : 'UNITS'} ·{' '}
                        {totalSubjLessons}{' '}
                        {totalSubjLessons === 1 ? 'LESSON' : 'LESSONS'}
                        {activeInSubject > 0
                          ? ` · ${activeInSubject} ACTIVE`
                          : ''}
                      </Text>
                      <Text numberOfLines={2} style={styles.subjectHeroTitle}>
                        {selected.name}
                      </Text>
                      {selected.learningGoal ? (
                        <Text
                          numberOfLines={2}
                          style={styles.subjectHeroSubtitle}
                        >
                          {selected.learningGoal}
                        </Text>
                      ) : null}
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
                            nextTarget.lesson.familiarity,
                          )
                        }
                        style={({ pressed }) => [
                          styles.heroPrimaryBtn,
                          styles.flex,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={styles.heroPrimaryBtnText}
                          numberOfLines={1}
                        >
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
                        nextTarget
                          ? styles.heroSecondaryBtn
                          : [styles.heroPrimaryBtn, styles.flex],
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={
                          nextTarget
                            ? styles.heroSecondaryBtnText
                            : styles.heroPrimaryBtnText
                        }
                      >
                        ＋ Add unit
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
                    {selected.topics.every(
                      (t, idx) => collapsedTopics[`${t.id}-${idx}`],
                    )
                      ? 'Expand all'
                      : 'Collapse all'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* Topic Unit Accordion Cards */}
            {selected.topics.length > 0 ? (
              (() => {
                const visibleTopics = selected.topics.filter((topic) => {
                  if (unitFilter !== 'active') return true;
                  const lessons = getTopicLessons(topic);
                  return lessons.some((lesson) =>
                    Boolean(
                      getConversationForLesson(selected.name, lesson.name),
                    ),
                  );
                });

                if (visibleTopics.length === 0) {
                  return (
                    <View style={[ui.card, styles.emptyCard]}>
                      <View style={styles.emptyIconCircle}>
                        <Text style={styles.emptyGlyph}>◷</Text>
                      </View>
                      <Text style={styles.emptyTitle}>
                        No units in progress yet
                      </Text>
                      <BodyText style={styles.emptyBody}>
                        Tap any lesson in your units to begin a guided 1-on-1
                        session with Kindling.
                      </BodyText>
                      <Button
                        variant="secondary"
                        onPress={() => setUnitFilter('all')}
                      >
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
                    <View
                      key={`${topic.id}-${topic.name}-${index}`}
                      style={styles.topicCard}
                    >
                      {/* Clean Accordion Header */}
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
                          <View style={styles.topicMetaRow}>
                            <Text style={styles.topicEyebrow}>
                              UNIT {index + 1} · {lessons.length}{' '}
                              {lessons.length === 1 ? 'LESSON' : 'LESSONS'}
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
                          <Text numberOfLines={2} style={styles.topicTitle}>
                            {topic.name}
                          </Text>
                        </View>
                        <Text style={styles.collapseChevron}>
                          {isCollapsed ? '▾' : '▴'}
                        </Text>
                      </Pressable>

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
                                    leaf.familiarity,
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
                                      activeConv &&
                                        styles.lessonIndexBadgeActive,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.lessonIndexText,
                                        activeConv &&
                                          styles.lessonIndexTextActive,
                                      ]}
                                    >
                                      {lessonIndex + 1}
                                    </Text>
                                  </View>

                                  <View style={styles.lessonCopy}>
                                    <Text
                                      numberOfLines={2}
                                      style={styles.lessonTitle}
                                    >
                                      {leaf.name}
                                    </Text>

                                    {activeConv ? (
                                      <Text
                                        numberOfLines={1}
                                        style={styles.lessonActiveMeta}
                                      >
                                        In progress
                                        {turnCount > 0
                                          ? ` · ${turnCount} turns`
                                          : ''}
                                        {activeConv.updatedAt
                                          ? ` · ${formatRelativeDate(activeConv.updatedAt)}`
                                          : ''}
                                      </Text>
                                    ) : leaf.learningGoal ? (
                                      <Text
                                        numberOfLines={1}
                                        style={styles.lessonGoalText}
                                      >
                                        {leaf.learningGoal}
                                      </Text>
                                    ) : null}
                                  </View>

                                  <View
                                    style={[
                                      styles.lessonLaunchBtn,
                                      activeConv &&
                                        styles.lessonLaunchBtnActive,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.lessonLaunchBtnText,
                                        activeConv &&
                                          styles.lessonLaunchBtnTextActive,
                                      ]}
                                    >
                                      {activeConv ? 'Resume' : 'Start'}
                                    </Text>
                                  </View>
                                </View>
                              </Pressable>
                            );
                          })}

                          {/* Add Lesson Button or Inline Composer at bottom of unit */}
                          {topic.id != null ? (
                            isComposerOpen ? (
                              <View style={styles.inlineComposerCard}>
                                <Text style={styles.inlineComposerTitle}>
                                  New lesson in {topic.name}
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
                                    onPress={() =>
                                      setActiveSubtopicTopicId(null)
                                    }
                                    style={styles.composerCancelBtn}
                                  >
                                    <Text style={styles.composerCancelText}>
                                      Cancel
                                    </Text>
                                  </Pressable>
                                  <Pressable
                                    accessibilityRole="button"
                                    disabled={
                                      saving ||
                                      !(subtopicDrafts[topic.id] || '').trim()
                                    }
                                    onPress={() => void addSubtopic(topic)}
                                    style={[
                                      styles.composerSaveBtn,
                                      (saving ||
                                        !(
                                          subtopicDrafts[topic.id] || ''
                                        ).trim()) &&
                                        styles.btnDisabled,
                                    ]}
                                  >
                                    <Text style={styles.composerSaveText}>
                                      {saving ? 'Adding…' : 'Save lesson'}
                                    </Text>
                                  </Pressable>
                                </View>
                              </View>
                            ) : (
                              <Pressable
                                accessibilityRole="button"
                                onPress={() =>
                                  setActiveSubtopicTopicId(topic.id)
                                }
                                style={({ pressed }) => [
                                  styles.addLessonFooterBtn,
                                  pressed && styles.pressed,
                                ]}
                              >
                                <Text style={styles.addLessonFooterBtnText}>
                                  ＋ Add a lesson to this unit
                                </Text>
                              </Pressable>
                            )
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
                <Text style={styles.emptyTitle}>
                  Your learning path starts here
                </Text>
                <BodyText style={styles.emptyBody}>
                  Organize {selected.name} into topic units and lessons so
                  Kindling can guide you step by step.
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
              style={({ pressed }) => [
                styles.dashedAddCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.dashedAddIconBox}>
                <Text style={styles.dashedAddIconText}>＋</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.dashedAddTitle}>
                  Add a new unit to {selected.name}
                </Text>
                <Text style={styles.dashedAddSubtitle}>
                  Group related subtopic lessons together
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
              <BrandMark size={38} />
              <View style={styles.greeting}>
                <Text style={styles.eyebrow}>CURRICULUM & TOPICS</Text>
                <Text numberOfLines={1} style={styles.hello}>
                  Learn
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add new subject"
                onPress={() => {
                  setError('');
                  setShowCreateSubject(true);
                }}
                style={({ pressed }) => [
                  styles.topCtaButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.topCtaButtonText}>＋ Subject</Text>
              </Pressable>
            </View>

            {/* Search & Custom Topic Bar */}
            <View style={styles.searchAndQuickWrap}>
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

              <Pressable
                accessibilityRole="button"
                onPress={() => setShowQuickLesson(true)}
                style={({ pressed }) => [
                  styles.customTopicBar,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.customTopicIcon}>
                  <Text style={styles.customTopicIconText}>✦</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.customTopicTitle}>
                    Have a specific question or homework topic?
                  </Text>
                  <Text style={styles.customTopicSub}>
                    Start a custom 1-on-1 lesson on any topic right away
                  </Text>
                </View>
                <Text style={styles.customTopicCta}>Ask ›</Text>
              </Pressable>
            </View>

            {/* Compact Resume Banner (only when not searching) */}
            {!normalizedSearch && latestContinuable ? (
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
                  styles.resumeBanner,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={styles.resumeBannerEyebrow}>
                    CONTINUE ·{' '}
                    {(latestContinuable.subject || 'LESSON').toUpperCase()}
                  </Text>
                  <Text numberOfLines={1} style={styles.resumeBannerTitle}>
                    {latestContinuable.topic}
                  </Text>
                </View>
                <View style={styles.resumeBannerBtn}>
                  <Text style={styles.resumeBannerBtnText}>Resume →</Text>
                </View>
              </Pressable>
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
                  {matchingLessons.map(
                    ({ subject, unitName, lesson, activeConv }, idx) => (
                      <Pressable
                        key={`${subject.id}-${unitName}-${lesson.name}-${idx}`}
                        accessibilityRole="button"
                        onPress={() =>
                          startLesson(
                            subject.name,
                            unitName,
                            lesson.name,
                            lesson.learningGoal,
                            lesson.familiarity,
                          )
                        }
                        style={({ pressed }) => [
                          styles.searchLessonRow,
                          idx > 0 && styles.searchLessonDivider,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.searchLessonDot}>
                          <Text style={styles.searchLessonDotText}>▶</Text>
                        </View>
                        <View style={styles.flex}>
                          <Text
                            numberOfLines={1}
                            style={styles.searchLessonBreadcrumb}
                          >
                            {subject.name.toUpperCase()} · {unitName}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={styles.searchLessonTitle}
                          >
                            {lesson.name}
                          </Text>
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
                            {activeConv ? 'Resume' : 'Start'}
                          </Text>
                        </View>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            ) : null}

            {/* Subjects Section */}
            <SectionTitle
              action={
                subjects.length > 0 ? (
                  <Text style={styles.sectionCounterText}>
                    {subjects.length}{' '}
                    {subjects.length === 1 ? 'subject' : 'subjects'}
                  </Text>
                ) : undefined
              }
            >
              Your subjects
            </SectionTitle>

            {loading && subjects.length === 0 ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={Brand.teal} size="large" />
                <Text style={styles.loadingTitle}>
                  Loading your curriculum…
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
                <Text style={styles.emptyTitle}>
                  Add your first subject path
                </Text>
                <BodyText style={styles.emptyBody}>
                  Create a subject like Mathematics, Science, or Computer
                  Science, then add units and lessons to study with Kindling.
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
                  Start a custom 1-on-1 lesson on this exact topic right now.
                </BodyText>
                <View style={styles.emptyActionsRow}>
                  <Button
                    variant="primary"
                    onPress={() => {
                      setQuickSubject(subjects[0]?.name || 'General');
                      setQuickTopic(searchQuery.trim());
                      setShowQuickLesson(true);
                    }}
                  >
                    {`Teach me “${searchQuery.trim()}”`}
                  </Button>
                  <Button variant="plain" onPress={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                </View>
              </View>
            ) : null}

            {/* Clean Subject Cards List */}
            {filteredSubjects.map((subject, index) => {
              const palette = getSubjectPalette(index);
              const lessonCount = subject.topics.reduce(
                (sum, t) => sum + getTopicLessons(t).length,
                0,
              );
              const activeInSubject = continuable.filter(
                (c) =>
                  c.subject.trim().toLowerCase() ===
                  subject.name.trim().toLowerCase(),
              ).length;
              const nextTarget = getNextLessonForSubject(subject);

              return (
                <View key={subject.id} style={styles.subjectCard}>
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
                            numberOfLines={1}
                            style={[
                              styles.subjectCategoryTag,
                              { color: palette.accent },
                            ]}
                          >
                            {subject.topics.length}{' '}
                            {subject.topics.length === 1 ? 'UNIT' : 'UNITS'} ·{' '}
                            {lessonCount}{' '}
                            {lessonCount === 1 ? 'LESSON' : 'LESSONS'}
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
                        <Text numberOfLines={2} style={styles.subjectName}>
                          {subject.name}
                        </Text>
                        {subject.learningGoal ? (
                          <Text
                            numberOfLines={1}
                            style={styles.subjectGoalText}
                          >
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
                            style={styles.topicPreviewChip}
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
                        Tap to add your first topic unit.
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
                      <Text numberOfLines={1} style={styles.openPathBtnText}>
                        View units ({subject.topics.length}) ›
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
                            nextTarget.lesson.familiarity,
                          )
                        }
                        style={({ pressed }) => [
                          styles.quickStartSubjectBtn,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={styles.quickStartSubjectBtnText}
                        >
                          {nextTarget.isResume
                            ? 'Resume lesson →'
                            : 'Start next →'}
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
                style={({ pressed }) => [
                  styles.dashedAddCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.dashedAddIconBox}>
                  <Text style={styles.dashedAddIconText}>＋</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.dashedAddTitle}>Add another subject</Text>
                  <Text style={styles.dashedAddSubtitle}>
                    Create a subject path with units and guided lessons
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
          <FormScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalCard}
          >
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
              Pick a subject below or enter your own. You can add topic units
              and lessons any time.
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
          <FormScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalCard}
          >
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
              Units group related lessons together so you can work through{' '}
              {selected?.name || 'your subject'} in clear steps.
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
                First lesson <Text style={styles.optional}>(optional)</Text>
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
                Unit learning goal{' '}
                <Text style={styles.optional}>(optional)</Text>
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
          <FormScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalCard}
          >
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
              Tell Kindling what you want to learn or practice and jump straight
              into a personalized tutoring session.
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
                placeholder="e.g. How photosynthesis works, Fractions…"
                placeholderTextColor="#87918B"
                returnKeyType="next"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>
                Specific question or goal{' '}
                <Text style={styles.optional}>(optional)</Text>
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
    paddingTop: 14,
    paddingBottom: 34,
    gap: 18,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.75,
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
    minWidth: 0,
    gap: 1,
  },
  eyebrow: {
    color: Brand.teal,
    fontSize: 10,
    letterSpacing: 0.85,
    fontWeight: '700',
  },
  hello: {
    fontSize: 24,
    letterSpacing: -0.6,
    fontWeight: '700',
    color: Brand.pine,
  },
  topCtaButton: {
    backgroundColor: Brand.pine,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topCtaButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Search & Quick Custom Topic Bar */
  searchAndQuickWrap: {
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 13,
    minHeight: 46,
    gap: 9,
  },
  searchIcon: {
    color: Brand.teal,
    fontSize: 17,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: Brand.ink,
    fontSize: 15,
    paddingVertical: 8,
  },
  searchClearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Brand.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: Brand.pine,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  customTopicBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 12,
  },
  customTopicIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  customTopicIconText: {
    color: Brand.teal,
    fontSize: 15,
    fontWeight: '700',
  },
  customTopicTitle: {
    color: Brand.ink,
    fontSize: 13.5,
    fontWeight: '700',
  },
  customTopicSub: {
    color: Brand.muted,
    fontSize: 12,
  },
  customTopicCta: {
    color: Brand.teal,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },

  /* Compact Resume Banner */
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.pine,
    borderRadius: 16,
    padding: 14,
  },
  resumeBannerEyebrow: {
    color: Brand.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  resumeBannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  resumeBannerBtn: {
    backgroundColor: Brand.gold,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    flexShrink: 0,
  },
  resumeBannerBtnText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Search Matching Lessons */
  sectionBlock: {
    gap: 10,
  },
  sectionCounterText: {
    color: Brand.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  searchLessonsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  searchLessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    minWidth: 0,
  },
  searchLessonDivider: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
  },
  searchLessonDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchLessonDotText: {
    color: Brand.teal,
    fontSize: 11,
    fontWeight: '700',
  },
  searchLessonBreadcrumb: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  searchLessonTitle: {
    color: Brand.ink,
    fontSize: 14.5,
    fontWeight: '600',
    marginTop: 1,
  },

  /* Subject Cards */
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    overflow: 'hidden',
  },
  subjectCardBody: {
    padding: 15,
    gap: 12,
  },
  subjectTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minWidth: 0,
  },
  subjectIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  subjectIconLetter: {
    fontSize: 20,
    fontWeight: '700',
  },
  subjectHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  subjectBadgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjectCategoryTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  subjectActiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.amberPale,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  subjectActiveChipText: {
    color: Brand.pine,
    fontSize: 10,
    fontWeight: '700',
  },
  subjectName: {
    color: Brand.pine,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
  },
  subjectGoalText: {
    color: Brand.muted,
    fontSize: 12.5,
    lineHeight: 17,
  },
  topicPreviewWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicPreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: Brand.subtle,
    maxWidth: '100%',
  },
  topicPreviewIndex: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  topicPreviewText: {
    color: Brand.ink,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  topicMoreChip: {
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: Brand.subtle,
  },
  topicMoreChipText: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  noTopicsHint: {
    color: Brand.muted,
    fontSize: 12.5,
  },
  subjectCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 11,
    backgroundColor: '#FAFBF9',
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
  },
  openPathBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 4,
  },
  openPathBtnText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },
  quickStartSubjectBtn: {
    backgroundColor: Brand.pine,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quickStartSubjectBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  quickStartOutlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  quickStartOutlineBtnText: {
    color: Brand.teal,
    fontSize: 12.5,
    fontWeight: '700',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backPillGlyph: {
    color: Brand.pine,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  backPillText: {
    color: Brand.pine,
    fontSize: 13.5,
    fontWeight: '700',
  },
  topGhostPill: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  topGhostPillText: {
    color: Brand.pine,
    fontSize: 12.5,
    fontWeight: '700',
  },
  subjectSwitcherRow: {
    gap: 8,
    paddingVertical: 2,
  },
  subjectSwitchChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    maxWidth: 200,
  },
  subjectSwitchChipActive: {
    backgroundColor: Brand.pine,
    borderColor: Brand.pine,
  },
  subjectSwitchChipText: {
    color: Brand.muted,
    fontSize: 12.5,
    fontWeight: '600',
  },
  subjectSwitchChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subjectHeroCard: {
    backgroundColor: Brand.pine,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  subjectHeroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minWidth: 0,
  },
  subjectHeroMonogram: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  subjectHeroMonogramText: {
    fontSize: 20,
    fontWeight: '700',
  },
  subjectHeroEyebrow: {
    color: '#B9DAD3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  subjectHeroTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
    marginTop: 2,
  },
  subjectHeroSubtitle: {
    color: '#D2E2DC',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  subjectHeroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroPrimaryBtn: {
    minHeight: 44,
    backgroundColor: Brand.gold,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPrimaryBtnText: {
    color: Brand.pine,
    fontSize: 13.5,
    fontWeight: '700',
  },
  heroSecondaryBtn: {
    minHeight: 44,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Unit Filter & Collapse Toolbar */
  unitToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  collapseToggleText: {
    color: Brand.teal,
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* Topic Unit Card */
  topicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 14,
    gap: 12,
  },
  topicHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minWidth: 0,
  },
  topicBadgeBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topicBadgeNumber: {
    color: Brand.pine,
    fontSize: 13.5,
    fontWeight: '700',
  },
  topicMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  topicTitle: {
    color: Brand.pine,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  topicActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.amberPale,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  topicActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.amber,
  },
  topicActiveBadgeText: {
    color: Brand.pine,
    fontSize: 10,
    fontWeight: '700',
  },
  collapseChevron: {
    color: Brand.muted,
    fontSize: 16,
    paddingHorizontal: 4,
    flexShrink: 0,
  },

  /* Lesson Subtopic Rows */
  lessonListContainer: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
    paddingTop: 10,
  },
  lessonCard: {
    backgroundColor: '#F8FAF9',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5EBE8',
    padding: 11,
  },
  lessonCardActive: {
    backgroundColor: '#F1F8F5',
    borderColor: '#B8DAD0',
  },
  lessonCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  lessonIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Brand.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lessonIndexBadgeActive: {
    backgroundColor: Brand.teal,
  },
  lessonIndexText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
  },
  lessonIndexTextActive: {
    color: '#FFFFFF',
  },
  lessonCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  lessonTitle: {
    color: Brand.ink,
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 19,
  },
  lessonActiveMeta: {
    color: Brand.teal,
    fontSize: 11.5,
    fontWeight: '600',
  },
  lessonGoalText: {
    color: Brand.muted,
    fontSize: 11.5,
  },
  lessonLaunchBtn: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lessonLaunchBtnActive: {
    backgroundColor: Brand.pine,
  },
  lessonLaunchBtnText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
  },
  lessonLaunchBtnTextActive: {
    color: '#FFFFFF',
  },
  addLessonFooterBtn: {
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C5D2CC',
    marginTop: 2,
  },
  addLessonFooterBtnText: {
    color: Brand.teal,
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* Inline Lesson Composer */
  inlineComposerCard: {
    backgroundColor: Brand.subtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 12,
    gap: 9,
  },
  inlineComposerTitle: {
    color: Brand.pine,
    fontSize: 13.5,
    fontWeight: '700',
  },
  composerInput: {
    minHeight: 44,
    borderRadius: 11,
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
    gap: 8,
  },
  composerCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    justifyContent: 'center',
  },
  composerCancelText: {
    color: Brand.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  composerSaveBtn: {
    backgroundColor: Brand.pine,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
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
    gap: 12,
    backgroundColor: Brand.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C2CFC9',
    padding: 14,
  },
  dashedAddIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dashedAddIconText: {
    color: Brand.pine,
    fontSize: 18,
    fontWeight: '700',
  },
  dashedAddTitle: {
    color: Brand.pine,
    fontSize: 14.5,
    fontWeight: '700',
  },
  dashedAddSubtitle: {
    color: Brand.muted,
    fontSize: 12,
    marginTop: 1,
  },

  /* Loading, Empty & Error States */
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  loadingTitle: {
    color: Brand.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 22,
    gap: 10,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGlyph: {
    color: Brand.teal,
    fontSize: 22,
  },
  emptyTitle: {
    color: Brand.pine,
    fontSize: 17,
    fontWeight: '700',
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3C7C0',
    gap: 6,
  },
  errorText: {
    color: Brand.error,
    fontSize: 13,
    lineHeight: 19,
  },

  /* Modals */
  modalShade: {
    flex: 1,
    backgroundColor: 'rgba(17,31,27,0.5)',
    justifyContent: 'center',
    padding: 16,
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
    padding: 18,
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
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  modalTitle: {
    color: Brand.pine,
    fontSize: 21,
    fontWeight: '700',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Brand.line,
  },
  modalCloseText: {
    color: Brand.pine,
    fontSize: 20,
    lineHeight: 22,
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
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalField: {
    gap: 6,
  },
  fieldLabel: {
    color: Brand.ink,
    fontSize: 13.5,
    fontWeight: '700',
  },
  optional: {
    color: Brand.muted,
    fontWeight: '400',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    color: Brand.ink,
    fontSize: 15,
  },
});
