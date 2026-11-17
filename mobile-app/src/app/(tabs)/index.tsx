import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppScreen,
  BodyText,
  BrandMark,
  Button,
  SectionTitle,
} from '@/components/mobile-ui';
import { Brand } from '@/constants/brand';
import { LEARNING_STYLES } from '@/constants/learner-profile';
import { useSession } from '@/context/session';
import {
  getLearningDashboard,
  listContinuableConversations,
  type ContinuableConversation,
  type LearningDashboard,
} from '@/services/api';

const AVATAR_ICONS: Record<string, string> = {
  sparkles: '✦',
  rocket: '🚀',
  flame: '🔥',
  bot: '🤖',
  compass: '🧭',
};

const INITIAL_VISIBLE_SKILLS = 3;

function resolveLearningStyleLabel(styleId?: string | null) {
  if (!styleId) return 'Visual & diagrams';
  const found = LEARNING_STYLES.find(
    (item) =>
      item.id.toLowerCase() === styleId.trim().toLowerCase() ||
      item.label.toLowerCase() === styleId.trim().toLowerCase(),
  );
  return found ? found.label : styleId;
}

function normalizeTopicKey(title?: string | null) {
  return (title || '').trim().toLowerCase();
}

function friendlySkillStatus(level: number, rawStatus?: string) {
  if (level >= 80) return 'Mastered';
  if (level >= 50) return 'Growing';
  if (rawStatus && !/locked/i.test(rawStatus)) return rawStatus;
  return 'Building';
}

