import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  AppScreen,
  BodyText,
  BrandMark,
  Button,
  Heading,
  SectionTitle,
} from '@/components/mobile-ui';
import { Brand } from '@/constants/brand';
import { isHigherEducation, LEARNING_STYLES } from '@/constants/learner-profile';
import { useSession } from '@/context/session';
import {
  deleteAccount,
  getLearningDashboard,
  getPlatformSubscription,
  getPushSettings,
  listAssessments,
  listBillingInvoices,
  listPlatformPlans,
  listSubjects,
  requestPlanInvoice,
  savePushSettings,
  type BillingInvoiceItem,
  type PlanCatalogItem,
  type PlatformSubscription,
  type PushNotificationSettings,
} from '@/services/api';
import {
  formatReminderTime,
  getDeviceName,
  getNotificationPermissionStatus,
  REMINDER_TIME_PRESETS,
  requestNotificationPermissions,
  syncLocalReminderSchedule,
  triggerTestReminderNotification,
} from '@/services/notifications';

const AVATAR_MAP: Record<string, { label: string; icon: string }> = {
  sparkles: { label: 'Sparkles', icon: '✦' },
  rocket: { label: 'Rocket', icon: '🚀' },
  flame: { label: 'Flame', icon: '🔥' },
  bot: { label: 'Robot', icon: '🤖' },
  compass: { label: 'Explorer', icon: '🧭' },
};

