import { useCallback, useState } from 'react';
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

type MetricTone = 'teal' | 'pine' | 'gold' | 'berry';

const METRIC_THEMES: Record<
  MetricTone,
  { cardBg: string; cardBorder: string; iconBg: string; iconColor: string; accentColor: string }
> = {
  teal: {
    cardBg: Brand.card,
    cardBorder: Brand.line,
    iconBg: Brand.subtle,
    iconColor: Brand.teal,
    accentColor: Brand.teal,
  },
  pine: {
    cardBg: Brand.card,
    cardBorder: Brand.line,
    iconBg: Brand.subtle,
    iconColor: Brand.teal,
    accentColor: Brand.pine,
  },
  gold: {
    cardBg: Brand.card,
    cardBorder: Brand.line,
    iconBg: Brand.subtle,
    iconColor: Brand.teal,
    accentColor: Brand.teal,
  },
  berry: {
    cardBg: Brand.card,
    cardBorder: Brand.line,
    iconBg: Brand.subtle,
    iconColor: Brand.teal,
    accentColor: Brand.teal,
  },
};

function resolveLearningStyleLabel(styleId?: string | null) {
  if (!styleId) return 'Visual learning';
  const found = LEARNING_STYLES.find(
    (item) =>
      item.id.toLowerCase() === styleId.trim().toLowerCase() ||
      item.label.toLowerCase() === styleId.trim().toLowerCase(),
  );
  return found ? found.label : styleId;
}