export default function HomeScreen() {
  const { profile, session } = useSession();
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [continuable, setContinuable] = useState<ContinuableConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [weekRange, setWeekRange] = useState<'this' | 'last'>('this');
  const [showAllSkills, setShowAllSkills] = useState(false);

  const load = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [dashData, contData] = await Promise.all([
        getLearningDashboard(),
        listContinuableConversations(6),
      ]);
      setDashboard(dashData);
      setContinuable(contData);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not load your learning overview.',
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

  const firstName =
    profile?.name?.split(' ')[0] ||
    session?.name?.split(' ')[0] ||
    'there';
  const avatarKey = (profile?.avatar || '').trim().toLowerCase();
  const avatarEmoji = AVATAR_ICONS[avatarKey] || null;
  const fallbackInitial = (profile?.name || session?.name || 'S')
    .slice(0, 1)
    .toUpperCase();

  const week = dashboard?.weekStats?.[weekRange];
  const accuracy = dashboard?.insights?.stats?.accuracy;
  const confidence = dashboard?.confidenceHistory?.[weekRange] || [];
  const avgConfidence =
    confidence.length > 0
      ? Math.round(
          confidence.reduce((sum, val) => sum + Number(val || 0), 0) /
            confidence.length,
        )
      : null;

  const activeThread = continuable[0] || null;
  const otherContinuable = useMemo(() => {
    const heroKey = normalizeTopicKey(activeThread?.topic);
    const seen = new Set<string>(heroKey ? [heroKey] : []);
    return continuable.slice(1).filter((item) => {
      const k = normalizeTopicKey(item.topic);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [continuable, activeThread]);

  // Deduplicate skill mastery entries so the list stays clean
  const uniqueSkills = useMemo(() => {
    const raw = dashboard?.masteryMap || [];
    const seen = new Set<string>();
    return raw.filter((item) => {
      const key = `${normalizeTopicKey(item.subject)}::${normalizeTopicKey(item.skill)}`;
      if (!item.skill || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [dashboard?.masteryMap]);

  const visibleSkills = showAllSkills
    ? uniqueSkills
    : uniqueSkills.slice(0, INITIAL_VISIBLE_SKILLS);

  // Deduplicate Recent Learning and exclude the active Hero topic so it never repeats
  const uniqueRecent = useMemo(() => {
    const raw = dashboard?.recentActivity || [];
    const heroKey = normalizeTopicKey(activeThread?.topic);
    const seen = new Set<string>(heroKey ? [heroKey] : []);
    for (const c of otherContinuable) {
      const ck = normalizeTopicKey(c.topic);
      if (ck) seen.add(ck);
    }
    return raw
      .filter((item) => {
        const k = normalizeTopicKey(item.title);
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 3);
  }, [dashboard?.recentActivity, activeThread, otherContinuable]);

  // Deduplicate Coming Up and exclude topics already shown in Hero, Continue, or Recent Learning
  const uniqueUpcoming = useMemo(() => {
    const raw = dashboard?.weekPlan || [];
    const seen = new Set<string>();
    const heroKey = normalizeTopicKey(activeThread?.topic);
    if (heroKey) seen.add(heroKey);
    for (const c of otherContinuable) {
      const ck = normalizeTopicKey(c.topic);
      if (ck) seen.add(ck);
    }
    for (const r of uniqueRecent) {
      const rk = normalizeTopicKey(r.title);
      if (rk) seen.add(rk);
    }
    return raw
      .filter((item) => {
        const k = normalizeTopicKey(item.title);
        if (!k || k === 'open lesson' || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 3);
  }, [dashboard?.weekPlan, activeThread, otherContinuable, uniqueRecent]);

  const hasActivity = Boolean(
    dashboard?.hasData ||
      activeThread ||
      uniqueSkills.length > 0 ||
      uniqueRecent.length > 0 ||
      Number(week?.sessions?.value || 0) > 0,
  );

  const metrics = [
    {
      label: 'Sessions',
      value: week?.sessions?.value || '0',
      caption: weekRange === 'this' ? 'This week' : 'Last week',
      icon: '◷',
    },
    {
      label: accuracy != null ? 'Accuracy' : 'Study time',
      value:
        accuracy != null
          ? `${Math.round(accuracy)}%`
          : week?.time?.value || '0m',
      caption:
        accuracy != null
          ? `${dashboard?.totals?.correct || 0} correct`
          : 'Focused time',
      icon: accuracy != null ? '✓' : '◴',
    },
    {
      label: 'Streak',
      value: week?.streak?.value || '0 days',
      caption: 'Active days',
      icon: '🔥',
    },
    {
      label: 'Practice turns',
      value: week?.questions || '0',
      caption: 'Questions & steps',
      icon: '✦',
    },
  ];

  const strengths = useMemo(
    () => (dashboard?.strengths || []).slice(0, 3),
    [dashboard?.strengths],
  );
  const focusAreas = useMemo(
    () => (dashboard?.focusAreas || []).slice(0, 3),
    [dashboard?.focusAreas],
  );

  const openLesson = (subjectTitle: string, topicTitle: string) => {
    router.push({
      pathname: '/lesson',
      params: {
        subject: subjectTitle || 'Learning',
        topic: topicTitle || subjectTitle || 'Lesson',
        unit: topicTitle || subjectTitle || 'Lesson',
        grade: profile?.grade || '',
      },
    });
  };

  const shortGrade = profile?.grade
    ? profile.grade
        .replace(/High School/i, 'HS')
        .replace(/College \/ University/i, 'Uni')
    : '';

  return (
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
      {/* Top Header Row */}
      <View style={styles.topline}>
        <BrandMark size={38} />
        <View style={styles.greeting}>
          <Text style={styles.eyebrow}>KINDLING</Text>
          <Text numberOfLines={1} style={styles.hello}>
            Hi, {firstName}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/(tabs)/profile')}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{avatarEmoji || fallbackInitial}</Text>
          </View>
          {shortGrade ? (
            <Text numberOfLines={1} style={styles.avatarGradeText}>
              {shortGrade}
            </Text>
          ) : null}
        </Pressable>
      </View>

      {/* Primary Action Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLiveBadge}>
            <View style={styles.heroLiveDot} />
            <Text style={styles.heroLiveText}>
              {activeThread ? 'CONTINUE WHERE YOU LEFT OFF' : 'YOUR PERSONAL TUTOR'}
            </Text>
          </View>
          {week?.streak?.value && week.streak.value !== '0 days' ? (
            <View style={styles.heroStreakPill}>
              <Text style={styles.heroStreakText}>🔥 {week.streak.value}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.heroCopy}>
          {activeThread ? (
            <>
              <Text style={styles.heroSubjectTag}>
                {(activeThread.subject || 'Active lesson').toUpperCase()}
              </Text>
              <Text numberOfLines={2} style={styles.heroTitle}>
                {activeThread.topic}
              </Text>
              <Text numberOfLines={2} style={styles.heroBody}>
                {activeThread.previewText ||
                  activeThread.summary ||
                  'Pick up your 1-on-1 conversation right where you left off.'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.heroTitle}>
                {hasActivity
                  ? 'Ready for your next step?'
                  : 'Let’s make your next topic click.'}
              </Text>
              <Text style={styles.heroBody}>
                {hasActivity
                  ? 'Pick a topic from your subjects or take a quick practice quiz.'
                  : 'Choose a subject and work through ideas step by step with your personal AI tutor.'}
              </Text>
            </>
          )}
        </View>

        <View style={styles.heroActions}>
          {activeThread ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                openLesson(
                  activeThread.subject || 'Learning',
                  activeThread.topic || 'Lesson',
                )
              }
              style={({ pressed }) => [
                styles.heroPrimaryBtn,
                styles.flex,
                pressed && styles.pressed,
              ]}
            >
              <Text numberOfLines={1} style={styles.heroPrimaryBtnText}>
                Resume lesson →
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/learn')}
              style={({ pressed }) => [
                styles.heroPrimaryBtn,
                styles.flex,
                pressed && styles.pressed,
              ]}
            >
              <Text numberOfLines={1} style={styles.heroPrimaryBtnText}>
                {hasActivity ? 'Choose a lesson →' : 'Start your first lesson →'}
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/assessments')}
            style={({ pressed }) => [
              styles.heroSecondaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text numberOfLines={1} style={styles.heroSecondaryBtnText}>
              Practice quiz
            </Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Button variant="plain" onPress={() => void load(true)}>
            Try again
          </Button>
        </View>
      ) : null}

      {loading && !dashboard ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={Brand.teal} size="large" />
          <Text style={styles.loadingTitle}>Loading your learning space…</Text>
        </View>
      ) : null}

      {/* ====================================================================
       * FIRST-TIME LEARNER GUIDE (Shown when the student has no history yet)
       * ==================================================================== */}
      {!loading && !hasActivity ? (
        <View style={styles.sectionCard}>
          <Text style={styles.cardEyebrow}>GETTING STARTED</Text>
          <Text style={styles.cardHeading}>How Kindling works</Text>
          <View style={styles.stepsList}>
            {[
              {
                num: '1',
                title: 'Pick a subject & topic',
                body: 'Open the Learn tab to choose a topic from your curriculum or ask about anything.',
              },
              {
                num: '2',
                title: 'Think it through together',
                body: 'Kindling explains with visuals, examples, and small hints so you can solve it yourself.',
              },
              {
                num: '3',
                title: 'Check what clicked',
                body: 'Take a short 5-question check to see your skill mastery grow here on Home.',
              },
            ].map((step) => (
              <View key={step.num} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{step.num}</Text>
                </View>
                <View style={styles.stepCopy}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepBody}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ====================================================================
       * OTHER IN-PROGRESS LESSONS (Distinct from the Hero card)
       * ==================================================================== */}
      {otherContinuable.length > 0 ? (
        <View style={styles.sectionGroup}>
          <SectionTitle
            action={
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)/learn')}
                hitSlop={8}
              >
                <Text style={styles.sectionLink}>All subjects ›</Text>
              </Pressable>
            }
          >
            Also in progress
          </SectionTitle>
          <View style={styles.listCard}>
            {otherContinuable.slice(0, 2).map((item, idx) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() =>
                  openLesson(item.subject || 'Learning', item.topic || 'Lesson')
                }
                style={({ pressed }) => [
                  styles.listRow,
                  idx > 0 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.listIconBox}>
                  <Text style={styles.listIconGlyph}>▶</Text>
                </View>
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowEyebrow}>
                    {(item.subject || 'Lesson').toUpperCase()}
                  </Text>
                  <Text numberOfLines={1} style={styles.rowTitle}>
                    {item.topic}
                  </Text>
                  <Text numberOfLines={1} style={styles.rowSub}>
                    {item.messageCount || 1}{' '}
                    {(item.messageCount || 1) === 1 ? 'turn' : 'turns'} saved
                  </Text>
                </View>
                <View style={styles.resumeSmallPill}>
                  <Text style={styles.resumeSmallPillText}>Resume</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* ====================================================================
       * WEEKLY PROGRESS SNAPSHOT (2x2 Overflow-Safe Grid)
       * ==================================================================== */}
      {hasActivity ? (
        <View style={styles.sectionGroup}>
          <View style={styles.sectionRow}>
            <SectionTitle>Your progress</SectionTitle>
            <View style={styles.rangeToggle}>
              {(['last', 'this'] as const).map((range) => (
                <Pressable
                  key={range}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: weekRange === range }}
                  onPress={() => setWeekRange(range)}
                  style={[
                    styles.rangeButton,
                    weekRange === range && styles.rangeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.rangeText,
                      weekRange === range && styles.rangeSelectedText,
                    ]}
                  >
                    {range === 'last' ? 'Last week' : 'This week'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.metricGrid}>
            {metrics.map((metric) => (
              <View key={metric.label} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <View style={styles.metricIconBadge}>
                    <Text style={styles.metricIconGlyph}>{metric.icon}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.metricLabel}>
                    {metric.label}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.metricValue}
                >
                  {metric.value}
                </Text>
                <Text numberOfLines={1} style={styles.metricCaption}>
                  {metric.caption}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ====================================================================
       * SKILL MASTERY (Bounded to top 3 with Expand/Collapse toggle)
       * ==================================================================== */}
      {uniqueSkills.length > 0 ? (
        <View style={styles.sectionGroup}>
          <SectionTitle
            action={
              <Text style={styles.sectionCountMeta}>
                {uniqueSkills.length}{' '}
                {uniqueSkills.length === 1 ? 'skill' : 'skills'}
              </Text>
            }
          >
            Skill mastery
          </SectionTitle>

          <View style={styles.listCard}>
            {visibleSkills.map((skill, index) => {
              const level = Math.max(0, Math.min(100, Number(skill.level) || 0));
              const barColor =
                level >= 80
                  ? Brand.pine
                  : level >= 50
                    ? Brand.teal
                    : Brand.amber;
              const statusLabel = friendlySkillStatus(level, skill.status);

              return (
                <Pressable
                  key={`${skill.subject}-${skill.skill}-${index}`}
                  accessibilityRole="button"
                  onPress={() =>
                    openLesson(
                      skill.subject || 'Learning',
                      skill.skill || 'Skill practice',
                    )
                  }
                  style={({ pressed }) => [
                    styles.skillItem,
                    index > 0 && styles.rowDivider,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.skillTopRow}>
                    <View style={styles.rowCopy}>
                      <Text numberOfLines={1} style={styles.rowTitle}>
                        {skill.skill || 'Learning skill'}
                      </Text>
                      <Text numberOfLines={1} style={styles.rowSub}>
                        {skill.subject || 'Learning'} · {statusLabel}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.skillPercentBadge,
                        level >= 80
                          ? styles.skillPercentHigh
                          : level >= 50
                            ? styles.skillPercentMid
                            : styles.skillPercentLow,
                      ]}
                    >
                      <Text style={styles.skillPercentText}>{level}%</Text>
                    </View>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.max(5, level)}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}

            {uniqueSkills.length > INITIAL_VISIBLE_SKILLS ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAllSkills((prev) => !prev)}
                style={({ pressed }) => [
                  styles.expandSkillsBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.expandSkillsText}>
                  {showAllSkills
                    ? 'Show fewer skills ▴'
                    : `Show all ${uniqueSkills.length} skills ▾`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ====================================================================
       * STRENGTHS & PRACTICE NEXT (Clean, Unified & Learner-Friendly)
       * ==================================================================== */}
      {strengths.length > 0 || focusAreas.length > 0 ? (
        <View style={styles.sectionGroup}>
          <SectionTitle
            action={
              avgConfidence != null ? (
                <View style={styles.confidencePill}>
                  <Text style={styles.confidencePillText}>
                    Confidence ~{avgConfidence}%
                  </Text>
                </View>
              ) : undefined
            }
          >
            Strengths & focus
          </SectionTitle>

          <View style={styles.insightsStack}>
            {focusAreas.length > 0 ? (
              <View style={[styles.insightBox, styles.insightBoxFocus]}>
                <View style={styles.insightBoxHeader}>
                  <View style={styles.insightBadgeFocus}>
                    <Text style={styles.insightBadgeFocusText}>↗</Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.insightSectionTitle}>Practice next</Text>
                    <Text style={styles.insightSectionSub}>
                      Tap a topic to build your confidence
                    </Text>
                  </View>
                </View>
                {focusAreas.map((item, index) => (
                  <Pressable
                    key={`${item.label}-${index}`}
                    accessibilityRole="button"
                    onPress={() =>
                      openLesson('Practice', item.label || 'Focus topic')
                    }
                    style={({ pressed }) => [
                      styles.insightItemRow,
                      index > 0 && styles.insightDivider,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.rowCopy}>
                      <Text numberOfLines={1} style={styles.insightFocusTitle}>
                        {item.label}
                      </Text>
                      {item.hint ? (
                        <Text numberOfLines={1} style={styles.insightItemHint}>
                          {item.hint}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.rowChevron}>Practice ›</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {strengths.length > 0 ? (
              <View style={[styles.insightBox, styles.insightBoxStrengths]}>
                <View style={styles.insightBoxHeader}>
                  <View style={styles.insightBadgeGood}>
                    <Text style={styles.insightBadgeGoodText}>✓</Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.insightSectionTitle}>Going strong</Text>
                    <Text style={styles.insightSectionSub}>
                      Topics where you’ve shown solid understanding
                    </Text>
                  </View>
                </View>
                {strengths.map((item, index) => (
                  <View
                    key={`${item.label}-${index}`}
                    style={[
                      styles.insightItemRow,
                      index > 0 && styles.insightDividerGood,
                    ]}
                  >
                    <View style={styles.rowCopy}>
                      <Text numberOfLines={1} style={styles.insightItemTitle}>
                        {item.label}
                      </Text>
                      {item.hint ? (
                        <Text numberOfLines={1} style={styles.insightItemHint}>
                          {item.hint}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ====================================================================
       * COMING UP NEXT (Deduplicated against Hero & Recent Learning)
       * ==================================================================== */}
      {uniqueUpcoming.length > 0 ? (
        <View style={styles.sectionGroup}>
          <SectionTitle>Suggested next steps</SectionTitle>
          <View style={styles.listCard}>
            {uniqueUpcoming.map((item, index) => (
              <Pressable
                key={`${item.day}-${item.title}-${index}`}
                accessibilityRole="button"
                onPress={() =>
                  openLesson(item.tag || 'Learning', item.title || 'Lesson')
                }
                style={({ pressed }) => [
                  styles.listRow,
                  index > 0 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.planDayBadge}>
                  <Text style={styles.planDayText}>
                    {(item.day || `0${index + 1}`).slice(0, 3).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowEyebrow}>
                    {[item.tag, item.duration]
                      .filter(Boolean)
                      .join(' · ')
                      .toUpperCase()}
                  </Text>
                  <Text numberOfLines={1} style={styles.rowTitle}>
                    {item.title}
                  </Text>
                  {item.text ? (
                    <Text numberOfLines={1} style={styles.rowSub}>
                      {item.text}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.rowChevron}>Start ›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* ====================================================================
       * RECENT LEARNING (Deduplicated by topic, excluding Hero topic)
       * ==================================================================== */}
      {uniqueRecent.length > 0 ? (
        <View style={styles.sectionGroup}>
          <SectionTitle>Recent sessions</SectionTitle>
          <View style={styles.listCard}>
            {uniqueRecent.map((item, index) => (
              <Pressable
                key={item.id || `${item.title}-${index}`}
                accessibilityRole="button"
                onPress={() =>
                  openLesson(
                    item.subject || 'Learning',
                    item.title || 'Lesson session',
                  )
                }
                style={({ pressed }) => [
                  styles.listRow,
                  index > 0 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.recentIconBox}>
                  <Text style={styles.recentIconGlyph}>✓</Text>
                </View>
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowEyebrow}>
                    {[item.when || 'Recent', item.subject]
                      .filter(Boolean)
                      .join(' · ')
                      .toUpperCase()}
                  </Text>
                  <Text numberOfLines={1} style={styles.rowTitle}>
                    {item.title || 'Lesson session'}
                  </Text>
                  {item.detail ? (
                    <Text numberOfLines={1} style={styles.rowSub}>
                      {item.detail}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.rowChevron}>Revisit ›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* ====================================================================
       * COMPACT LEARNING PROFILE CARD
       * ==================================================================== */}
      <View style={styles.profileSummaryCard}>
        <View style={styles.profileHeaderRow}>
          <View style={styles.rowCopy}>
            <Text style={styles.cardEyebrow}>PERSONALIZATION</Text>
            <Text style={styles.cardHeading}>Your learning setup</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.profileViewPill}
          >
            <Text style={styles.profileLink}>Customize ›</Text>
          </Pressable>
        </View>

        <View style={styles.profileTagsRow}>
          <View style={styles.profileTagChip}>
            <Text numberOfLines={1} style={styles.profileTagText}>
              🎓 {profile?.grade || 'Set your grade'}
            </Text>
          </View>
          <View style={styles.profileTagChip}>
            <Text numberOfLines={1} style={styles.profileTagText}>
              ✦ {resolveLearningStyleLabel(profile?.learningStyle)}
            </Text>
          </View>
        </View>

        <View style={styles.profileGoalRow}>
          <Text style={styles.profileGoalLabel}>CURRENT GOAL</Text>
          <Text numberOfLines={2} style={styles.profileGoalValue}>
            {profile?.goal || 'Build confidence one lesson at a time'}
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingBottom: 32,
    gap: 20,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sectionGroup: {
    gap: 10,
  },
  pressed: {
    opacity: 0.75,
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
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 99,
    padding: 4,
    paddingRight: 10,
    flexShrink: 0,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Brand.pine,
    fontWeight: '700',
    fontSize: 15,
  },
  avatarGradeText: {
    color: Brand.pine,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 72,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: Brand.pine,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: Brand.pineLight,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.11)',
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
  heroLiveText: {
    color: '#D7ECE6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  heroStreakPill: {
    backgroundColor: 'rgba(243,200,104,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  heroStreakText: {
    color: Brand.gold,
    fontSize: 11,
    fontWeight: '700',
  },
  heroCopy: {
    gap: 5,
  },
  heroSubjectTag: {
    color: Brand.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    letterSpacing: -0.5,
    lineHeight: 29,
    fontWeight: '700',
  },
  heroBody: {
    color: '#D2E2DC',
    fontSize: 14,
    lineHeight: 20,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  heroPrimaryBtn: {
    minHeight: 46,
    backgroundColor: Brand.gold,
    borderRadius: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPrimaryBtnText: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '700',
  },
  heroSecondaryBtn: {
    minHeight: 46,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  /* First-Time Guide Card */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  cardEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardHeading: {
    color: Brand.pine,
    fontSize: 17,
    fontWeight: '700',
  },
  stepsList: {
    gap: 12,
    marginTop: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepBadgeText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },
  stepCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  stepTitle: {
    color: Brand.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  stepBody: {
    color: Brand.muted,
    fontSize: 13,
    lineHeight: 18,
  },

  /* Progress Section & 2x2 KPI Grid */
  sectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionLink: {
    color: Brand.teal,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCountMeta: {
    color: Brand.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  rangeToggle: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: 11,
    backgroundColor: Brand.subtle,
  },
  rangeButton: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  rangeSelected: {
    backgroundColor: '#FFFFFF',
  },
  rangeText: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  rangeSelectedText: {
    color: Brand.pine,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 135,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 13,
    gap: 5,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  metricIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricIconGlyph: {
    fontSize: 12,
    color: Brand.teal,
    fontWeight: '700',
  },
  metricLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
  },
  metricValue: {
    color: Brand.ink,
    fontSize: 24,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  metricCaption: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '500',
  },

  /* Loading & Error */
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingTitle: {
    color: Brand.muted,
    fontSize: 13,
    fontWeight: '600',
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

  /* Shared List Card (In Progress, Skills, Upcoming, Recent) */
  listCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 18,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    minWidth: 0,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
  },
  listIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listIconGlyph: {
    color: Brand.teal,
    fontSize: 12,
    fontWeight: '700',
  },
  recentIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Brand.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recentIconGlyph: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },
  planDayBadge: {
    width: 40,
    height: 34,
    borderRadius: 10,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planDayText: {
    color: Brand.pine,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rowEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rowTitle: {
    color: Brand.ink,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  rowSub: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  rowChevron: {
    color: Brand.teal,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 0,
  },
  resumeSmallPill: {
    backgroundColor: Brand.pine,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    flexShrink: 0,
  },
  resumeSmallPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  /* Skill Mastery Items */
  skillItem: {
    paddingVertical: 13,
    gap: 8,
  },
  skillTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minWidth: 0,
  },
  skillPercentBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  skillPercentHigh: {
    backgroundColor: '#DDF0E5',
  },
  skillPercentMid: {
    backgroundColor: Brand.tealPale,
  },
  skillPercentLow: {
    backgroundColor: Brand.amberPale,
  },
  skillPercentText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 7,
    width: '100%',
    borderRadius: 99,
    backgroundColor: '#EAEFEC',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  expandSkillsBtn: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandSkillsText: {
    color: Brand.teal,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Strengths & Focus Areas */
  confidencePill: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidencePillText: {
    color: Brand.pine,
    fontSize: 11,
    fontWeight: '700',
  },
  insightsStack: {
    gap: 10,
  },
  insightBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  insightBoxStrengths: {
    backgroundColor: '#F3F9F6',
    borderColor: '#CBE3D7',
  },
  insightBoxFocus: {
    backgroundColor: '#FFFBF2',
    borderColor: '#F0DEC0',
  },
  insightBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  insightBadgeGood: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Brand.teal,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightBadgeGoodText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  insightBadgeFocus: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Brand.amber,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  insightBadgeFocusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  insightSectionTitle: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '700',
  },
  insightSectionSub: {
    color: Brand.muted,
    fontSize: 11,
  },
  insightItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 8,
    minWidth: 0,
  },
  insightDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F2E5CE',
  },
  insightDividerGood: {
    borderTopWidth: 1,
    borderTopColor: '#DCECE4',
  },
  insightItemTitle: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '600',
  },
  insightFocusTitle: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '600',
  },
  insightItemHint: {
    color: Brand.muted,
    fontSize: 12,
  },

  /* Compact Profile Summary Card */
  profileSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 18,
    padding: 15,
    gap: 10,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  profileViewPill: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    flexShrink: 0,
  },
  profileLink: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
  },
  profileTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileTagChip: {
    backgroundColor: Brand.subtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    maxWidth: '100%',
  },
  profileTagText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '600',
  },
  profileGoalRow: {
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 11,
    gap: 2,
  },
  profileGoalLabel: {
    color: Brand.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  profileGoalValue: {
    color: Brand.ink,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
