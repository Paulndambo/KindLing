import { deleteSecret, getSecret, setSecret } from '@/services/storage';
import { DeviceEventEmitter } from 'react-native';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_URL || 'https://logical-useful-shad.ngrok-free.app').replace(/\/$/, '');

export type UserSession = { id: number; email: string; name: string };
export type StudentProfile = {
  id: number;
  name: string;
  dateOfBirth?: string | null;
  age?: number | null;
  grade: string;
  avatar: string;
  country: string;
  countryFlag: string;
  preferredLanguage: string;
  schoolName: string;
  schoolType: string;
  curriculum: string;
  academicTarget: string;
  learningStyle: string;
  interests: string[];
  focusSubjects: string[];
  goal: string;
  weekFocus: string;
  targetLabel: string;
  targetDate: string | null;
  isOnboarded: boolean;
  digestOptIn: boolean;
  familyEmail: string;
  pushEnabled?: boolean;
  dailyReminderEnabled?: boolean;
  streakReminderEnabled?: boolean;
  reminderHour?: number;
  reminderMinute?: number;
};
export type StudentProfileInput = Omit<StudentProfile, 'id' | 'age'>;
export type LessonItem = { id: number | null; name: string; learningGoal?: string; familiarity?: string; unitName?: string };
export type Subject = { id: number; name: string; learningGoal?: string; topics: { id: number | null; name: string; learningGoal?: string; familiarity?: string; subtopics: LessonItem[] }[] };
export type LearningDashboard = {
  hasData?: boolean;
  weekStats?: Record<string, { sessions?: { value?: string; cap?: string }; time?: { value?: string; cap?: string }; streak?: { value?: string; cap?: string }; focus?: { value?: string; cap?: string }; questions?: string; masteryDelta?: string }> | null;
  masteryMap?: { subject?: string; skill?: string; level?: number; status?: string; slug?: string; segs?: string[] }[];
  recentActivity?: { id?: string; when?: string; subject?: string; title?: string; detail?: string; tone?: string }[];
  strengths?: { label?: string; hint?: string }[];
  focusAreas?: { label?: string; hint?: string }[];
  confidenceHistory?: Record<string, number[]>;
  weekPlan?: { day?: string; title?: string; tag?: string; duration?: string; text?: string }[];
  profile?: { behavior?: { hintRate?: number }; confidenceEvidenceHistory?: number[] } | null;
  insights?: { summary?: string; directives?: string[]; stats?: { accuracy?: number } | null } | null;
  nextBestActions?: { label?: string; reason?: string; cta?: string; kind?: string; skillSlug?: string }[];
  totals?: { exchanges?: number; correct?: number; incorrect?: number; partial?: number };
};
export type LessonConversation = {
  id: string;
  status: string;
  messages: { id: string; role: 'tutor' | 'child' | 'system'; text: string; at?: string | null }[];
  apiHistory: { role: 'user' | 'model'; text: string }[];
};
export type ContinuableConversation = {
  id: string;
  status: string;
  subject: string;
  topic: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  title?: string | null;
  summary?: string | null;
  nextStep?: string | null;
  messageCount?: number;
  previewText?: string | null;
  canContinue?: boolean;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options: { method?: string; json?: unknown; auth?: boolean } = {}): Promise<T> {
  if (!API_BASE) {
    throw new Error(__DEV__
      ? 'The API URL was not included. Set EXPO_PUBLIC_URL (or EXPO_PUBLIC_API_URL) in mobile-app/.env, then restart Expo.'
      : 'The API URL was not included in this app build. Set EXPO_PUBLIC_URL (or EXPO_PUBLIC_API_URL) in the EAS production environment, then create and install a new build.');
  }
  if (!__DEV__ && !API_BASE.startsWith('https://')) {
    throw new Error('The production API URL must use HTTPS. Update EXPO_PUBLIC_URL (or EXPO_PUBLIC_API_URL) in the EAS production environment, then create and install a new build.');
  }
  const token = options.auth === false ? null : await getSecret('kindling.access-token');
  const response = await send(path, options, token);
  if (response.status === 401 && options.auth !== false && path !== '/api/auth/refresh/') {
    const saved = await getSecret('kindling.session.v1');
    const refresh = saved ? (JSON.parse(saved) as { tokens?: { refresh?: string } }).tokens?.refresh : undefined;
    if (refresh) {
      try {
        const result = await send('/api/auth/refresh/', { method: 'POST', auth: false, json: { refresh } }, null);
        const tokens = await result.json() as { access?: string; refresh?: string };
        if (!result.ok || !tokens.access) throw new Error('Session expired');
        const session = JSON.parse(saved!) as { user: UserSession; tokens: { access: string; refresh: string } };
        const next = { ...session, tokens: { access: tokens.access, refresh: tokens.refresh || refresh } };
        await setSecret('kindling.session.v1', JSON.stringify(next));
        await setSecret('kindling.access-token', tokens.access);
        return apiRequest<T>(path, options);
      } catch {
        await deleteSecret('kindling.session.v1');
        await deleteSecret('kindling.access-token');
        DeviceEventEmitter.emit('kindlingSessionExpired');
      }
    }
  }
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json().catch(() => null) : null;
  if (!response.ok) {
    const detail = body?.detail || body?.error || body?.message;
    throw new ApiError(typeof detail === 'string' ? detail : `Request failed (${response.status}).`, response.status);
  }
  return body as T;
}