export default function HomeScreen() {
  const { profile, session } = useSession();
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [continuable, setContinuable] = useState<ContinuableConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [weekRange, setWeekRange] = useState<'this' | 'last'>('this');

  const load = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [dashData, contData] = await Promise.all([
        getLearningDashboard(),
        listContinuableConversations(4),
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
  const hintRate = dashboard?.profile?.behavior?.hintRate;
  const confidence = dashboard?.confidenceHistory?.[weekRange] || [];
  const avgConfidence =
    confidence.length > 0
      ? Math.round(
          confidence.reduce((sum, val) => sum + Number(val || 0), 0) /
            confidence.length,
        )
      : null;

  const metrics: {
    label: string;
    value: string;
    caption: string;
    icon: string;
    tone: MetricTone;
  }[] = [
    {
      label: 'Sessions',
      value: week?.sessions?.value || '0',
      caption: week?.sessions?.cap || 'completed lessons',
      icon: '◷',
      tone: 'teal',
    },
    {
      label: accuracy != null ? 'Accuracy' : 'Study time',
      value:
        accuracy != null
          ? `${Math.round(accuracy)}%`
          : week?.time?.value || '0 min',
      caption:
        accuracy != null
          ? `${dashboard?.totals?.correct || 0} correct answers`
          : week?.time?.cap || 'focused study',
      icon: accuracy != null ? '↗' : '◴',
      tone: 'pine',
    },
    {
      label: hintRate != null ? 'Hint rate' : 'Active days',
      value:
        hintRate != null
          ? `${Math.round(hintRate * 100)}%`
          : week?.streak?.value || '0 days',
      caption:
        hintRate != null
          ? 'turns asking for help'
          : week?.streak?.cap || 'learning streak',
      icon: '✦',
      tone: 'gold',
    },
    {
      label: 'Practice turns',
      value: week?.questions || '0',
      caption: weekRange === 'this' ? 'this week' : 'last week',
      icon: '✎',
      tone: 'berry',
    },
  ];

  const activeThread = continuable[0] || null;
  const recent = dashboard?.recentActivity?.[0] || null;

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
        <BrandMark size={42} />
        <View style={styles.greeting}>
          <Text style={styles.eyebrow}>KINDLING</Text>
          <Text style={styles.hello}>Hi, {firstName}.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/(tabs)/profile')}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {avatarEmoji || fallbackInitial}
            </Text>
          </View>
          {profile?.grade ? (
            <Text numberOfLines={1} style={styles.avatarGradeText}>
              {profile.grade.replace(/High School/i, 'HS').replace(/College \/ University/i, 'Uni')}
            </Text>
          ) : null}
        </Pressable>
      </View>

      {/* Dark Pine Hero Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroLiveBadge}>
            <View style={styles.heroLiveDot} />
            <Text style={styles.heroLiveText}>YOUR PERSONAL TUTOR</Text>
          </View>
          {week?.streak?.value ? (
            <View style={styles.heroStreakPill}>
              <Text style={styles.heroStreakText}>{week.streak.value} streak</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            {activeThread
              ? `Continue learning ${activeThread.topic}?`
              : 'Your next step starts here.'}
          </Text>
          <Text style={styles.heroBody}>
            {activeThread
              ? `Pick up your active ${activeThread.subject} conversation right where you left off, or explore a new topic.`
              : 'Build your understanding with focused lessons and guided practice, at your pace.'}
          </Text>
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
                Resume: {activeThread.topic} →
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
              <Text style={styles.heroPrimaryBtnText}>Choose a lesson →</Text>
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
            <Text style={styles.heroSecondaryBtnText}>Practice quiz</Text>
          </Pressable>
        </View>
      </View>

      {/* Progress Section + Range Toggle */}
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

      {loading && !dashboard ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={Brand.teal} size="large" />
          <Text style={styles.loadingTitle}>
            Gathering your learning activity…
          </Text>
        </View>
      ) : (
        <View style={styles.metricGrid}>
          {metrics.map((metric) => {
            const theme = METRIC_THEMES[metric.tone];
            return (
              <View
                key={metric.label}
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <View style={styles.metricHeader}>
                  <View
                    style={[
                      styles.metricIconBadge,
                      { backgroundColor: theme.iconBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.metricIconGlyph,
                        { color: theme.iconColor },
                      ]}
                    >
                      {metric.icon}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.metricLabel,
                      { color: theme.accentColor },
                    ]}
                  >
                    {metric.label}
                  </Text>
                </View>

                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricCaption}>{metric.caption}</Text>
              </View>
            );
          })}
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Button variant="plain" onPress={() => void load(true)}>
            Try again
          </Button>
        </View>
      ) : null}

      {/* Pick Up With Kindling */}
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
        Continue learning
      </SectionTitle>

      {activeThread ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Continue ${activeThread.topic}`}
          onPress={() =>
            openLesson(
              activeThread.subject || 'Learning',
              activeThread.topic || 'Lesson',
            )
          }
          style={({ pressed }) => [styles.pickupCard, pressed && styles.pressed]}
        >
          <View style={styles.pickupTopRow}>
            <View style={styles.pickupSubjectBadge}>
              <Text style={styles.pickupSubjectText}>
                {(activeThread.subject || 'ACTIVE LESSON').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.pickupMetaText}>
              {activeThread.messageCount || 1}{' '}
              {(activeThread.messageCount || 1) === 1 ? 'turn' : 'turns'}
            </Text>
          </View>

          <Text style={styles.pickupTitle}>{activeThread.topic}</Text>
          <Text numberOfLines={2} style={styles.pickupBody}>
            {activeThread.previewText ||
              activeThread.summary ||
              'Continue your 1-on-1 lesson right where you left off.'}
          </Text>

          <View style={styles.pickupFooter}>
            <Text style={styles.pickupFooterHint}>
              Saved conversation ready
            </Text>
            <View style={styles.pickupActionPill}>
              <Text style={styles.pickupActionText}>Resume lesson →</Text>
            </View>
          </View>
        </Pressable>
      ) : recent ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Continue ${recent.title || 'recent lesson'}`}
          onPress={() =>
            openLesson(
              recent.subject || 'Learning',
              recent.title || recent.subject || 'Learning',
            )
          }
          style={({ pressed }) => [styles.pickupCard, pressed && styles.pressed]}
        >
          <View style={styles.pickupTopRow}>
            <View style={styles.pickupSubjectBadge}>
              <Text style={styles.pickupSubjectText}>
                {(recent.subject || 'RECENT LESSON').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.pickupMetaText}>{recent.when || 'Recently'}</Text>
          </View>

          <Text style={styles.pickupTitle} numberOfLines={1}>
            {recent.title || 'Lesson'}
          </Text>
          <Text style={styles.pickupBody} numberOfLines={2}>
            {recent.detail || 'Continue building your understanding.'}
          </Text>

          <View style={styles.pickupFooter}>
            <Text style={styles.pickupFooterHint}>Tap to reopen session</Text>
            <View style={styles.pickupActionPill}>
              <Text style={styles.pickupActionText}>Continue →</Text>
            </View>
          </View>
        </Pressable>
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>✦</Text>
          </View>
          <Text style={styles.emptyTitle}>Your first lesson is waiting</Text>
          <BodyText style={styles.emptyBody}>
            Choose a subject and start with a topic that interests you. Your progress will show up here.
          </BodyText>
          <Button
            variant="secondary"
            onPress={() => router.push('/(tabs)/learn')}
          >
            Browse subjects
          </Button>
        </View>
      )}

      {/* Recommended Next Actions (if available) */}
      {dashboard?.nextBestActions && dashboard.nextBestActions.length > 0 ? (
        <View style={styles.nextActionsStack}>
          {dashboard.nextBestActions.slice(0, 2).map((action, idx) => (
            <Pressable
              key={`${action.label}-${idx}`}
              accessibilityRole="button"
              onPress={() =>
                openLesson(
                  profile?.focusSubjects?.[0] || 'Learning',
                  action.label || 'Practice',
                )
              }
              style={({ pressed }) => [
                styles.nextActionRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.nextActionBadge}>
                <Text style={styles.nextActionBadgeText}>↗</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.nextActionEyebrow}>RECOMMENDED NEXT</Text>
                <Text style={styles.nextActionTitle}>
                  {action.label || 'Recommended practice'}
                </Text>
                {action.reason ? (
                  <Text numberOfLines={2} style={styles.nextActionReason}>
                    {action.reason}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.nextActionCta}>
                {action.cta || 'Start'} ›
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Learning Profile & Tutor Insight Summary */}
      <View style={styles.profileSummaryCard}>
        <View style={styles.profileHeaderRow}>
          <View style={styles.flex}>
            <Text style={styles.profileEyebrow}>LEARNING PROFILE</Text>
            <Text style={styles.profileTitle}>Your learning profile</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.profileViewPill}
          >
            <Text style={styles.profileLink}>View ›</Text>
          </Pressable>
        </View>

        <View style={styles.profileTagsRow}>
          <View style={styles.profileTagChip}>
            <Text style={styles.profileTagText}>
              🎓 {profile?.grade || 'Set your grade'}
            </Text>
          </View>
          <View style={styles.profileTagChip}>
            <Text style={styles.profileTagText}>
              ✦ {resolveLearningStyleLabel(profile?.learningStyle)}
            </Text>
          </View>
        </View>

        <View style={styles.profileGoalRow}>
          <Text style={styles.profileGoalLabel}>MAIN GOAL</Text>
          <Text style={styles.profileGoalValue}>
            {profile?.goal || 'Build confidence one lesson at a time'}
          </Text>
        </View>

        {profile?.interests?.length ? (
          <Text style={styles.profileInterestsText}>
            Examples tailored to: {profile.interests.slice(0, 4).join(' · ')}
          </Text>
        ) : null}

        {dashboard?.insights?.summary ? (
          <View style={styles.insightCallout}>
            <Text style={styles.insightCalloutLabel}>TUTOR INSIGHT</Text>
            <Text style={styles.insightCalloutText}>
              {dashboard.insights.summary}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Skill Mastery Section */}
      <SectionTitle>Skill mastery</SectionTitle>
      <View style={styles.skillsCard}>
        {dashboard?.masteryMap?.length ? (
          dashboard.masteryMap.map((skill, index) => {
            const level = Math.max(0, Math.min(100, Number(skill.level) || 0));
            const barColor =
              level >= 80
                ? Brand.pine
                : level >= 50
                  ? Brand.teal
                  : Brand.gold;

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
                  index > 0 && styles.skillDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.skillTopRow}>
                  <View style={styles.flex}>
                    <Text style={styles.skillName}>
                      {skill.skill || 'Learning skill'}
                    </Text>
                    <Text style={styles.skillSubject}>
                      {skill.subject || 'Learning'} ·{' '}
                      {skill.status || 'In progress'}
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
                        width: `${Math.max(4, level)}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyProgress}>
            <Text style={styles.emptyTitle}>
              Your skill progress will appear here
            </Text>
            <Text style={styles.skillSubject}>
              Work through lessons and quick checks to build mastery evidence.
            </Text>
          </View>
        )}
      </View>

      {/* Confidence Pulse */}
      <View style={styles.profileSummaryCard}>
        <View style={styles.confidenceHeader}>
          <View style={styles.flex}>
            <Text style={styles.profileEyebrow}>SELF-REPORTED CHECK-INS</Text>
            <Text style={styles.profileTitle}>Confidence pulse</Text>
          </View>
          {avgConfidence != null ? (
            <View style={styles.confidenceAvgBadge}>
              <Text style={styles.confidenceAvgText}>{avgConfidence}% avg</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.profileText}>
          Based on what you tell Kindling during lessons. Your answers are not graded as correct or incorrect unless a check provides evidence.
        </Text>

        {confidence.length ? (
          <View
            accessibilityLabel={`Confidence values ${confidence.join(', ')} percent`}
            style={styles.confidenceChart}
          >
            {confidence.slice(-10).map((value, index) => (
              <View key={`${index}-${value}`} style={styles.confidenceColumn}>
                <Text style={styles.confidenceValue}>{Math.round(value)}%</Text>
                <View style={styles.confidenceTrack}>
                  <View
                    style={[
                      styles.confidenceFill,
                      { height: `${Math.max(6, Math.min(100, value))}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.confidenceEmptyBox}>
            <Text style={styles.skillSubject}>
              No clear confidence cues yet. Kindling will learn from explicit check-ins during lessons.
            </Text>
          </View>
        )}

        {dashboard?.insights?.directives?.length ? (
          <View style={styles.insightCallout}>
            <Text style={styles.insightCalloutLabel}>ADAPTIVE PACING</Text>
            <Text style={styles.insightCalloutText}>
              {dashboard.insights.directives[0]}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Strengths & Practice Next */}
      <View style={styles.insightsRow}>
        <View style={[styles.insightBox, styles.insightBoxStrengths]}>
          <View style={styles.insightBoxHeader}>
            <View style={styles.insightBadgeGood}>
              <Text style={styles.insightBadgeGoodText}>✓</Text>
            </View>
            <Text style={styles.profileTitle}>Strengths</Text>
          </View>
          {dashboard?.strengths?.length ? (
            dashboard.strengths.map((item, index) => (
              <View key={`${item.label}-${index}`} style={styles.insightItemRow}>
                <Text style={styles.insightItemTitle}>{item.label}</Text>
                {item.hint ? (
                  <Text style={styles.insightItemHint}>{item.hint}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.skillSubject}>
              Strengths appear as you show understanding in lessons.
            </Text>
          )}
        </View>

        <View style={[styles.insightBox, styles.insightBoxFocus]}>
          <View style={styles.insightBoxHeader}>
            <View style={styles.insightBadgeFocus}>
              <Text style={styles.insightBadgeFocusText}>↗</Text>
            </View>
            <Text style={styles.profileTitle}>Practice next</Text>
          </View>
          {dashboard?.focusAreas?.length ? (
            dashboard.focusAreas.map((item, index) => (
              <Pressable
                key={`${item.label}-${index}`}
                accessibilityRole="button"
                onPress={() =>
                  openLesson('Practice', item.label || 'Focus topic')
                }
                style={({ pressed }) => [
                  styles.insightItemRow,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.insightFocusTitle}>{item.label} ›</Text>
                {item.hint ? (
                  <Text style={styles.insightItemHint}>{item.hint}</Text>
                ) : null}
              </Pressable>
            ))
          ) : (
            <Text style={styles.skillSubject}>
              Areas to practise will show when the learning data supports them.
            </Text>
          )}
        </View>
      </View>

      {/* Recent Learning */}
      <SectionTitle>Recent learning</SectionTitle>
      {dashboard?.recentActivity?.length ? (
        <View style={styles.skillsCard}>
          {dashboard.recentActivity.slice(0, 5).map((item, index) => (
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
                styles.activityRow,
                index > 0 && styles.skillDivider,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.activityIconBox}>
                <Text style={styles.activityIconGlyph}>▤</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.recentEyebrow}>
                  {(item.when || 'LESSON').toUpperCase()}
                  {item.subject ? `  ·  ${item.subject.toUpperCase()}` : ''}
                </Text>
                <Text style={styles.skillName}>
                  {item.title || 'Lesson session'}
                </Text>
                <Text style={styles.skillSubject}>
                  {item.detail || 'Keep learning to grow your profile.'}
                </Text>
              </View>
              <Text style={styles.activityChevron}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.skillsCard}>
          <View style={styles.emptyProgress}>
            <Text style={styles.emptyTitle}>No recent sessions yet</Text>
            <Text style={styles.skillSubject}>
              Your completed lesson sessions and practice checks will appear here.
            </Text>
          </View>
        </View>
      )}

      {/* Coming Up / Week Plan */}
      {dashboard?.weekPlan?.length ? (
        <>
          <SectionTitle>Coming up</SectionTitle>
          <View style={styles.skillsCard}>
            {dashboard.weekPlan.slice(0, 4).map((item, index) => (
              <Pressable
                key={`${item.day}-${item.title}-${index}`}
                accessibilityRole="button"
                onPress={() =>
                  openLesson(item.tag || 'Study plan', item.title || 'Lesson')
                }
                style={({ pressed }) => [
                  styles.activityRow,
                  index > 0 && styles.skillDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.planDayBadge}>
                  <Text style={styles.planDayText}>
                    {(item.day || 'DAY').slice(0, 3).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.recentEyebrow}>
                    {[item.tag, item.duration]
                      .filter(Boolean)
                      .join(' · ')
                      .toUpperCase()}
                  </Text>
                  <Text style={styles.skillName}>{item.title}</Text>
                  <Text style={styles.skillSubject}>{item.text}</Text>
                </View>
                <Text style={styles.activityChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.footerNote}>
        Small steps make strong foundations.
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 32,
    gap: 24,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
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
    letterSpacing: 0.85,
    fontWeight: '600',
  },
  hello: {
    fontSize: 28,
    letterSpacing: -0.8,
    fontWeight: '700',
    color: Brand.pine,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 99,
    padding: 4,
    paddingRight: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Brand.pine,
    fontWeight: '600',
    fontSize: 16,
  },
  avatarGradeText: {
    color: Brand.pine,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 80,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: Brand.pine,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: Brand.pineLight,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroLiveBadge: {
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
  heroLiveText: {
    color: '#D7ECE6',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  heroStreakPill: {
    backgroundColor: 'rgba(228,163,42,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  heroStreakText: {
    color: '#F7D288',
    fontSize: 11,
    fontWeight: '600',
  },
  heroCopy: {
    gap: 7,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 34,
    fontWeight: '600',
  },
  heroBody: {
    color: '#D6E3DE',
    fontSize: 14,
    lineHeight: 21,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
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

  /* Progress Section & 4-Tone KPI Grid */
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
  rangeToggle: {
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: 12,
    backgroundColor: Brand.subtle,
  },
  rangeButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 9,
  },
  rangeSelected: {
    backgroundColor: '#FFFFFF',
  },
  rangeText: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  rangeSelectedText: {
    color: Brand.pine,
    fontWeight: '600',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 118,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
    gap: 6,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconGlyph: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricLabel: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  metricValue: {
    color: Brand.ink,
    fontSize: 30,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  metricCaption: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '600',
  },

  /* Error Box */
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
    fontSize: 13,
    lineHeight: 19,
  },

  /* Pick Up With Kindling Card */
  pickupCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  pickupTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pickupSubjectBadge: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pickupSubjectText: {
    color: Brand.pine,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  pickupMetaText: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  pickupTitle: {
    color: Brand.pine,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 23,
  },
  pickupBody: {
    color: Brand.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  pickupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Brand.line,
    paddingTop: 10,
    marginTop: 2,
  },
  pickupFooterHint: {
    color: Brand.teal,
    fontSize: 12,
    fontWeight: '700',
  },
  pickupActionPill: {
    backgroundColor: Brand.pine,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 11,
  },
  pickupActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  /* Next Best Actions */
  nextActionsStack: {
    gap: 10,
  },
  nextActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 18,
    padding: 14,
  },
  nextActionBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Brand.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextActionBadgeText: {
    color: Brand.teal,
    fontSize: 17,
    fontWeight: '600',
  },
  nextActionEyebrow: {
    color: Brand.teal,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  nextActionTitle: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 1,
  },
  nextActionReason: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  nextActionCta: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Empty Card */
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 20,
    padding: 22,
    gap: 10,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    color: Brand.gold,
    fontSize: 25,
  },
  emptyTitle: {
    color: Brand.pine,
    fontSize: 17,
    fontWeight: '600',
  },
  emptyBody: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
  },

  /* Profile Summary Card */
  profileSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  profileEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  profileTitle: {
    color: Brand.pine,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 1,
  },
  profileViewPill: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  profileLink: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '600',
  },
  profileTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileTagChip: {
    backgroundColor: '#F3F7F5',
    borderWidth: 1,
    borderColor: '#DFE8E3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  profileTagText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
  },
  profileGoalRow: {
    backgroundColor: Brand.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAE6DA',
    padding: 12,
    gap: 3,
  },
  profileGoalLabel: {
    color: Brand.muted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  profileGoalValue: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '700',
  },
  profileInterestsText: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  profileText: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  insightCallout: {
    backgroundColor: Brand.tealPale,
    borderRadius: 14,
    padding: 12,
    gap: 3,
  },
  insightCalloutLabel: {
    color: Brand.teal,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  insightCalloutText: {
    color: Brand.pine,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },

  /* Skill Mastery Card */
  skillsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  skillItem: {
    paddingVertical: 14,
    gap: 9,
  },
  skillDivider: {
    borderTopWidth: 1,
    borderTopColor: '#EEF1EE',
  },
  skillTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  skillName: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  skillSubject: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  skillPercentBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillPercentHigh: {
    backgroundColor: '#DDF0E5',
  },
  skillPercentMid: {
    backgroundColor: Brand.tealPale,
  },
  skillPercentLow: {
    backgroundColor: '#FDF3DC',
  },
  skillPercentText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    width: '100%',
    borderRadius: 99,
    backgroundColor: '#E9EFEB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  emptyProgress: {
    paddingVertical: 20,
    gap: 6,
  },

  /* Confidence Chart */
  confidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  confidenceAvgBadge: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  confidenceAvgText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '600',
  },
  confidenceChart: {
    height: 126,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 6,
    paddingTop: 10,
  },
  confidenceColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    height: '100%',
  },
  confidenceValue: {
    color: Brand.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  confidenceTrack: {
    width: '70%',
    height: '78%',
    borderRadius: 7,
    backgroundColor: '#E9EFEB',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  confidenceFill: {
    width: '100%',
    borderRadius: 7,
    backgroundColor: Brand.teal,
  },
  confidenceEmptyBox: {
    backgroundColor: '#F6F8F6',
    borderRadius: 13,
    padding: 12,
  },

  /* Strengths & Practice Next */
  insightsRow: {
    gap: 12,
  },
  insightBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  insightBoxStrengths: {
    backgroundColor: '#F2F9F6',
    borderColor: '#C6E0D4',
  },
  insightBoxFocus: {
    backgroundColor: '#FDF8EC',
    borderColor: '#EDD7A8',
  },
  insightBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  insightBadgeGood: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Brand.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBadgeGoodText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  insightBadgeFocus: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Brand.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBadgeFocusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  insightItemRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    padding: 11,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 3,
  },
  insightItemTitle: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '600',
  },
  insightFocusTitle: {
    color: '#7A4C05',
    fontSize: 14,
    fontWeight: '600',
  },
  insightItemHint: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
  },

  /* Recent Learning & Coming Up Rows */
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconGlyph: {
    color: Brand.pine,
    fontSize: 16,
    fontWeight: '600',
  },
  planDayBadge: {
    width: 44,
    height: 40,
    borderRadius: 13,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDayText: {
    color: Brand.teal,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  recentEyebrow: {
    color: Brand.teal,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  activityChevron: {
    color: Brand.muted,
    fontSize: 22,
    fontWeight: '600',
  },
  footerNote: {
    color: Brand.muted,
    textAlign: 'center',
    fontSize: 12,
    paddingTop: 4,
  },
});
