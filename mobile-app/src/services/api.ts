import { deleteSecret, getSecret, setSecret } from '@/services/storage';
import { DeviceEventEmitter } from 'react-native';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_URL || 'https://logical-useful-shad.ngrok-free.app').replace(/\/$/, '');

export type UserSession = { id: number; email: string; name: string };
export type StudentProfile = {
  id: number;
  name: string;
  grade: string;
  curriculum?: string;
  isOnboarded: boolean;
};
export type LessonItem = { id: number | null; name: string; learningGoal?: string; unitName?: string };
export type Subject = { id: number; name: string; learningGoal?: string; topics: { id: number | null; name: string; subtopics: LessonItem[] }[] };
export type LearningDashboard = {
  hasData?: boolean;
  weekStats?: { this?: { sessions?: { value?: string; cap?: string }; time?: { value?: string; cap?: string }; questions?: string; masteryDelta?: string } } | null;
  masteryMap?: { subject?: string; skill?: string; level?: number; status?: string }[];
  recentActivity?: { id?: string; when?: string; subject?: string; title?: string; detail?: string }[];
  totals?: { exchanges?: number };
};
export type LessonConversation = {
  id: string;
  status: string;
  messages: { id: string; role: 'tutor' | 'child' | 'system'; text: string; at?: string | null }[];
  apiHistory: { role: 'user' | 'model'; text: string }[];
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
          subtopics: subtopics.map((sub) => {
            const leaf = sub as Record<string, unknown>;
            return { id: leaf.id == null ? null : Number(leaf.id), name: String(leaf.name || topic.name || 'Lesson'), learningGoal: String(leaf.learning_goal || topic.learning_goal || ''), unitName: String(topic.name || '') };
          }),
        };
      }),
    };
  });
}

export async function createSubject(name: string, firstTopic: string) {
  const topics = firstTopic.trim() ? [{ name: firstTopic.trim(), familiarity: 'new', learning_goal: '', subtopics: [] }] : [];
  return apiRequest('/api/subjects/', { method: 'POST', json: { name, learning_goal: '', topics } });
}

export async function createTopic(subjectId: number, name: string) {
  return apiRequest(`/api/subjects/${subjectId}/topics/`, { method: 'POST', json: { name: name.trim(), familiarity: 'new', learning_goal: '' } });
}

export async function createSubtopic(topicId: number, name: string) {
  return apiRequest(`/api/subjects/topics/${topicId}/subtopics/`, { method: 'POST', json: { name: name.trim(), familiarity: 'new', learning_goal: '' } });
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

export async function askTutor(messages: { role: 'user' | 'model'; text: string }[], systemInstruction: string) {
  await apiRequest('/api/platform/subscription/');
  const contents = messages.map((message) => ({ role: message.role, parts: [{ text: message.text }] }));
  const result = await apiRequest<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>('/api/platform/ai/gemini/', {
    method: 'POST',
    json: {
      model: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.1-flash-lite',
      contents,
      config: { systemInstruction, maxOutputTokens: 700, temperature: 0.6 },
    },
  });
  return result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || 'I couldn’t form a reply just now. Try asking again.';
}