const FALLBACK_PLANS: PlanCatalogItem[] = [
  {
    id: 'spark',
    name: 'Spark',
    tagline: "30-day trial of Kindling's adaptive tutor",
    priceMonthly: 0,
    priceYearly: 0,
    trialDays: 30,
    features: [
      'Full teaching system for 30 days',
      'Live adaptive lessons (daily platform-AI request and usage cap)',
      'Student dashboard & mastery pulse',
      'Then choose Forge or Ember to continue',
    ],
    entitlements: {
      platformAi: true,
      byok: true,
      dailyLessonSoftCap: 4,
      dailyPlatformAiRequests: 250,
      dailyPlatformAiTokens: 1000000,
    },
  },
  {
    id: 'forge',
    name: 'Forge',
    tagline: 'Rent the algorithm — bring your own AI keys',
    priceMonthly: 30,
    priceYearly: 300,
    features: [
      'Kindling teaching system (algorithm rent)',
      'You pay AI tokens via your own keys (BYOK)',
      'Multi-provider routing (Gemini, OpenAI, Anthropic, Groq, OpenRouter)',
      'Per-task model routing · homework photo · digests',
    ],
    entitlements: {
      platformAi: false,
      byok: true,
      multiProvider: true,
      advancedRouting: true,
      familyDigest: true,
      dailyPlatformAiRequests: 0,
      dailyPlatformAiTokens: 0,
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    tagline: 'Nightly tutoring with platform AI included',
    priceMonthly: 99,
    priceYearly: 990,
    highlight: true,
    features: [
      'Everything in the teaching system',
      'Platform AI included (daily request and usage cap)',
      'Homework photo help · guardian digests',
      'BYOK optional · priority support',
    ],
    entitlements: {
      platformAi: true,
      byok: true,
      multiProvider: true,
      advancedRouting: true,
      familyDigest: true,
      prioritySupport: true,
      dailyPlatformAiRequests: 500,
      dailyPlatformAiTokens: 2000000,
    },
  },
];

function resolveAvatar(avatarId?: string | null) {
  if (!avatarId) return { label: 'Sparkles', icon: '✦' };
  const key = avatarId.trim().toLowerCase();
  if (AVATAR_MAP[key]) return AVATAR_MAP[key];
  return { label: avatarId, icon: '✦' };
}

function resolveLearningStyle(styleId?: string | null) {
  if (!styleId) {
    return {
      label: 'Visual & diagrams',
      detail: 'Pictures, charts, and spatial models',
    };
  }
  const found = LEARNING_STYLES.find(
    (item) =>
      item.id.toLowerCase() === styleId.trim().toLowerCase() ||
      item.label.toLowerCase() === styleId.trim().toLowerCase(),
  );
  if (found) return found;
  return {
    label: styleId,
    detail: 'Personalized explanations adapted to your pace',
  };
}

function getPlanGlyph(planId?: string) {
  const key = (planId || 'spark').toLowerCase();
  if (key === 'ember') return '🔥';
  if (key === 'forge') return '⚒';
  return '✦';
}

function formatPlanPrice(plan?: PlanCatalogItem | null, cycle?: string) {
  if (!plan || plan.id === 'spark' || (plan.priceMonthly === 0 && plan.priceYearly === 0)) {
    return 'Free · 30-day trial';
  }
  if (cycle === 'yearly') {
    return `$${plan.priceYearly} / year`;
  }
  return `$${plan.priceMonthly} / month`;
}

function formatShortDate(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTokenCount(tokens?: number) {
  const count = Number(tokens) || 0;
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(count >= 100_000 ? 0 : 1)}k`;
  }
  return `${count}`;
}

export default function ProfileScreen() {
  const { profile, session, signOut, refreshProfile } = useSession();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Subscription & plans state
  const [subscription, setSubscription] = useState<PlatformSubscription | null>(null);
  const [plans, setPlans] = useState<PlanCatalogItem[]>(FALLBACK_PLANS);
  const [invoices, setInvoices] = useState<BillingInvoiceItem[]>([]);
  const [subLoading, setSubLoading] = useState(true);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [requestingPlan, setRequestingPlan] = useState<string | null>(null);
  const [planNotice, setPlanNotice] = useState('');
  const [planError, setPlanError] = useState('');

  // Push notifications & study reminder state
  const [pushSettings, setPushSettings] = useState<PushNotificationSettings>({
    pushEnabled: profile?.pushEnabled ?? true,
    dailyReminderEnabled: profile?.dailyReminderEnabled ?? true,
    streakReminderEnabled: profile?.streakReminderEnabled ?? true,
    reminderHour: profile?.reminderHour ?? 17,
    reminderMinute: profile?.reminderMinute ?? 0,
    devices: [],
  });
  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'undetermined' | 'unsupported'
  >('undetermined');
  const [pushSaving, setPushSaving] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState('');
  const [pushError, setPushError] = useState('');

  const [stats, setStats] = useState({
    subjectsCount: 0,
    assessmentsCount: 0,
    sessionsValue: '0',
    accuracyValue: null as number | null,
  });

  const loadSnapshot = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true);
      try {
        const [
          subjectsRes,
          assessmentsRes,
          dashRes,
          subRes,
          plansRes,
          invoicesRes,
          pushRes,
          permRes,
        ] = await Promise.allSettled([
          listSubjects(),
          listAssessments(),
          getLearningDashboard(),
          getPlatformSubscription(),
          listPlatformPlans(),
          listBillingInvoices(),
          getPushSettings(),
          getNotificationPermissionStatus(),
          isPull ? refreshProfile() : Promise.resolve(),
        ]);

        const subjectsCount =
          subjectsRes.status === 'fulfilled' ? subjectsRes.value.length : 0;
        const assessmentsCount =
          assessmentsRes.status === 'fulfilled' ? assessmentsRes.value.length : 0;
        const dash = dashRes.status === 'fulfilled' ? dashRes.value : null;
        const sessionsValue = dash?.weekStats?.this?.sessions?.value || '0';
        const accuracyValue =
          dash?.insights?.stats?.accuracy != null
            ? Math.round(dash.insights.stats.accuracy)
            : null;

        setStats({
          subjectsCount,
          assessmentsCount,
          sessionsValue,
          accuracyValue,
        });

        if (subRes.status === 'fulfilled' && subRes.value) {
          setSubscription(subRes.value);
          if (subRes.value.billing_cycle === 'yearly') {
            setSelectedCycle('yearly');
          }
        }
        if (plansRes.status === 'fulfilled' && plansRes.value.length > 0) {
          setPlans(plansRes.value);
        }
        if (invoicesRes.status === 'fulfilled') {
          setInvoices(invoicesRes.value);
        }
        if (pushRes.status === 'fulfilled' && pushRes.value) {
          setPushSettings(pushRes.value);
        }
        if (permRes.status === 'fulfilled') {
          setPermissionStatus(permRes.value);
        }
      } finally {
        setSubLoading(false);
        if (isPull) setRefreshing(false);
      }
    },
    [refreshProfile],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSnapshot(false);
    }, [loadSnapshot]),
  );

  const handleRequestUpgrade = async (planId: 'forge' | 'ember') => {
    if (requestingPlan) return;
    setRequestingPlan(planId);
    setPlanError('');
    setPlanNotice('');
    try {
      const invoice = await requestPlanInvoice(planId, selectedCycle);
      setInvoices((prev) => {
        const filtered = prev.filter((item) => item.id !== invoice.id);
        return [invoice, ...filtered];
      });
      setPlanNotice(
        `Invoice ${invoice.invoice_number} requested for ${invoice.plan_name} (${selectedCycle}).`,
      );
    } catch (cause) {
      setPlanError(
        cause instanceof Error
          ? cause.message
          : 'Could not request an upgrade invoice right now.',
      );
    } finally {
      setRequestingPlan(null);
    }
  };

  const applyPushUpdate = async (
    updates: Partial<PushNotificationSettings>,
    requestPermsIfNeeded = false,
  ) => {
    setPushSaving(true);
    setPushError('');
    setPushFeedback('');
    const nextState: PushNotificationSettings = {
      ...pushSettings,
      ...updates,
    };
    setPushSettings(nextState);

    try {
      let tokenToRegister: string | undefined;
      if (
        (requestPermsIfNeeded || nextState.pushEnabled) &&
        Platform.OS !== 'web'
      ) {
        const perm = await requestNotificationPermissions();
        setPermissionStatus(perm.status);
        if (perm.expoPushToken) {
          tokenToRegister = perm.expoPushToken;
        }
      }

      const saved = await savePushSettings({
        pushEnabled: nextState.pushEnabled,
        dailyReminderEnabled: nextState.dailyReminderEnabled,
        streakReminderEnabled: nextState.streakReminderEnabled,
        reminderHour: nextState.reminderHour,
        reminderMinute: nextState.reminderMinute,
        ...(tokenToRegister
          ? {
              expoPushToken: tokenToRegister,
              platform: Platform.OS,
              deviceName: getDeviceName(),
            }
          : {}),
      });
      setPushSettings(saved);
      await syncLocalReminderSchedule(
        saved,
        profile?.name || session?.name,
        profile?.goal,
      );
      setPushFeedback(
        saved.pushEnabled
          ? `Reminders scheduled for ${formatReminderTime(
              saved.reminderHour,
              saved.reminderMinute,
            )}.`
          : 'Push notifications paused.',
      );
    } catch (cause) {
      setPushError(
        cause instanceof Error
          ? cause.message
          : 'Could not save your notification settings.',
      );
    } finally {
      setPushSaving(false);
    }
  };

  const stepReminderTime = (deltaMinutes: number) => {
    const currentTotal =
      (pushSettings.reminderHour || 0) * 60 + (pushSettings.reminderMinute || 0);
    const nextTotal = (currentTotal + deltaMinutes + 1440) % 1440;
    const nextHour = Math.floor(nextTotal / 60);
    const nextMinute = nextTotal % 60;
    void applyPushUpdate({
      reminderHour: nextHour,
      reminderMinute: nextMinute,
    });
  };

  const handleTestNotification = async () => {
    if (testingPush) return;
    setTestingPush(true);
    setPushError('');
    setPushFeedback('');
    try {
      const result = await triggerTestReminderNotification(
        profile?.name || session?.name,
        profile?.goal,
      );
      const latestPerm = await getNotificationPermissionStatus();
      setPermissionStatus(latestPerm);
      setPushFeedback(result.message);
    } catch (cause) {
      setPushError(
        cause instanceof Error
          ? cause.message
          : 'Could not send a test notification.',
      );
    } finally {
      setTestingPush(false);
    }
  };

  const logout = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  const removeAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      await deleteAccount();
      await signOut();
      setConfirmDelete(false);
      router.replace('/sign-in');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not delete this account. Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const learnerName = profile?.name || session?.name || 'Learner';
  const avatarInfo = resolveAvatar(profile?.avatar);
  const styleInfo = resolveLearningStyle(profile?.learningStyle);
  const higherEd = isHigherEducation(profile?.grade || '');
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];

  const completeness = useMemo(() => {
    const checks = [
      Boolean((profile?.name || session?.name)?.trim()),
      Boolean(profile?.grade?.trim()),
      Boolean(profile?.avatar?.trim()),
      Boolean(profile?.country?.trim()),
      Boolean(profile?.curriculum?.trim()),
      Boolean(profile?.preferredLanguage?.trim()),
      Boolean(profile?.schoolName?.trim()),
      Boolean(profile?.learningStyle?.trim()),
      interests.length > 0,
      Boolean(profile?.goal?.trim()),
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }, [profile, session?.name, interests.length]);

  // Active subscription display data
  const activePlanId = (subscription?.plan || 'spark').toLowerCase();
  const activePlanDetail =
    subscription?.planDetail ||
    plans.find((p) => p.id === activePlanId) ||
    FALLBACK_PLANS[0];
  const activeStatus = (subscription?.status || 'active').toLowerCase();
  const dailyUsage = subscription?.platform_ai_daily_usage;
  const pendingInvoice = useMemo(
    () => invoices.find((inv) => inv.status === 'requested') || null,
    [invoices],
  );
  const periodStartFormatted = formatShortDate(subscription?.current_period_start);
  const periodEndFormatted = formatShortDate(subscription?.current_period_end);

  return (
    <>
      <AppScreen
        scroll
        contentStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadSnapshot(true)}
            tintColor={Brand.teal}
            colors={[Brand.teal]}
          />
        }
      >
        {/* Top Header Row */}
        <View style={styles.topline}>
          <BrandMark size={42} />
          <View style={styles.greeting}>
            <Text style={styles.eyebrow}>ACCOUNT & PERSONALIZATION</Text>
            <Text style={styles.hello}>Your Profile</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit learner profile"
            onPress={() => router.push('/onboarding')}
            style={({ pressed }) => [styles.editTopButton, pressed && styles.pressed]}
          >
            <Text style={styles.editTopButtonText}>✎ Edit</Text>
          </Pressable>
        </View>

        {/* Learner Identity Hero Card */}
        <View style={styles.identityHero}>
          <View style={styles.identityTopRow}>
            <View style={styles.avatarMedallion}>
              <Text style={styles.avatarEmoji}>{avatarInfo.icon}</Text>
            </View>
            <View style={styles.identityCopy}>
              <View style={styles.identityBadgeRow}>
                <View style={styles.gradeBadge}>
                  <Text style={styles.gradeBadgeText}>
                    {profile?.grade || 'Set your grade'}
                  </Text>
                </View>
                <View style={styles.heroPlanChip}>
                  <Text style={styles.heroPlanChipText}>
                    {getPlanGlyph(activePlanId)}{' '}
                    {(subscription?.planName || activePlanDetail.name).toUpperCase()} PLAN
                  </Text>
                </View>
                {profile?.country ? (
                  <View style={styles.countryBadge}>
                    <Text style={styles.countryBadgeText}>
                      {profile.countryFlag ? `${profile.countryFlag} ` : ''}
                      {profile.country}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.learnerName}>{learnerName}</Text>
              {session?.email ? (
                <Text style={styles.learnerEmail}>{session.email}</Text>
              ) : null}
              {profile?.schoolName || profile?.curriculum ? (
                <Text numberOfLines={1} style={styles.learnerSubMeta}>
                  {[profile?.schoolName, profile?.curriculum]
                    .filter(Boolean)
                    .join('  ·  ')}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Profile Completeness Bar */}
          <View style={styles.completenessBox}>
            <View style={styles.completenessHeader}>
              <Text style={styles.completenessLabel}>
                PERSONALIZATION PROFILE
              </Text>
              <Text style={styles.completenessPercent}>{completeness}% complete</Text>
            </View>
            <View style={styles.completenessTrack}>
              <View
                style={[
                  styles.completenessFill,
                  { width: `${Math.max(10, completeness)}%` },
                ]}
              />
            </View>
            <Text style={styles.completenessHint}>
              {completeness >= 90
                ? 'Kindling has everything needed to tailor explanations and examples to you.'
                : 'Add your interests, goal, or curriculum so Kindling can tailor examples to you.'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/onboarding')}
            style={({ pressed }) => [styles.heroEditBtn, pressed && styles.pressed]}
          >
            <Text style={styles.heroEditBtnText}>
              Customize learner details →
            </Text>
          </Pressable>
        </View>

        {/* 3-Card Learning Snapshot Strip */}
        <View style={styles.kpiRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/learn')}
            style={({ pressed }) => [
              styles.kpiCard,
              styles.kpiTeal,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.kpiLabel}>SUBJECTS</Text>
            <Text style={styles.kpiValue}>{stats.subjectsCount}</Text>
            <Text style={styles.kpiSub}>learning paths ›</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/')}
            style={({ pressed }) => [
              styles.kpiCard,
              styles.kpiPine,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.kpiLabel}>SESSIONS</Text>
            <Text style={styles.kpiValue}>{stats.sessionsValue}</Text>
            <Text style={styles.kpiSub}>this week ›</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/assessments')}
            style={({ pressed }) => [
              styles.kpiCard,
              styles.kpiGold,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.kpiLabel}>ASSESSMENTS</Text>
            <Text style={styles.kpiValue}>{stats.assessmentsCount}</Text>
            <Text style={styles.kpiSub}>
              {stats.accuracyValue != null
                ? `${stats.accuracyValue}% accuracy ›`
                : 'practice hub ›'}
            </Text>
          </Pressable>
        </View>

        {/* ================================================================
         * STUDENT SUBSCRIPTION & AI ALLOWANCE SECTION
         * ================================================================ */}
        <SectionTitle
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPlanError('');
                setPlanNotice('');
                setShowPlansModal(true);
              }}
              hitSlop={8}
            >
              <Text style={styles.sectionActionLink}>Compare plans ›</Text>
            </Pressable>
          }
        >
          Your subscription
        </SectionTitle>

        <View style={styles.subscriptionCard}>
          {/* Top Accent Strip */}
          <View
            style={[
              styles.subAccentBar,
              activePlanId === 'ember'
                ? styles.subAccentEmber
                : activePlanId === 'forge'
                  ? styles.subAccentForge
                  : styles.subAccentSpark,
            ]}
          />

          <View style={styles.subCardContent}>
            {subLoading && !subscription ? (
              <View style={styles.subLoadingRow}>
                <ActivityIndicator size="small" color={Brand.teal} />
                <Text style={styles.subLoadingText}>
                  Checking your subscription plan…
                </Text>
              </View>
            ) : null}

            {/* Plan Header Row */}
            <View style={styles.subHeaderRow}>
              <View
                style={[
                  styles.subPlanIconBox,
                  activePlanId === 'ember'
                    ? styles.subIconEmber
                    : activePlanId === 'forge'
                      ? styles.subIconForge
                      : styles.subIconSpark,
                ]}
              >
                <Text style={styles.subPlanGlyph}>{getPlanGlyph(activePlanId)}</Text>
              </View>

              <View style={styles.flex}>
                <View style={styles.subTitleBadgeRow}>
                  <Text style={styles.subEyebrow}>
                    {activePlanId === 'spark'
                      ? 'STARTER TRIAL PLAN'
                      : activePlanId === 'forge'
                        ? 'BYOK ALGORITHM PLAN'
                        : 'ALL-INCLUSIVE PLAN'}
                  </Text>
                  <View
                    style={[
                      styles.subStatusPill,
                      activeStatus === 'past_due' || activeStatus === 'canceled'
                        ? styles.subStatusWarn
                        : styles.subStatusActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.subStatusDot,
                        activeStatus === 'past_due' || activeStatus === 'canceled'
                          ? styles.subStatusDotWarn
                          : styles.subStatusDotActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.subStatusText,
                        activeStatus === 'past_due' || activeStatus === 'canceled'
                          ? styles.subStatusTextWarn
                          : styles.subStatusTextActive,
                      ]}
                    >
                      {subscription?.cancel_at_period_end
                        ? 'ENDING SOON'
                        : activeStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.subNamePriceRow}>
                  <Text style={styles.subPlanName}>
                    Kindling {subscription?.planName || activePlanDetail.name}
                  </Text>
                  <Text style={styles.subPlanPrice}>
                    {formatPlanPrice(
                      activePlanDetail,
                      subscription?.billing_cycle || 'monthly',
                    )}
                  </Text>
                </View>

                <Text style={styles.subTagline}>{activePlanDetail.tagline}</Text>
              </View>
            </View>

            {/* Billing Cycle & Period Meta Pills */}
            <View style={styles.subMetaRow}>
              <View style={styles.subMetaPill}>
                <Text style={styles.subMetaLabel}>BILLING</Text>
                <Text style={styles.subMetaValue}>
                  {activePlanId === 'spark'
                    ? '30-day complimentary trial'
                    : subscription?.billing_cycle === 'yearly'
                      ? 'Annual billing'
                      : 'Monthly billing'}
                </Text>
              </View>

              {periodEndFormatted || periodStartFormatted ? (
                <View style={styles.subMetaPill}>
                  <Text style={styles.subMetaLabel}>
                    {periodEndFormatted
                      ? subscription?.cancel_at_period_end
                        ? 'ENDS ON'
                        : 'RENEWS ON'
                      : 'STARTED'}
                  </Text>
                  <Text style={styles.subMetaValue}>
                    {periodEndFormatted || periodStartFormatted}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Daily Platform AI Usage Meter */}
            {dailyUsage && dailyUsage.limit > 0 ? (
              <View
                style={[
                  styles.usageBox,
                  dailyUsage.softWarning && styles.usageBoxWarn,
                ]}
              >
                <View style={styles.usageTopRow}>
                  <Text style={styles.usageLabel}>DAILY AI TUTOR ALLOWANCE</Text>
                  <Text style={styles.usageCountText}>
                    {dailyUsage.used} / {dailyUsage.limit} requests
                  </Text>
                </View>

                <View style={styles.usageTrack}>
                  <View
                    style={[
                      styles.usageFill,
                      dailyUsage.softWarning && styles.usageFillWarn,
                      {
                        width: `${Math.min(
                          100,
                          Math.max(
                            3,
                            Math.round((dailyUsage.used / dailyUsage.limit) * 100),
                          ),
                        )}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.usageBottomRow}>
                  <Text style={styles.usageCaption}>
                    {dailyUsage.remaining} requests left today
                  </Text>
                  <Text style={styles.usageCaption}>
                    {formatTokenCount(dailyUsage.estimatedTokensUsed)} /{' '}
                    {formatTokenCount(dailyUsage.estimatedTokenLimit)} tokens · resets{' '}
                    {dailyUsage.resetsAt}
                  </Text>
                </View>
              </View>
            ) : activePlanId === 'forge' ? (
              <View style={styles.byokBox}>
                <Text style={styles.byokTitle}>
                  ⚒ Bring Your Own Key (BYOK) Active
                </Text>
                <Text style={styles.byokBody}>
                  Your Forge subscription unlocks multi-provider AI routing with your own provider API keys.
                </Text>
              </View>
            ) : null}

            {/* Included Plan Features */}
            <View style={styles.subFeaturesList}>
              <Text style={styles.subFeaturesHeading}>INCLUDED IN YOUR PLAN</Text>
              {(activePlanDetail.features || []).map((feature) => (
                <View key={feature} style={styles.subFeatureRow}>
                  <View style={styles.subFeatureCheck}>
                    <Text style={styles.subFeatureCheckText}>✓</Text>
                  </View>
                  <Text style={styles.subFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Pending Upgrade Invoice Notice */}
            {pendingInvoice ? (
              <View style={styles.invoiceNoticeBox}>
                <View style={styles.invoiceNoticeHeader}>
                  <Text style={styles.invoiceNoticeEyebrow}>
                    UPGRADE INVOICE REQUESTED
                  </Text>
                  <Text style={styles.invoiceNumberText}>
                    {pendingInvoice.invoice_number}
                  </Text>
                </View>
                <Text style={styles.invoiceNoticeBody}>
                  {pendingInvoice.plan_name} ({pendingInvoice.billing_cycle}) · $
                  {pendingInvoice.amount} {pendingInvoice.currency} — awaiting payment confirmation.
                </Text>
              </View>
            ) : null}

            {/* Action Footer */}
            <View style={styles.subActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPlanError('');
                  setPlanNotice('');
                  setShowPlansModal(true);
                }}
                style={({ pressed }) => [
                  styles.subManageBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.subManageBtnText}>
                  {activePlanId === 'spark'
                    ? 'Upgrade to Forge or Ember →'
                    : 'Manage or switch plan →'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ================================================================
         * STUDY REMINDERS & PUSH NOTIFICATIONS SECTION
         * ================================================================ */}
        <SectionTitle
          action={
            <View
              style={[
                styles.subStatusPill,
                pushSettings.pushEnabled && permissionStatus === 'granted'
                  ? styles.subStatusActive
                  : styles.pushStatusNeutral,
              ]}
            >
              <View
                style={[
                  styles.subStatusDot,
                  pushSettings.pushEnabled && permissionStatus === 'granted'
                    ? styles.subStatusDotActive
                    : styles.pushStatusDotNeutral,
                ]}
              />
              <Text
                style={[
                  styles.subStatusText,
                  pushSettings.pushEnabled && permissionStatus === 'granted'
                    ? styles.subStatusTextActive
                    : styles.pushStatusTextNeutral,
                ]}
              >
                {Platform.OS === 'web'
                  ? 'MOBILE APP'
                  : !pushSettings.pushEnabled
                    ? 'PAUSED'
                    : permissionStatus === 'granted'
                      ? 'ACTIVE'
                      : 'PERMISSION NEEDED'}
              </Text>
            </View>
          }
        >
          Reminders & notifications
        </SectionTitle>

        <View style={styles.pushCard}>
          {/* Master Enable Row */}
          <View style={styles.pushMasterRow}>
            <View style={styles.pushIconBadge}>
              <Text style={styles.pushIconGlyph}>🔔</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.pushMasterTitle}>Push notifications</Text>
              <Text style={styles.pushMasterSub}>
                Daily study nudges, streak reminders, and Expo push alerts
              </Text>
            </View>
            <Switch
              value={pushSettings.pushEnabled}
              disabled={pushSaving}
              onValueChange={(value) =>
                void applyPushUpdate({ pushEnabled: value }, value)
              }
              trackColor={{ false: '#D5DCD8', true: Brand.teal }}
              thumbColor="#FFFFFF"
            />
          </View>

          {Platform.OS !== 'web' &&
          pushSettings.pushEnabled &&
          permissionStatus !== 'granted' ? (
            <View style={styles.pushPermBanner}>
              <View style={styles.flex}>
                <Text style={styles.pushPermTitle}>
                  Allow notifications on this device
                </Text>
                <Text style={styles.pushPermBody}>
                  Grant notification permission so Kindling can deliver your daily study and streak reminders.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => void applyPushUpdate({ pushEnabled: true }, true)}
                style={({ pressed }) => [
                  styles.pushPermBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.pushPermBtnText}>Enable</Text>
              </Pressable>
            </View>
          ) : null}

          {pushSettings.pushEnabled ? (
            <>
              {/* Toggle Rows for Daily Study & Streak Reminders */}
              <View style={styles.pushTogglesGroup}>
                <View style={styles.pushToggleRow}>
                  <View style={styles.flex}>
                    <Text style={styles.pushToggleTitle}>
                      Daily study reminder
                    </Text>
                    <Text style={styles.pushToggleDesc}>
                      A friendly daily nudge at your chosen study time
                    </Text>
                  </View>
                  <Switch
                    value={pushSettings.dailyReminderEnabled}
                    disabled={pushSaving}
                    onValueChange={(value) =>
                      void applyPushUpdate({ dailyReminderEnabled: value })
                    }
                    trackColor={{ false: '#D5DCD8', true: Brand.teal }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.pushToggleRow, styles.pushToggleDivider]}>
                  <View style={styles.flex}>
                    <Text style={styles.pushToggleTitle}>
                      Streak saver nudge
                    </Text>
                    <Text style={styles.pushToggleDesc}>
                      Follow-up reminder to keep your learning streak alive
                    </Text>
                  </View>
                  <Switch
                    value={pushSettings.streakReminderEnabled}
                    disabled={pushSaving}
                    onValueChange={(value) =>
                      void applyPushUpdate({ streakReminderEnabled: value })
                    }
                    trackColor={{ false: '#D5DCD8', true: Brand.teal }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Customizable Daily Reminder Time Picker */}
              <View style={styles.reminderTimeBox}>
                <View style={styles.reminderTimeHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.reminderTimeEyebrow}>
                      PREFERRED REMINDER TIME
                    </Text>
                    <Text style={styles.reminderTimeValue}>
                      {formatReminderTime(
                        pushSettings.reminderHour,
                        pushSettings.reminderMinute,
                      )}
                    </Text>
                  </View>

                  <View style={styles.timeStepperRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Earlier by 30 minutes"
                      disabled={pushSaving}
                      onPress={() => stepReminderTime(-30)}
                      style={({ pressed }) => [
                        styles.timeStepBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.timeStepBtnText}>− 30m</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Later by 30 minutes"
                      disabled={pushSaving}
                      onPress={() => stepReminderTime(30)}
                      style={({ pressed }) => [
                        styles.timeStepBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.timeStepBtnText}>+ 30m</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.presetTimesGrid}>
                  {REMINDER_TIME_PRESETS.map((preset) => {
                    const isSelected =
                      pushSettings.reminderHour === preset.hour &&
                      pushSettings.reminderMinute === preset.minute;
                    return (
                      <Pressable
                        key={preset.id}
                        accessibilityRole="button"
                        disabled={pushSaving}
                        onPress={() =>
                          void applyPushUpdate({
                            reminderHour: preset.hour,
                            reminderMinute: preset.minute,
                          })
                        }
                        style={[
                          styles.timePresetChip,
                          isSelected && styles.timePresetChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timePresetLabel,
                            isSelected && styles.timePresetLabelActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                        <Text
                          style={[
                            styles.timePresetSub,
                            isSelected && styles.timePresetSubActive,
                          ]}
                        >
                          {preset.sublabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          ) : null}

          {pushFeedback ? (
            <View style={styles.pushFeedbackBox}>
              <Text style={styles.pushFeedbackText}>✓  {pushFeedback}</Text>
            </View>
          ) : null}

          {pushError ? (
            <View style={styles.planErrorBox}>
              <Text style={styles.error}>{pushError}</Text>
            </View>
          ) : null}

          {/* Registered Devices & Test Notification Footer */}
          <View style={styles.pushFooterRow}>
            <Text style={styles.pushDeviceMetaText}>
              {pushSettings.devices.length > 0
                ? `${pushSettings.devices.length} registered ${
                    pushSettings.devices.length === 1 ? 'device' : 'devices'
                  } · Expo Push`
                : 'Local & Expo Push ready'}
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={testingPush}
              onPress={() => void handleTestNotification()}
              style={({ pressed }) => [
                styles.testPushBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.testPushBtnText}>
                {testingPush ? 'Sending…' : 'Send test notification'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* How Kindling Teaches You */}
        <SectionTitle
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/onboarding')}
              hitSlop={8}
            >
              <Text style={styles.sectionActionLink}>Change ›</Text>
            </Pressable>
          }
        >
          Your learning preferences
        </SectionTitle>

        <View style={styles.teachingCard}>
          {/* Main Goal Highlight */}
          <View style={styles.goalBanner}>
            <View style={styles.goalIconBox}>
              <Text style={styles.goalIconGlyph}>🎯</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.goalEyebrow}>MAIN LEARNING GOAL</Text>
              <Text style={styles.goalTitle}>
                {profile?.goal?.trim() || 'Build confidence one lesson at a time'}
              </Text>
            </View>
          </View>

          <View style={styles.teachingGrid}>
            <View style={styles.teachingTile}>
              <Text style={styles.teachingTileEyebrow}>EXPLANATION STYLE</Text>
              <Text style={styles.teachingTileTitle}>{styleInfo.label}</Text>
              <Text style={styles.teachingTileDetail}>{styleInfo.detail}</Text>
            </View>

            <View style={styles.teachingTile}>
              <Text style={styles.teachingTileEyebrow}>TUTORING LANGUAGE</Text>
              <Text style={styles.teachingTileTitle}>
                {profile?.preferredLanguage?.trim() || 'English'}
              </Text>
              <Text style={styles.teachingTileDetail}>
                Primary language used in lessons and feedback
              </Text>
            </View>
          </View>
        </View>

        {/* Interests & Example Themes */}
        <SectionTitle
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/onboarding')}
              hitSlop={8}
            >
              <Text style={styles.sectionActionLink}>
                {interests.length > 0 ? 'Edit ›' : '＋ Add ›'}
              </Text>
            </Pressable>
          }
        >
          Your interests
        </SectionTitle>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardIntro}>
            Kindling weaves these topics into real-world analogies and practice problems.
          </Text>
          {interests.length > 0 ? (
            <View style={styles.interestsWrap}>
              {interests.map((interest) => (
                <View key={interest} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{interest}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/onboarding')}
              style={({ pressed }) => [
                styles.emptyInterestsPrompt,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.emptyInterestsTitle}>
                ＋ Pick up to 6 interests you enjoy
              </Text>
              <Text style={styles.emptyInterestsSub}>
                Sports, space, music, coding, nature, and more
              </Text>
            </Pressable>
          )}
        </View>

        {/* Academic & Regional Details */}
        <SectionTitle>Academic details</SectionTitle>

        <View style={styles.detailsCard}>
          <ProfileRow
            icon="🎓"
            label="GRADE OR STUDY LEVEL"
            value={profile?.grade}
            placeholder="Not set — tap Edit to choose your level"
          />
          <ProfileRow
            icon="🧭"
            label={higherEd ? 'PROGRAMME TRACK' : 'CURRICULUM'}
            value={profile?.curriculum}
            placeholder="Standard / General curriculum"
          />
          <ProfileRow
            icon="🏫"
            label={higherEd ? 'UNIVERSITY / COLLEGE' : 'SCHOOL'}
            value={profile?.schoolName}
            placeholder="Not set"
          />
          <ProfileRow
            icon="🌍"
            label="COUNTRY / REGION"
            value={
              profile?.country
                ? `${profile.countryFlag ? `${profile.countryFlag} ` : ''}${profile.country}`
                : ''
            }
            placeholder="Not set"
          />
          <ProfileRow
            icon={avatarInfo.icon}
            label="AVATAR PERSONA"
            value={avatarInfo.label}
            isLast
          />
        </View>

        {/* Account Actions */}
        <SectionTitle>Account</SectionTitle>

        <View style={styles.actionsStack}>
          <Button
            variant="secondary"
            onPress={() => router.push('/onboarding')}
          >
            Update learner details
          </Button>

          <Pressable
            accessibilityRole="button"
            onPress={() => void logout()}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          >
            <Text style={styles.logoutButtonText}>Log out of Kindling</Text>
          </Pressable>
        </View>

        {/* Separated Danger Zone */}
        <View style={styles.dangerCard}>
          <View style={styles.flex}>
            <Text style={styles.dangerTitle}>Delete account & data</Text>
            <Text style={styles.dangerSubtitle}>
              Permanently remove your profile, subjects, and saved progress.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setError('');
              setConfirmDelete(true);
            }}
            style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
          >
            <Text style={styles.dangerButtonText}>Delete…</Text>
          </Pressable>
        </View>
      </AppScreen>

      {/* ====================================================================
       * MODAL 1: COMPARE & UPGRADE SUBSCRIPTION PLANS
       * ==================================================================== */}
      <Modal
        visible={showPlansModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlansModal(false)}
      >
        <View style={styles.sheetShade}>
          <View style={styles.plansSheet}>
            <View style={styles.plansSheetHeader}>
              <View style={styles.flex}>
                <Text style={styles.plansSheetEyebrow}>KINDLING MEMBERSHIP</Text>
                <Text style={styles.plansSheetTitle}>Subscription Plans</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close subscription plans"
                onPress={() => setShowPlansModal(false)}
                style={styles.sheetCloseBtn}
              >
                <Text style={styles.sheetCloseText}>×</Text>
              </Pressable>
            </View>

            {/* Billing Cycle Switcher */}
            <View style={styles.cycleToggleWrap}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: selectedCycle === 'monthly' }}
                onPress={() => setSelectedCycle('monthly')}
                style={[
                  styles.cycleTab,
                  selectedCycle === 'monthly' && styles.cycleTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.cycleTabText,
                    selectedCycle === 'monthly' && styles.cycleTabTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: selectedCycle === 'yearly' }}
                onPress={() => setSelectedCycle('yearly')}
                style={[
                  styles.cycleTab,
                  selectedCycle === 'yearly' && styles.cycleTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.cycleTabText,
                    selectedCycle === 'yearly' && styles.cycleTabTextActive,
                  ]}
                >
                  Yearly · Save 2 months
                </Text>
              </Pressable>
            </View>

            {planNotice ? (
              <View style={styles.planSuccessBox}>
                <Text style={styles.planSuccessText}>{planNotice}</Text>
              </View>
            ) : null}

            {planError ? (
              <View style={styles.planErrorBox}>
                <Text style={styles.error}>{planError}</Text>
              </View>
            ) : null}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.plansScrollContent}
            >
              {plans.map((plan) => {
                const isCurrent = plan.id === activePlanId;
                const isPaid = plan.id === 'forge' || plan.id === 'ember';
                const price =
                  selectedCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

                return (
                  <View
                    key={plan.id}
                    style={[
                      styles.planOptionCard,
                      plan.highlight && styles.planOptionHighlight,
                      isCurrent && styles.planOptionCurrent,
                    ]}
                  >
                    <View style={styles.planOptionTop}>
                      <View style={styles.planOptionTitleWrap}>
                        <View style={styles.planOptionBadgeRow}>
                          <Text style={styles.planOptionGlyph}>
                            {getPlanGlyph(plan.id)}
                          </Text>
                          <Text style={styles.planOptionName}>{plan.name}</Text>
                          {isCurrent ? (
                            <View style={styles.currentPlanBadge}>
                              <Text style={styles.currentPlanBadgeText}>
                                CURRENT PLAN
                              </Text>
                            </View>
                          ) : plan.highlight ? (
                            <View style={styles.recommendedPlanBadge}>
                              <Text style={styles.recommendedPlanBadgeText}>
                                MOST POPULAR
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.planOptionTagline}>{plan.tagline}</Text>
                      </View>

                      <View style={styles.planPriceBox}>
                        <Text style={styles.planPriceAmount}>
                          {price === 0 ? 'Free' : `$${price}`}
                        </Text>
                        <Text style={styles.planPricePeriod}>
                          {price === 0
                            ? '30 days'
                            : selectedCycle === 'yearly'
                              ? '/ year'
                              : '/ month'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.planOptionFeatures}>
                      {(plan.features || []).map((feat) => (
                        <Text key={feat} style={styles.planOptionFeatureItem}>
                          ✓  {feat}
                        </Text>
                      ))}
                    </View>

                    {isCurrent ? (
                      <View style={styles.currentPlanFooterPill}>
                        <Text style={styles.currentPlanFooterText}>
                          ✓ Active on your account
                        </Text>
                      </View>
                    ) : isPaid ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={Boolean(requestingPlan)}
                        onPress={() =>
                          void handleRequestUpgrade(plan.id as 'forge' | 'ember')
                        }
                        style={({ pressed }) => [
                          styles.requestPlanBtn,
                          plan.highlight && styles.requestPlanBtnHighlight,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.requestPlanBtnText,
                            plan.highlight && styles.requestPlanBtnTextHighlight,
                          ]}
                        >
                          {requestingPlan === plan.id
                            ? 'Requesting invoice…'
                            : `Request ${plan.name} (${selectedCycle}) →`}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ====================================================================
       * MODAL 2: DELETE ACCOUNT CONFIRMATION
       * ==================================================================== */}
      <Modal
        visible={confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDelete(false)}
      >
        <View style={styles.modalShade}>
          <View style={styles.modal}>
            <View style={styles.modalWarnBadge}>
              <Text style={styles.modalWarnBadgeText}>PERMANENT ACTION</Text>
            </View>
            <Heading style={styles.modalTitle}>Delete your account?</Heading>
            <BodyText>
              This permanently deletes your Kindling account, learner profile, subjects, lessons, and saved learning progress. You can’t undo this.
            </BodyText>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Button
              busy={deleting}
              onPress={() => void removeAccount()}
              style={styles.confirmDeleteBtn}
            >
              Delete account and learning data
            </Button>
            <Button
              variant="secondary"
              disabled={deleting}
              onPress={() => setConfirmDelete(false)}
            >
              Keep my account
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  placeholder = 'Not set',
  isLast = false,
}: {
  icon: string;
  label: string;
  value?: string | null;
  placeholder?: string;
  isLast?: boolean;
}) {
  const hasValue = Boolean(value?.trim());
  return (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
      <View style={styles.detailIconBox}>
        <Text style={styles.detailIconText}>{icon}</Text>
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, !hasValue && styles.detailPlaceholder]}>
          {hasValue ? value!.trim() : placeholder}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 38,
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
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  hello: {
    fontSize: 25,
    fontWeight: '600',
    color: Brand.pine,
  },
  editTopButton: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 13,
  },
  editTopButtonText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Learner Identity Hero */
  identityHero: {
    backgroundColor: Brand.pine,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Brand.pineLight,
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatarMedallion: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: Brand.pineLight,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 30,
    color: Brand.gold,
  },
  identityCopy: {
    flex: 1,
    gap: 4,
  },
  identityBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gradeBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeBadgeText: {
    color: '#D7ECE6',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  heroPlanChip: {
    backgroundColor: 'rgba(106,210,182,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroPlanChipText: {
    color: '#9FE8D3',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  countryBadge: {
    backgroundColor: 'rgba(228,163,42,0.2)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countryBadgeText: {
    color: '#F7D288',
    fontSize: 10,
    fontWeight: '600',
  },
  learnerName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 2,
  },
  learnerEmail: {
    color: '#B9DAD3',
    fontSize: 13,
    fontWeight: '600',
  },
  learnerSubMeta: {
    color: '#D6E4DF',
    fontSize: 12,
    marginTop: 1,
  },
  completenessBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 13,
    gap: 7,
  },
  completenessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completenessLabel: {
    color: '#B9DAD3',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  completenessPercent: {
    color: Brand.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  completenessTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  completenessFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: Brand.gold,
  },
  completenessHint: {
    color: '#D6E4DF',
    fontSize: 12,
    lineHeight: 17,
  },
  heroEditBtn: {
    minHeight: 46,
    backgroundColor: Brand.gold,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  heroEditBtnText: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '600',
  },

  /* 3-Card Snapshot Strip */
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
  kpiTeal: {
    backgroundColor: Brand.card,
    borderColor: Brand.line,
  },
  kpiPine: {
    backgroundColor: Brand.card,
    borderColor: Brand.line,
  },
  kpiGold: {
    backgroundColor: Brand.card,
    borderColor: Brand.line,
  },
  kpiLabel: {
    color: Brand.muted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  kpiValue: {
    color: Brand.pine,
    fontSize: 21,
    fontWeight: '600',
  },
  kpiSub: {
    color: Brand.teal,
    fontSize: 11,
    fontWeight: '700',
  },

  /* Subscription Section */
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.line,
    overflow: 'hidden',
  },
  subAccentBar: {
    height: 5,
    width: '100%',
  },
  subAccentSpark: {
    backgroundColor: Brand.teal,
  },
  subAccentForge: {
    backgroundColor: Brand.pine,
  },
  subAccentEmber: {
    backgroundColor: Brand.gold,
  },
  subCardContent: {
    padding: 16,
    gap: 14,
  },
  subLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  subLoadingText: {
    color: Brand.muted,
    fontSize: 13,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  subPlanIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subIconSpark: {
    backgroundColor: Brand.tealPale,
  },
  subIconForge: {
    backgroundColor: Brand.subtle,
  },
  subIconEmber: {
    backgroundColor: Brand.subtle,
  },
  subPlanGlyph: {
    fontSize: 22,
    color: Brand.pine,
  },
  subTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  subEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  subStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
  },
  subStatusActive: {
    backgroundColor: '#DDF0E5',
  },
  subStatusWarn: {
    backgroundColor: '#FCECE9',
  },
  subStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subStatusDotActive: {
    backgroundColor: Brand.teal,
  },
  subStatusDotWarn: {
    backgroundColor: Brand.error,
  },
  subStatusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  subStatusTextActive: {
    color: Brand.pine,
  },
  subStatusTextWarn: {
    color: Brand.error,
  },
  subNamePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  subPlanName: {
    color: Brand.pine,
    fontSize: 20,
    fontWeight: '600',
  },
  subPlanPrice: {
    color: Brand.teal,
    fontSize: 14,
    fontWeight: '600',
  },
  subTagline: {
    color: Brand.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  subMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  subMetaPill: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: '#F6F8F6',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5EBE7',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 2,
  },
  subMetaLabel: {
    color: Brand.muted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  subMetaValue: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },
  usageBox: {
    backgroundColor: '#F2F8F7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBE0DE',
    padding: 13,
    gap: 8,
  },
  usageBoxWarn: {
    backgroundColor: '#FDF5E4',
    borderColor: '#EBD19B',
  },
  usageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  usageLabel: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  usageCountText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '600',
  },
  usageTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: '#DCEAE7',
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: Brand.teal,
  },
  usageFillWarn: {
    backgroundColor: Brand.gold,
  },
  usageBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  usageCaption: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  byokBox: {
    backgroundColor: '#F2F6F4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CEDCD5',
    padding: 12,
    gap: 4,
  },
  byokTitle: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '600',
  },
  byokBody: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  subFeaturesList: {
    gap: 8,
    paddingTop: 2,
  },
  subFeaturesHeading: {
    color: Brand.muted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  subFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  subFeatureCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  subFeatureCheckText: {
    color: Brand.pine,
    fontSize: 11,
    fontWeight: '600',
  },
  subFeatureText: {
    flex: 1,
    color: Brand.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  invoiceNoticeBox: {
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  invoiceNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  invoiceNoticeEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  invoiceNumberText: {
    color: Brand.pine,
    fontSize: 11,
    fontWeight: '600',
  },
  invoiceNoticeBody: {
    color: Brand.ink,
    fontSize: 12,
    lineHeight: 18,
  },
  subActionsRow: {
    paddingTop: 2,
  },
  subManageBtn: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: Brand.pine,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  subManageBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Push Notifications & Study Reminders Section */
  pushStatusNeutral: {
    backgroundColor: '#EEF1EE',
  },
  pushStatusDotNeutral: {
    backgroundColor: Brand.muted,
  },
  pushStatusTextNeutral: {
    color: Brand.muted,
  },
  pushCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 16,
    gap: 14,
  },
  pushMasterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pushIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushIconGlyph: {
    fontSize: 20,
  },
  pushMasterTitle: {
    color: Brand.pine,
    fontSize: 17,
    fontWeight: '600',
  },
  pushMasterSub: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  pushPermBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 15,
    padding: 13,
  },
  pushPermTitle: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '600',
  },
  pushPermBody: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  pushPermBtn: {
    backgroundColor: Brand.pine,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
  },
  pushPermBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pushTogglesGroup: {
    backgroundColor: '#F7FAF8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3EAE6',
    paddingHorizontal: 13,
  },
  pushToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  pushToggleDivider: {
    borderTopWidth: 1,
    borderTopColor: '#E5ECE8',
  },
  pushToggleTitle: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '600',
  },
  pushToggleDesc: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  reminderTimeBox: {
    backgroundColor: Brand.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE6DA',
    padding: 13,
    gap: 12,
  },
  reminderTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reminderTimeEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  reminderTimeValue: {
    color: Brand.pine,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 2,
  },
  timeStepperRow: {
    flexDirection: 'row',
    gap: 6,
  },
  timeStepBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  timeStepBtnText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '600',
  },
  presetTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePresetChip: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 2,
  },
  timePresetChipActive: {
    backgroundColor: Brand.pine,
    borderColor: Brand.pine,
  },
  timePresetLabel: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '600',
  },
  timePresetLabelActive: {
    color: '#FFFFFF',
  },
  timePresetSub: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  timePresetSubActive: {
    color: '#CFE3DC',
  },
  pushFeedbackBox: {
    backgroundColor: '#DDF0E5',
    borderRadius: 12,
    padding: 11,
  },
  pushFeedbackText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
  },
  pushFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EE',
    paddingTop: 12,
  },
  pushDeviceMetaText: {
    color: Brand.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  testPushBtn: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
  },
  testPushBtnText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '600',
  },

  /* Section Links & Teaching Card */
  sectionActionLink: {
    color: Brand.teal,
    fontSize: 13,
    fontWeight: '600',
  },
  teachingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 16,
    gap: 12,
  },
  goalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    padding: 14,
  },
  goalIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Brand.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconGlyph: {
    fontSize: 20,
  },
  goalEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  goalTitle: {
    color: Brand.pine,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 2,
  },
  teachingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teachingTile: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: '#F5FAF9',
    borderWidth: 1,
    borderColor: '#D5E7E5',
    borderRadius: 16,
    padding: 13,
    gap: 4,
  },
  teachingTileEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  teachingTileTitle: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  teachingTileDetail: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
  },

  /* Interests Card */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 16,
    gap: 12,
  },
  sectionCardIntro: {
    color: Brand.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: Brand.tealPale,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  interestChipText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyInterestsPrompt: {
    backgroundColor: Brand.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C5CFCB',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  emptyInterestsTitle: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyInterestsSub: {
    color: Brand.muted,
    fontSize: 12,
  },

  /* Academic & Profile Details Card */
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EE',
  },
  detailIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F3F6F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconText: {
    fontSize: 18,
  },
  detailCopy: {
    flex: 1,
    gap: 3,
  },
  detailLabel: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  detailValue: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '700',
  },
  detailPlaceholder: {
    color: Brand.muted,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  /* Account Actions & Danger Zone */
  actionsStack: {
    gap: 10,
  },
  logoutButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  logoutButtonText: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '600',
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FDF4F2',
    borderWidth: 1,
    borderColor: '#F1D0CA',
    borderRadius: 18,
    padding: 15,
    marginTop: 4,
  },
  dangerTitle: {
    color: Brand.error,
    fontSize: 14,
    fontWeight: '600',
  },
  dangerSubtitle: {
    color: '#7E4A44',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  dangerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8B8B0',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
  },
  dangerButtonText: {
    color: Brand.error,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Plans Sheet Modal */
  sheetShade: {
    flex: 1,
    backgroundColor: 'rgba(17,31,27,0.52)',
    justifyContent: 'flex-end',
  },
  plansSheet: {
    maxHeight: '88%',
    backgroundColor: Brand.parchment,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 30,
    gap: 14,
  },
  plansSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  plansSheetEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  plansSheetTitle: {
    color: Brand.pine,
    fontSize: 22,
    fontWeight: '600',
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: {
    color: Brand.pine,
    fontSize: 24,
    lineHeight: 26,
  },
  cycleToggleWrap: {
    flexDirection: 'row',
    backgroundColor: Brand.subtle,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  cycleTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleTabActive: {
    backgroundColor: '#FFFFFF',
  },
  cycleTabText: {
    color: Brand.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  cycleTabTextActive: {
    color: Brand.pine,
    fontWeight: '600',
  },
  planSuccessBox: {
    backgroundColor: '#DDF0E5',
    borderRadius: 13,
    padding: 12,
  },
  planSuccessText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },
  planErrorBox: {
    backgroundColor: '#FCECE9',
    borderRadius: 13,
    padding: 12,
  },
  plansScrollContent: {
    gap: 12,
    paddingBottom: 14,
  },
  planOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 16,
    gap: 12,
  },
  planOptionHighlight: {
    borderColor: Brand.gold,
    borderWidth: 1.5,
  },
  planOptionCurrent: {
    borderColor: Brand.teal,
    borderWidth: 1.5,
  },
  planOptionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  planOptionTitleWrap: {
    flex: 1,
    gap: 4,
  },
  planOptionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  planOptionGlyph: {
    fontSize: 18,
  },
  planOptionName: {
    color: Brand.pine,
    fontSize: 19,
    fontWeight: '600',
  },
  currentPlanBadge: {
    backgroundColor: Brand.tealPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  currentPlanBadgeText: {
    color: Brand.pine,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  recommendedPlanBadge: {
    backgroundColor: Brand.subtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  recommendedPlanBadgeText: {
    color: Brand.teal,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  planOptionTagline: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  planPriceBox: {
    alignItems: 'flex-end',
  },
  planPriceAmount: {
    color: Brand.pine,
    fontSize: 21,
    fontWeight: '600',
  },
  planPricePeriod: {
    color: Brand.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  planOptionFeatures: {
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EE',
    paddingTop: 10,
  },
  planOptionFeatureItem: {
    color: Brand.ink,
    fontSize: 12,
    lineHeight: 18,
  },
  currentPlanFooterPill: {
    backgroundColor: '#F2F8F7',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  currentPlanFooterText: {
    color: Brand.teal,
    fontSize: 13,
    fontWeight: '600',
  },
  requestPlanBtn: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: Brand.pine,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  requestPlanBtnHighlight: {
    backgroundColor: Brand.gold,
  },
  requestPlanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  requestPlanBtnTextHighlight: {
    color: Brand.pine,
  },

  /* Delete Confirmation Modal */
  modalShade: {
    flex: 1,
    backgroundColor: 'rgba(17,31,27,0.52)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: Brand.parchment,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  modalWarnBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FCECE9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalWarnBadgeText: {
    color: Brand.error,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
  },
  modalTitle: {
    fontSize: 23,
  },
  confirmDeleteBtn: {
    backgroundColor: Brand.error,
  },
  error: {
    color: Brand.error,
    fontSize: 14,
    lineHeight: 20,
  },
});