export async function getLearningDashboard() {
  return apiRequest<LearningDashboard>('/api/learning/dashboard/');
}

export async function trackLearningEvent(type: string, payload: Record<string, unknown>, sessionId: string) {
  return apiRequest<{ ok: boolean; delivered: number }>('/api/learning/events/', {
    method: 'POST',
    json: {
      schemaVersion: 1,
      source: 'kindling-mobile',
      sentAt: new Date().toISOString(),
      events: [{
        id: `mobile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
        type,
        timestamp: new Date().toISOString(),
        context: { app: 'kindling', client: 'mobile', sessionId },
        payload: { ...payload, sessionId },
      }],
    },
  });
}

export async function deleteAccount() {
  return apiRequest<{ detail?: string }>('/api/auth/account/', { method: 'DELETE', json: { confirm: true } });
}

function send(path: string, options: { method?: string; json?: unknown; auth?: boolean }, token: string | null) {
  return fetch(`${API_BASE}${path}`, {
    method: options.method || (options.json ? 'POST' : 'GET'),
    headers: {
      Accept: 'application/json',
      ...(options.json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.json ? { body: JSON.stringify(options.json) } : {}),
  });
}

export async function getStudentProfile() {
  try {
    return await apiRequest<StudentProfile>('/api/students/me/');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function listSubjects(): Promise<Subject[]> {
  const data = await apiRequest<unknown>('/api/subjects/');
  const rows = Array.isArray(data) ? data : ((data as { results?: unknown[] } | null)?.results || []);
  return rows.map((value) => {
    const raw = value as Record<string, unknown>;
    const topics = Array.isArray(raw.topics) ? raw.topics : [];
    return {
      id: Number(raw.id),
      name: String(raw.name || 'Subject'),
      learningGoal: String(raw.learning_goal || ''),
      topics: topics.map((item) => {
        const topic = item as Record<string, unknown>;
        const children = Array.isArray(topic.subtopics) ? topic.subtopics : [];
        const subtopics = children.length ? children : [topic];
        return {
          id: topic.id == null ? null : Number(topic.id),
          name: String(topic.name || 'Topic'),
          learningGoal: String(topic.learning_goal || ''),
          familiarity: String(topic.familiarity || 'unknown'),
          subtopics: subtopics.map((sub) => {
            const leaf = sub as Record<string, unknown>;
            return { id: leaf.id == null ? null : Number(leaf.id), name: String(leaf.name || topic.name || 'Lesson'), learningGoal: String(leaf.learning_goal || topic.learning_goal || ''), familiarity: String(leaf.familiarity || topic.familiarity || 'unknown'), unitName: String(topic.name || '') };
          }),
        };
      }),
    };
  });
}

export async function createSubject(name: string, firstTopic: string, learningGoal = '') {
  const topics = firstTopic.trim() ? [{ name: firstTopic.trim(), familiarity: 'new', learning_goal: '', subtopics: [] }] : [];
  return apiRequest('/api/subjects/', { method: 'POST', json: { name: name.trim(), learning_goal: learningGoal.trim(), topics } });
}

export async function createTopic(subjectId: number, name: string, learningGoal = '') {
  return apiRequest(`/api/subjects/${subjectId}/topics/`, { method: 'POST', json: { name: name.trim(), familiarity: 'new', learning_goal: learningGoal.trim() } });
}

export async function createSubtopic(topicId: number, name: string, learningGoal = '') {
  return apiRequest(`/api/subjects/topics/${topicId}/subtopics/`, { method: 'POST', json: { name: name.trim(), familiarity: 'new', learning_goal: learningGoal.trim() } });
}

export async function listContinuableConversations(limit = 12): Promise<ContinuableConversation[]> {
  try {
    const result = await apiRequest<{ items?: ContinuableConversation[] }>(`/api/learning/conversations/continue/?limit=${limit}`);
    return Array.isArray(result?.items) ? result.items : [];
  } catch {
    return [];
  }
}

export async function ensureLessonConversation(subject: string, topic: string) {
  const result = await apiRequest<{ conversation: LessonConversation }>('/api/learning/conversations/ensure/', {
    method: 'POST', json: { subject, topic },
  });
  return result.conversation;
}

export async function appendLessonMessage(
  conversationId: string,
  message: { id: string; role: 'tutor' | 'child'; text: string; at: string },
  apiPair?: { user?: string; model?: string },
) {
  return apiRequest(`/api/learning/conversations/${encodeURIComponent(conversationId)}/messages/`, {
    method: 'POST',
    json: { ...message, apiPair },
  });
}

export async function askTutor(messages: { role: 'user' | 'model'; text: string }[], systemInstruction: string, options: { maxOutputTokens?: number } = {}) {
  await apiRequest('/api/platform/subscription/');
  const contents = messages.map((message) => ({ role: message.role, parts: [{ text: message.text }] }));
  const result = await apiRequest<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>('/api/platform/ai/gemini/', {
    method: 'POST',
    json: {
      model: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.1-flash-lite',
      contents,
      // Let Gemini use its model default sampling configuration. In particular,
      // Gemini 3.x recommends default temperature settings and newer 3.x models
      // are beginning to reject explicit sampling parameters.
      config: { systemInstruction, maxOutputTokens: options.maxOutputTokens || 2048 },
    },
  });
  return result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || 'I couldn’t form a reply just now. Try asking again.';
}

export type StudentAssessmentRecord = {
  id: number;
  title: string;
  topic: string;
  subjectId: number | null;
  topicId: number | null;
  subtopicId: number | null;
  subjectName: string;
  topicName: string;
  subtopicName: string;
  description: string;
  questionType: 'multiple_choice' | 'open_ended' | 'hybrid';
  questions: Record<string, unknown>[];
  answers: Record<string, string>;
  result: Record<string, unknown> | null;
  revisionMessages: { role: 'user' | 'model'; text: string }[];
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export async function listAssessments() {
  return apiRequest<StudentAssessmentRecord[]>('/api/learning/assessments/');
}

export async function createAssessment(assessment: Record<string, unknown>) {
  return apiRequest<StudentAssessmentRecord>('/api/learning/assessments/', { method: 'POST', json: assessment });
}

export async function updateAssessment(id: number, updates: Record<string, unknown>) {
  return apiRequest<StudentAssessmentRecord>(`/api/learning/assessments/${encodeURIComponent(id)}/`, { method: 'PATCH', json: updates });
}

export type PlanEntitlements = {
  platformAi?: boolean;
  byok?: boolean;
  multiProvider?: boolean;
  advancedRouting?: boolean;
  familyDigest?: boolean;
  prioritySupport?: boolean;
  dailyLessonSoftCap?: number | null;
  dailyPlatformAiRequests?: number;
  dailyPlatformAiTokens?: number;
};

export type PlanCatalogItem = {
  id: 'spark' | 'premium' | string;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  highlight?: boolean;
  trialDays?: number;
  features: string[];
  entitlements: PlanEntitlements;
};

export type DailyAiUsage = {
  used: number;
  limit: number;
  remaining: number;
  estimatedTokensUsed: number;
  estimatedTokenLimit: number;
  estimatedTokensRemaining: number;
  limitReason: string | null;
  resetsAt: string;
  softWarning: boolean;
};

export type PlatformSubscription = {
  plan: 'spark' | 'premium' | string;
  planName: string;
  planDetail: PlanCatalogItem;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | string;
  billing_cycle: 'monthly' | 'yearly' | string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  entitlements: PlanEntitlements;
  updated_at?: string;
  platform_ai_daily_usage?: DailyAiUsage;
};

export type BillingInvoiceItem = {
  id: number;
  invoice_number: string;
  plan: string;
  plan_name: string;
  billing_cycle: 'monthly' | 'yearly' | string;
  amount: string | number;
  currency: string;
  status: 'requested' | 'paid' | 'void' | string;
  payment_reference?: string;
  created_at: string;
  paid_at?: string | null;
};

export async function getPlatformSubscription() {
  return apiRequest<PlatformSubscription>('/api/platform/subscription/');
}

export async function listPlatformPlans(): Promise<PlanCatalogItem[]> {
  const res = await apiRequest<{ plans?: PlanCatalogItem[] }>('/api/platform/plans/', { auth: false });
  return Array.isArray(res?.plans) ? res.plans : [];
}

export async function listBillingInvoices(): Promise<BillingInvoiceItem[]> {
  try {
    const res = await apiRequest<BillingInvoiceItem[]>('/api/platform/invoices/');
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function requestPlanInvoice(plan: 'premium', billingCycle: 'monthly' | 'yearly') {
  return apiRequest<BillingInvoiceItem>('/api/platform/invoices/', {
    method: 'POST',
    json: { plan, billing_cycle: billingCycle },
  });
}

export type PushDeviceItem = {
  id: number;
  expoPushToken: string;
  platform: string;
  deviceName: string;
  isActive: boolean;
  lastSeenAt?: string;
};

export type PushNotificationSettings = {
  pushEnabled: boolean;
  dailyReminderEnabled: boolean;
  streakReminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  devices: PushDeviceItem[];
};

export type PushSettingsInput = Partial<{
  expoPushToken: string;
  platform: string;
  deviceName: string;
  pushEnabled: boolean;
  dailyReminderEnabled: boolean;
  streakReminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}>;

export type TestPushResult = {
  ok: boolean;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  delivery?: {
    sent: number;
    failed: number;
    devices: number;
    detail?: string;
  };
};

export async function getPushSettings() {
  return apiRequest<PushNotificationSettings>('/api/students/me/push/');
}

export async function savePushSettings(payload: PushSettingsInput) {
  return apiRequest<PushNotificationSettings>('/api/students/me/push/', {
    method: 'POST',
    json: payload,
  });
}

export async function unregisterPushDevice(expoPushToken?: string) {
  const query = expoPushToken ? `?token=${encodeURIComponent(expoPushToken)}` : '';
  return apiRequest<PushNotificationSettings>(`/api/students/me/push/${query}`, {
    method: 'DELETE',
    json: expoPushToken ? { expoPushToken } : undefined,
  });
}

export async function sendTestPushNotification() {
  return apiRequest<TestPushResult>('/api/students/me/push/test/', {
    method: 'POST',
  });
}
