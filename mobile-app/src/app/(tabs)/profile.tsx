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
import { isHigherEducation, LEARNING_STYLES, normalizeProgrammeTrack } from '@/constants/learner-profile';
import { ageFromDateOfBirth } from '@/services/learner-age';
import { useSession } from '@/context/session';
import { usePurchases } from '@/context/purchases';
import { SubscriptionCard } from '@/components/subscription-card';
import {
  deleteAccount,
  getPlatformSubscription,
  getPushSettings,
  listBillingInvoices,
  listPlatformPlans,
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
    tagline: "Free access to Kindling's adaptive tutor",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "Kindling's adaptive teaching system, free",
      'Live adaptive lessons (daily platform-AI request and usage cap)',
      'Student dashboard & mastery pulse',
      'Bring your own AI keys for additional providers',
    ],
    entitlements: {
      platformAi: true,
      byok: true,
      multiProvider: false,
      advancedRouting: false,
      familyDigest: false,
      dailyLessonSoftCap: 4,
      dailyPlatformAiRequests: 250,
      dailyPlatformAiTokens: 1000000,
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'More AI and advanced learning tools',
    priceMonthly: 25,
    priceYearly: 250,
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
  if (key === 'premium') return '🔥';
  return '✦';
}

function formatPlanPrice(plan?: PlanCatalogItem | null, cycle?: string) {
  if (!plan || plan.id === 'spark' || (plan.priceMonthly === 0 && plan.priceYearly === 0)) {
    return 'Free';
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
  const { isPremium: storePremium, ready: storeReady } = usePurchases();
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
  const [showPlanFeatures, setShowPlanFeatures] = useState(false);
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

  const loadSnapshot = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true);
      try {
        const [
          subRes,
          plansRes,
          invoicesRes,
          pushRes,
          permRes,
        ] = await Promise.allSettled([
          getPlatformSubscription(),
          listPlatformPlans(),
          Platform.OS === 'web' ? listBillingInvoices() : Promise.resolve([]),
          getPushSettings(),
          getNotificationPermissionStatus(),
          isPull ? refreshProfile() : Promise.resolve(),
        ]);

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

  const handleRequestUpgrade = async (planId: 'premium') => {
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

  // Active subscription display data
  const storedPlanId = (subscription?.plan || 'spark').toLowerCase();
  const activePlanId = ['ember', 'forge'].includes(storedPlanId)
    ? 'premium'
    : storedPlanId;
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
          <BrandMark size={40} />
          <View style={styles.greeting}>
            <Text style={styles.eyebrow}>ACCOUNT & SETTINGS</Text>
            <Text style={styles.hello}>Profile</Text>
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

        {/* Learner Identity Card */}
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
                    {getPlanGlyph(Platform.OS === 'web' ? activePlanId : storePremium ? 'premium' : 'spark')}{' '}
                    {(Platform.OS === 'web' ? (subscription?.planName || activePlanDetail.name) : storeReady ? (storePremium ? 'Premium' : 'Spark') : 'Checking').toUpperCase()}
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
                <Text numberOfLines={1} style={styles.learnerEmail}>{session.email}</Text>
              ) : null}
            </View>
          </View>

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
        </View>

        {/* Unified Learning Preferences & Academic Details */}
        <SectionTitle
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/onboarding')}
              hitSlop={8}
            >
              <Text style={styles.sectionActionLink}>Customize ›</Text>
            </Pressable>
          }
        >
          Learning preferences
        </SectionTitle>

        <View style={styles.detailsCard}>
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
                Primary language in lessons & checks
              </Text>
            </View>
          </View>

          <View style={styles.interestsSection}>
            <Text style={styles.teachingTileEyebrow}>INTERESTS & EXAMPLE THEMES</Text>
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
                style={({ pressed }) => [styles.emptyInterestsPrompt, pressed && styles.pressed]}
              >
                <Text style={styles.emptyInterestsTitle}>
                  + Pick interests so Kindling can tailor analogies
                </Text>
              </Pressable>
            )}
          </View>

          <ProfileRow
            icon="🧭"
            label={higherEd ? 'PROGRAMME TRACK' : 'CURRICULUM'}
            value={normalizeProgrammeTrack(profile?.curriculum)}
            placeholder="Standard / General curriculum"
          />
          <ProfileRow
            icon="🏫"
            label={higherEd ? 'UNIVERSITY / COLLEGE' : 'SCHOOL'}
            value={profile?.schoolName}
            placeholder="Not set"
          />
          <ProfileRow icon="🎂" label="DATE OF BIRTH" value={profile?.dateOfBirth ? `${profile.dateOfBirth} · Age ${ageFromDateOfBirth(profile.dateOfBirth) ?? 'unknown'}` : ''} placeholder="Not set · add in Edit profile" isLast />
        </View>

        {/* ================================================================
         * STUDENT SUBSCRIPTION & AI ALLOWANCE SECTION
         * ================================================================ */}
        {Platform.OS !== 'web' ? (
          <SubscriptionCard />
        ) : (
          <>
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
              <View
                style={[
                  styles.subAccentBar,
                  activePlanId === 'premium'
                    ? styles.subAccentEmber
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

                <View style={styles.subHeaderRow}>
                  <View
                    style={[
                      styles.subPlanIconBox,
                      activePlanId === 'premium'
                        ? styles.subIconEmber
                        : styles.subIconSpark,
                    ]}
                  >
                    <Text style={styles.subPlanGlyph}>{getPlanGlyph(activePlanId)}</Text>
                  </View>

                  <View style={styles.flex}>
                    <View style={styles.subTitleBadgeRow}>
                      <Text style={styles.subEyebrow}>
                        {activePlanId === 'spark' ? 'FREE PLAN' : 'PREMIUM PLAN'}
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

                {(periodEndFormatted || periodStartFormatted) ? (
                  <View style={styles.subMetaRow}>
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
                  </View>
                ) : null}

                {dailyUsage && dailyUsage.limit > 0 ? (
                  <View
                    style={[
                      styles.usageBox,
                      dailyUsage.softWarning && styles.usageBoxWarn,
                    ]}
                  >
                    <View style={styles.usageTopRow}>
                      <Text style={styles.usageLabel}>DAILY AI ALLOWANCE</Text>
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
                        {dailyUsage.remaining} left today
                      </Text>
                      <Text style={styles.usageCaption}>
                        {formatTokenCount(dailyUsage.estimatedTokensUsed)} /{' '}
                        {formatTokenCount(dailyUsage.estimatedTokenLimit)} tokens
                      </Text>
                    </View>
                  </View>
                ) : null}

                {showPlanFeatures ? (
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
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowPlanFeatures((prev) => !prev)}
                  style={styles.featuresToggleBtn}
                >
                  <Text style={styles.featuresToggleText}>
                    {showPlanFeatures ? 'Hide plan features ▴' : 'Show included features ▾'}
                  </Text>
                </Pressable>

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
                      {pendingInvoice.amount} {pendingInvoice.currency} — awaiting confirmation.
                    </Text>
                  </View>
                ) : null}

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
                        ? 'Upgrade to Premium →'
                        : 'Manage or switch plan →'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </>
        )}

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
          <View style={styles.pushMasterRow}>
            <View style={styles.pushIconBadge}>
              <Text style={styles.pushIconGlyph}>🔔</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.pushMasterTitle}>Study reminders</Text>
              <Text style={styles.pushMasterSub}>
                Daily study nudges and streak reminders
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
                  Grant notification permission so Kindling can deliver your daily reminders.
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

              <View style={styles.reminderTimeBox}>
                <View style={styles.reminderTimeHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.reminderTimeEyebrow}>
                      REMINDER TIME
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

          <View style={styles.pushFooterRow}>
            <Text style={styles.pushDeviceMetaText}>
              {pushSettings.devices.length > 0
                ? `${pushSettings.devices.length} registered ${
                    pushSettings.devices.length === 1 ? 'device' : 'devices'
                  }`
                : 'Local & push notifications ready'}
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
                {testingPush ? 'Sending…' : 'Send test alert'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Account Actions */}
        <SectionTitle>Account</SectionTitle>

        <View style={styles.actionsStack}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void logout()}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          >
            <Text style={styles.logoutButtonText}>Log out of Kindling</Text>
          </Pressable>

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
        </View>
      </AppScreen>

      {/* ====================================================================
       * MODAL 1: COMPARE & UPGRADE SUBSCRIPTION PLANS
       * ==================================================================== */}
      <Modal
        visible={Platform.OS === 'web' && showPlansModal}
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
                const isPaid = plan.id === 'premium';
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
                            ? 'Free'
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
                          void handleRequestUpgrade(plan.id as 'premium')
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
            {Platform.OS !== 'web' ? (
              <BodyText>
                Deleting your account does not cancel an App Store or Google Play subscription. Cancel it in your store subscription settings before deleting your account.
              </BodyText>
            ) : null}
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
    paddingTop: 18,
    paddingBottom: 38,
    gap: 20,
  },
  flex: {
    flex: 1,
    minWidth: 0,
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
    minWidth: 0,
  },
  eyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  hello: {
    color: Brand.pine,
    fontSize: 22,
    fontWeight: '800',
  },
  editTopButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTopButtonText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Learner Identity Hero Card */
  identityHero: {
    backgroundColor: Brand.pine,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarMedallion: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
    color: Brand.gold,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  identityBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  gradeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(243,200,104,0.2)',
  },
  gradeBadgeText: {
    color: Brand.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroPlanChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(62,135,109,0.28)',
  },
  heroPlanChipText: {
    color: '#DDF0E5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  countryBadgeText: {
    color: '#E6EFEA',
    fontSize: 10,
    fontWeight: '700',
  },
  learnerName: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  learnerEmail: {
    color: '#C7D6CF',
    fontSize: 13,
  },

  /* Goal Banner inside Identity Card */
  goalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 16,
    padding: 13,
  },
  goalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(243,200,104,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconGlyph: {
    fontSize: 18,
  },
  goalEyebrow: {
    color: Brand.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  goalTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 2,
  },

  sectionActionLink: {
    color: Brand.teal,
    fontSize: 13,
    fontWeight: '800',
  },

  /* Unified Learning Preferences & Academic Details */
  detailsCard: {
    backgroundColor: Brand.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 16,
    gap: 14,
  },
  teachingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teachingTile: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FAF7F0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 13,
    gap: 4,
  },
  teachingTileEyebrow: {
    color: Brand.teal,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  teachingTileTitle: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '800',
  },
  teachingTileDetail: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  interestsSection: {
    borderTopWidth: 1,
    borderTopColor: Brand.line,
    paddingTop: 12,
    gap: 8,
  },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: Brand.tealPale,
  },
  interestChipText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyInterestsPrompt: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Brand.line,
    backgroundColor: '#FAF7F0',
  },
  emptyInterestsTitle: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Brand.line,
  },
  detailRowBorder: {},
  detailIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconText: {
    fontSize: 17,
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detailLabel: {
    color: Brand.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  detailValue: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '700',
  },
  detailPlaceholder: {
    color: Brand.muted,
    fontWeight: '500',
  },

  /* Subscription Card */
  subscriptionCard: {
    backgroundColor: Brand.card,
    borderRadius: 22,
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
  subAccentEmber: {
    backgroundColor: Brand.gold,
  },
  subCardContent: {
    padding: 18,
    gap: 14,
  },
  subLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subLoadingText: {
    color: Brand.muted,
    fontSize: 13,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  subPlanIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subIconSpark: {
    backgroundColor: Brand.tealPale,
  },
  subIconEmber: {
    backgroundColor: Brand.amberPale,
  },
  subPlanGlyph: {
    fontSize: 22,
  },
  subTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  subEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  subStatusActive: {
    backgroundColor: Brand.tealPale,
  },
  subStatusWarn: {
    backgroundColor: Brand.amberPale,
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
    backgroundColor: Brand.amber,
  },
  subStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subStatusTextActive: {
    color: Brand.pine,
  },
  subStatusTextWarn: {
    color: '#7A4D0B',
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
    fontSize: 19,
    fontWeight: '800',
  },
  subPlanPrice: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '700',
  },
  subTagline: {
    color: Brand.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  subMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subMetaPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: Brand.line,
  },
  subMetaLabel: {
    color: Brand.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  subMetaValue: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  usageBox: {
    backgroundColor: '#FAF7F0',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 13,
    gap: 8,
  },
  usageBoxWarn: {
    backgroundColor: Brand.amberPale,
    borderColor: '#EAD6A6',
  },
  usageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  usageLabel: {
    color: Brand.pine,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  usageCountText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '800',
  },
  usageTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: '#E5DDD0',
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: Brand.teal,
  },
  usageFillWarn: {
    backgroundColor: Brand.amber,
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
  },
  subFeaturesList: {
    gap: 8,
    paddingTop: 4,
  },
  subFeaturesHeading: {
    color: Brand.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  subFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  subFeatureCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  subFeatureCheckText: {
    color: Brand.pine,
    fontSize: 11,
    fontWeight: '800',
  },
  subFeatureText: {
    flex: 1,
    minWidth: 0,
    color: Brand.ink,
    fontSize: 13,
    lineHeight: 19,
  },
  featuresToggleBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  featuresToggleText: {
    color: Brand.teal,
    fontSize: 12,
    fontWeight: '700',
  },
  invoiceNoticeBox: {
    backgroundColor: Brand.amberPale,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  invoiceNoticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  invoiceNoticeEyebrow: {
    color: '#7A4D0B',
    fontSize: 10,
    fontWeight: '800',
  },
  invoiceNumberText: {
    color: Brand.pine,
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '700',
  },

  /* Reminders & Notifications */
  pushStatusNeutral: {
    backgroundColor: '#EDE7DB',
  },
  pushStatusDotNeutral: {
    backgroundColor: Brand.muted,
  },
  pushStatusTextNeutral: {
    color: Brand.muted,
  },
  pushCard: {
    backgroundColor: Brand.card,
    borderRadius: 22,
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
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushIconGlyph: {
    fontSize: 18,
  },
  pushMasterTitle: {
    color: Brand.pine,
    fontSize: 16,
    fontWeight: '800',
  },
  pushMasterSub: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  pushPermBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Brand.amberPale,
  },
  pushPermTitle: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '800',
  },
  pushPermBody: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  pushPermBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Brand.pine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushPermBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pushTogglesGroup: {
    backgroundColor: '#FAF7F0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
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
    borderTopColor: Brand.line,
  },
  pushToggleTitle: {
    color: Brand.pine,
    fontSize: 14,
    fontWeight: '700',
  },
  pushToggleDesc: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  reminderTimeBox: {
    backgroundColor: '#FAF7F0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 13,
    gap: 12,
  },
  reminderTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  reminderTimeEyebrow: {
    color: Brand.teal,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  reminderTimeValue: {
    color: Brand.pine,
    fontSize: 20,
    fontWeight: '800',
  },
  timeStepperRow: {
    flexDirection: 'row',
    gap: 6,
  },
  timeStepBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeStepBtnText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
  },
  presetTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePresetChip: {
    flex: 1,
    minWidth: 115,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: '#FFFFFF',
  },
  timePresetChipActive: {
    borderColor: Brand.teal,
    backgroundColor: Brand.tealPale,
  },
  timePresetLabel: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
  },
  timePresetLabelActive: {
    color: Brand.pine,
    fontWeight: '800',
  },
  timePresetSub: {
    color: Brand.muted,
    fontSize: 11,
  },
  timePresetSubActive: {
    color: Brand.pine,
  },
  pushFeedbackBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: Brand.tealPale,
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
    gap: 8,
    paddingTop: 2,
  },
  pushDeviceMetaText: {
    color: Brand.muted,
    fontSize: 12,
  },
  testPushBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: '#FAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testPushBtnText: {
    color: Brand.pine,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Account Actions */
  actionsStack: {
    gap: 12,
  },
  logoutButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: Brand.pine,
    fontSize: 15,
    fontWeight: '700',
  },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECC7C0',
    backgroundColor: '#FDF4F2',
  },
  dangerTitle: {
    color: Brand.error,
    fontSize: 14,
    fontWeight: '800',
  },
  dangerSubtitle: {
    color: Brand.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  dangerButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E2ADA3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: Brand.error,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Modals */
  sheetShade: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,31,27,0.48)',
  },
  plansSheet: {
    maxHeight: '88%',
    backgroundColor: Brand.parchment,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    gap: 14,
  },
  plansSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  plansSheetEyebrow: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  plansSheetTitle: {
    color: Brand.pine,
    fontSize: 22,
    fontWeight: '800',
  },
  sheetCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: {
    color: Brand.pine,
    fontSize: 24,
    lineHeight: 28,
  },
  cycleToggleWrap: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#EDE7DB',
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
    fontWeight: '800',
  },
  planSuccessBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Brand.tealPale,
  },
  planSuccessText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },
  planErrorBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FCECE9',
  },
  error: {
    color: Brand.error,
    fontSize: 13,
    lineHeight: 19,
  },
  plansScrollContent: {
    gap: 12,
    paddingBottom: 20,
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
  },
  planOptionCurrent: {
    borderColor: Brand.teal,
  },
  planOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  planOptionTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  planOptionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  planOptionGlyph: {
    fontSize: 18,
  },
  planOptionName: {
    color: Brand.pine,
    fontSize: 18,
    fontWeight: '800',
  },
  currentPlanBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: Brand.tealPale,
  },
  currentPlanBadgeText: {
    color: Brand.pine,
    fontSize: 9,
    fontWeight: '800',
  },
  recommendedPlanBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: Brand.amberPale,
  },
  recommendedPlanBadgeText: {
    color: '#7A4D0B',
    fontSize: 9,
    fontWeight: '800',
  },
  planOptionTagline: {
    color: Brand.muted,
    fontSize: 13,
  },
  planPriceBox: {
    alignItems: 'flex-end',
  },
  planPriceAmount: {
    color: Brand.pine,
    fontSize: 20,
    fontWeight: '800',
  },
  planPricePeriod: {
    color: Brand.muted,
    fontSize: 11,
  },
  planOptionFeatures: {
    gap: 6,
  },
  planOptionFeatureItem: {
    color: Brand.ink,
    fontSize: 13,
    lineHeight: 19,
  },
  currentPlanFooterPill: {
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
  },
  currentPlanFooterText: {
    color: Brand.pine,
    fontSize: 13,
    fontWeight: '700',
  },
  requestPlanBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Brand.pine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestPlanBtnHighlight: {
    backgroundColor: Brand.teal,
  },
  requestPlanBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  requestPlanBtnTextHighlight: {
    color: '#FFFFFF',
  },
  modalShade: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(17,31,27,0.52)',
  },
  modal: {
    backgroundColor: Brand.parchment,
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  modalWarnBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: '#FCECE9',
  },
  modalWarnBadgeText: {
    color: Brand.error,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  modalTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  confirmDeleteBtn: {
    backgroundColor: Brand.error,
  },
});
