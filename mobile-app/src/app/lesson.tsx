import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { BrandMark } from '@/components/mobile-ui';
import { useSession } from '@/context/session';
import { ageGuidance } from '@/services/learner-age';
import { appendLessonMessage, askTutor, ensureLessonConversation, listSubjects, trackLearningEvent, type LessonConversation, type Subject } from '@/services/api';
import { LessonMessageContent } from '@/components/lesson-message';
import { questionsForMobileAssessment, type AssessmentQuestion } from '@/services/assessment-bank';

type Message = { id: string; role: 'user' | 'model'; text: string; at?: string; suggestions?: string[] };
type TrackedSession = { id: string; startedAt: number; turns: number; subject: string; topic: string; awaitingSince?: number; awaitingMessageId?: string; handledMessageId?: string; interventionLevel?: number; selfReportedAffect?: string };
type MobileAssessment = { id: string; questions: AssessmentQuestion[]; index: number; answers: boolean[]; selected: number | null; result: { correct: boolean; explanation: string } | null; completed: boolean };
type IdleSupportStage = 'none' | 'nudge' | 'offer';

export default function LessonScreen() {
  const params = useLocalSearchParams<{ subject?: string; topic?: string; unit?: string; goal?: string; grade?: string; familiarity?: string }>();
  const { profile, session } = useSession();
  const subject = String(params.subject || 'Learning');
  const [topic, setTopic] = useState(String(params.topic || subject));
  const [unit, setUnit] = useState(String(params.unit || params.topic || subject));
  const [goal, setGoal] = useState(String(params.goal || ''));
  const [familiarity, setFamiliarity] = useState(String(params.familiarity || 'unknown'));
  const [subjectPath, setSubjectPath] = useState<Subject | null>(null);
  const [pathOpen, setPathOpen] = useState(false);
  const learnerName = profile?.name?.trim().split(/\s+/)[0] || session?.name?.trim().split(/\s+/)[0];
  const familiarityDescriptions: Record<string, string> = {
    new: 'brand new to this topic', beginner: 'has heard of it, but is not familiar with details',
    some: 'knows some basics', comfortable: 'fairly comfortable', reviewing: 'reviewing or preparing for an exam',
  };
  const familiarityDescription = familiarityDescriptions[familiarity] || 'not reported';
  const openingRequest = `Open the FIRST live lesson on "${topic}"${unit !== topic ? ` within "${unit}"` : ''} (${subject})${goal ? `, aiming at this learning goal: "${goal}"` : ''}. Topic familiarity self-report: ${familiarityDescription}. Treat this as a starting estimate, not proof of mastery. This is a distinct teaching stage: establish a useful mental model before relying on dialogue. Give an academically useful, age-appropriate orientation—not just a greeting, definition, roadmap, or diagnostic. Explain: (1) a clear definition, scope, and relation to the discipline; (2) the problem and why the topic exists; (3) core principles and cause-and-effect mechanisms; (4) major components, their responsibilities, and how they relate; (5) a meaningful example showing how it works; (6) practical applications; (7) relevant alternatives, limitations, assumptions, and trade-offs; (8) essential vs helpful prerequisites; (9) likely misconceptions and the corrected mental model; and (10) observable learning outcomes. Explain relationships, qualify context-dependent claims, and distinguish analogies from actual mechanisms. Adapt terminology, depth, examples, and prerequisite support to the learner's grade, goals, profile, familiarity, and demonstrated knowledge; unassessed concepts are not mastered. Cover essential foundations at overview depth. If the topic is too broad, name a few coherent orientation parts and teach a meaningful first part now; do not reduce the reply to a plan. Use a visual only when it clarifies a real relationship, architecture, comparison, process, or worked example, and explain what it shows. Create a topic-specific curriculum roadmap of 2–6 modules in prerequisite order, not a generic tutoring syllabus. For each module, include an observable objective, key concepts, prerequisite(s), an application or exercise, and evidence of learning. Keep the curriculum modules distinct from the tutoring lifecycle: orientation, conceptual teaching, guided practice, independent assessment/consolidation, and progress review/next steps. Include a \`type: study-plan\` visual card with objectives, concepts, and the ordered module list. After teaching, ask ONE focused, beginner-safe question about prior experience, a familiar application, or preferred starting point; never ask the learner to explain a mechanism not yet taught. Use their answer to distinguish demonstrated knowledge, partial understanding, misconceptions, and concepts not yet assessed. Keep greeting and praise brief.`;
  const openingId = useMemo(() => newMessageId(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [isResumed, setIsResumed] = useState(false);
  const [conversationWarning, setConversationWarning] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const conversationId = useRef<string | null>(null);
  const trackedSession = useRef<TrackedSession | null>(null);
  const history = useRef<{ role: 'user' | 'model'; text: string }[]>([]);
  const lastSuggestions = useRef<string[]>([]);
  const [draft, setDraft] = useState('');
  const [isListening, setIsListening] = useState(false);
  const speechSession = useRef<{ stop: () => void; cleanup?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState<MobileAssessment | null>(null);
  const [idleSupportStage, setIdleSupportStage] = useState<IdleSupportStage>('none');
  const [affectCheckInVisible, setAffectCheckInVisible] = useState(false);
  const [affectCheckInCount, setAffectCheckInCount] = useState(0);
  const learnerAffects = useRef<string[]>([]);
  const lastCheckInAt = useRef(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const grade = String(params.grade || profile?.grade || '');
  const system = useMemo(() => [
    'Mobile formatting: put programming examples in fenced code blocks with a language such as python, javascript, or cpp. For process diagrams, use a fenced mermaid block beginning with flowchart TD, simple named nodes A[Label], and --> arrows (optional |edge labels|). For visual models, use a fenced visual block with type: fraction, number-line, bar-chart, process, cycle, comparison, or study-plan; title: a short title; caption: an optional explanation. A study-plan visual has objectives: Goal 1 | Goal 2, concepts: Concept 1 | Concept 2, and 2–6 numbered topic-specific curriculum modules in prerequisite order, each as Module title | objective; concepts; prerequisites; application/exercise; evidence of learning. Fractions use rows such as 3/4 | Three quarters. Bar charts use rows such as Group A: 12. Processes use rows such as First step | Explanation. Comparisons use left: and right: labels, then rows such as Feature | Left value | Right value. Number lines use min:, max:, step:, and points: (for example 0, 0.5, 1). Use spatial ASCII art for other visual formats. Do not emit HTML, SVG, unsupported Mermaid diagram types, or executable scripts as visual demonstrations.',
    'You are Kindling, a warm, articulate, deeply knowledgeable, and highly structured private tutor whom parents trust to give their child a genuine, high-value education. Teach the learner the named lesson with substantive depth, visual demonstrations, and natural, flowing human conversation; never give clipped, robotic 1–2 sentence replies. Unpack the underlying "why" and intuition behind concepts, walk through concrete examples, and heavily invest in complementing your text with visual demonstrations (` ```diagram ` fenced blocks showing visual bars, number lines, step flows, comparisons, or spatial models) so the learner can see the idea in action. Use one focused visual when a single model captures the idea, or interleave multiple visuals right between the paragraphs they illustrate when explaining multiple stages, comparisons, or both a core concept and a worked example.',
    `Lesson focus: teach "${topic}" in the context of "${subject}" and the topic "${unit}". ${goal ? `The learning goal is: ${goal}.` : ''} Keep every explanation, visual demonstration, example, practice question, and follow-up suggestion 100% tied to this lesson.`,
    `Tutoring lifecycle: (1) topic orientation, (2) conceptual teaching across the topic's actual modules, (3) guided practice/problem solving, (4) independent assessment and consolidation, and (5) progress review/next steps. This lifecycle describes how to teach; it is not the academic curriculum. Use the module order in the Study Plan as a map, but adapt the next step to demonstrated understanding and prerequisite gaps. Exchange count is a pacing hint, never proof of coverage or mastery. Do not force the topic into four generic sections or declare the whole curriculum complete after a short check.`,
    `First response: teach the essential conceptual foundation before the diagnostic question, then present the topic-specific module roadmap. If the orientation needs multiple parts, continue a coherent part in the next turn while answering the learner's response. Later, engage thoughtfully with what the learner actually said, explain or revisit relevant modules, and use clear examples and meaningful visuals. Any assessment question must be answerable from a concept the tutor actually explained or practiced earlier in this lesson. A roadmap item, prior knowledge, or general topic association is not evidence that Kindling taught it. Use the examples and methods already covered; do not assess untaught or merely related concepts. If there is not enough covered material for a meaningful check, continue teaching instead. After instruction and practice, ask readiness before an assessment; report demonstrated, partial, mistaken, and unassessed knowledge accurately.`,
    `At the end of each reply, append a hidden suggestion block: ⟦suggests: option one | option two⟧ OR ⟦suggests: none⟧. Provide 0–3 chips only. Every chip must match the current orientation step, curriculum module, or actual content of your reply; offer an immediate next action or focused clarification. Do not recycle earlier chips, pad the list, jump ahead, or introduce a side topic. Use ⟦suggests: none⟧ for assessments and solo practice questions. When asking whether to begin an assessment, offer only 1–2 relevant confirmation choices. The block is interface metadata; never mention it.`,
    'Safety: you are an educational tutor only. Never provide sexual content, instructions for self-harm, weapons, or illegal acts. If the learner expresses crisis or abuse, pause tutoring, respond kindly, and encourage them to speak to a trusted adult right away. Do not ask for passwords, addresses, or secrets.',
    `Learner grade: ${grade || 'unknown; use child-safe language'}. Subject: ${subject}. Topic: ${unit}. Lesson: ${topic}. ${goal ? `Learning goal: ${goal}.` : ''}`,
    ageGuidance(profile?.dateOfBirth),
    `Learner preferences: ${profile?.learningStyle || 'visual'} learning style; topic familiarity self-report: ${familiarityDescription}; interests: ${profile?.interests?.length ? profile.interests.join(', ') : 'not specified'}; preferred tutoring language: ${profile?.preferredLanguage || 'English'}; overall learning goal: ${profile?.goal || 'build confidence'}. Adapt examples and pacing to these preferences, use the preferred language, and keep the explanation appropriate for the learner’s level. Familiarity is self-reported; look for demonstrated understanding before treating any concept as mastered.`,
    `Learner name: ${learnerName || 'not provided'}. Use their name naturally and sparingly; teaching the selected lesson comes first.`,
  ].join('\n\n'), [grade, subject, topic, unit, goal, learnerName, profile, familiarityDescription]);

  useEffect(() => {
    let active = true;
    void listSubjects().then((subjects) => {
      if (active) setSubjectPath(subjects.find((item) => item.name === subject) || null);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [subject]);

  const selectLesson = (nextUnit: string, nextTopic: string, nextGoal = '', nextFamiliarity = 'unknown') => {
    if (nextTopic === topic && nextUnit === unit) { setPathOpen(false); return; }
    setUnit(nextUnit); setTopic(nextTopic); setGoal(nextGoal); setFamiliarity(nextFamiliarity); setAssessment(null); setPathOpen(false);
  };

  useEffect(() => {
    let active = true;
    const restore = async () => {
      setConversationLoading(true);
      setConversationWarning('');
      setIsResumed(false);
      setMessages([]);
      lastSuggestions.current = [];
      conversationId.current = null;
      history.current = [];
      const previousSession = trackedSession.current;
      if (previousSession) {
        trackedSession.current = null;
        void trackLearningEvent('session.end', {
          subject: previousSession.subject, topic: previousSession.topic,
          durationMs: Math.max(0, Date.now() - previousSession.startedAt), turnCount: previousSession.turns,
        }, previousSession.id).catch(() => undefined);
      }
      try {
        const conversation = await ensureLessonConversation(subject, topic);
        if (!active) return;
        conversationId.current = conversation.id;
        const currentSession: TrackedSession = { id: newMessageId(), startedAt: Date.now(), turns: 0, subject, topic, interventionLevel: 0 };
        trackedSession.current = currentSession;
        void trackLearningEvent('session.start', {
          subject, topic,
          studentSnapshot: { name: profile?.name || '', grade: profile?.grade || '', learningStyle: profile?.learningStyle || 'visual', goal: profile?.goal || '' },
        }, currentSession.id).catch(() => undefined);
        const restored = toLessonMessages(conversation);
        const latestTutorIndex = restored.map((message) => message.role).lastIndexOf('model');
        if (latestTutorIndex >= 0) {
          const previousLearnerMessage = [...restored.slice(0, latestTutorIndex)].reverse().find((message) => message.role === 'user')?.text || '';
          const recentTutorText = restored[latestTutorIndex].text;
          const recoveredSuggestions = lessonFallbackSuggestions(topic, recentTutorText, previousLearnerMessage);
          restored[latestTutorIndex] = { ...restored[latestTutorIndex], suggestions: recoveredSuggestions };
          lastSuggestions.current = recoveredSuggestions;
        }
        const savedHistory: { role: 'user' | 'model'; text: string }[] = Array.isArray(conversation.apiHistory)
          ? conversation.apiHistory.filter((item) => (item.role === 'user' || item.role === 'model') && item.text?.trim()).slice(-80)
          : [];
        history.current = savedHistory.length ? savedHistory : restored.map(({ role, text }) => ({ role, text }));
        const latestVisible = restored.at(-1);
        const latestHistory = history.current.at(-1);
        if (latestVisible?.role === 'user' && latestHistory?.role !== 'user') {
          history.current.push({ role: 'user', text: latestVisible.text });
        }

        if (restored.length) {
          setMessages(restored);
          setIsResumed(true);
        } else {
          const rawIntroduction = await askTutor([{ role: 'user', text: openingRequest }], system);
          if (!active) return;
          const introduction = extractTutorSuggestions(rawIntroduction);
          if (!introduction.text) throw new Error('The tutor returned an empty introduction.');
          const opening: Message = {
            id: openingId,
            role: 'model',
            text: introduction.text,
            at: new Date().toISOString(),
            suggestions: relevantSuggestions(introduction.suggestions, topic, introduction.text, '', [], introduction.explicitNone, introduction.hasExplicitTag),
          };
          lastSuggestions.current = opening.suggestions || [];
          history.current = [{ role: 'model', text: opening.text }];
          setMessages([opening]);
          currentSession.awaitingSince = Date.now();
          try {
            await appendLessonMessage(conversation.id, { id: opening.id, role: 'tutor', text: opening.text, at: opening.at! }, { model: opening.text });
          } catch {
            if (active) setConversationWarning('This lesson could not be saved yet. Check your connection and try reopening it.');
          }
        }
      } catch {
        if (active) {
          setConversationWarning(`Could not prepare the lesson on ${topic}. Check your connection and try again.`);
        }
      } finally {
        if (active) setConversationLoading(false);
      }
    };
    const timer = setTimeout(() => { void restore(); }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [subject, topic, unit, goal, openingRequest, system, restoreAttempt, openingId, profile]);

  const latestMessageId = messages.at(-1)?.id;
  const latestMessageRole = messages.at(-1)?.role;
  useEffect(() => {
    const tracked = trackedSession.current;
    if (!tracked || busy || conversationLoading || assessment || latestMessageRole !== 'model' || !latestMessageId) return;
    // Start a fresh answer window after each tutor reply, including a resumed lesson.
    if (tracked.awaitingMessageId !== latestMessageId) {
      tracked.awaitingMessageId = latestMessageId;
      tracked.awaitingSince = Date.now();
      setIdleSupportStage('none');
    }
  }, [latestMessageId, latestMessageRole, busy, conversationLoading, assessment]);

  useEffect(() => {
    const timer = setInterval(() => {
      const tracked = trackedSession.current;
      if (!tracked?.awaitingSince || busy || conversationLoading || assessment || latestMessageRole !== 'model' || tracked.handledMessageId === tracked.awaitingMessageId) return;
      const elapsed = Date.now() - tracked.awaitingSince;
      if (elapsed >= 90_000) setIdleSupportStage('offer');
      else if (elapsed >= 45_000) setIdleSupportStage((stage) => stage === 'none' ? 'nudge' : stage);
    }, 2000);
    return () => clearInterval(timer);
  }, [busy, conversationLoading, assessment, latestMessageRole]);

  useEffect(() => {
    const tracked = trackedSession.current;
    if (!tracked || idleSupportStage === 'none') return;
    const idleMs = tracked.awaitingSince ? Date.now() - tracked.awaitingSince : 0;
    void trackLearningEvent('struggle.signal', { signal: 'idle', phase: idleSupportStage === 'offer' ? 'offer' : 'nudge', idleMs, subject, topic }, tracked.id).catch(() => undefined);
    if (idleSupportStage === 'offer') {
      void trackLearningEvent('intervention.offered', { subject, topic, reason: 'idle', level: 1 }, tracked.id).catch(() => undefined);
    }
  }, [idleSupportStage, subject, topic]);

  useEffect(() => {
    const tracked = trackedSession.current;
    if (!tracked || tracked.turns < 3 || affectCheckInCount >= 2 || affectCheckInVisible || idleSupportStage !== 'none' || Date.now() - lastCheckInAt.current < 8 * 60_000) return;
    const frustratedCount = learnerAffects.current.slice(-5).filter((affect) => affect === 'hesitant' || affect === 'frustrated').length;
    const longSession = tracked.turns >= 10 || Date.now() - tracked.startedAt >= 12 * 60_000;
    if (frustratedCount >= 2 || longSession) {
      setAffectCheckInVisible(true);
      lastCheckInAt.current = Date.now();
      void trackLearningEvent('affect.checkin', { subject, topic, phase: 'prompted', reason: frustratedCount >= 2 ? 'frustration_streak' : 'long_session' }, tracked.id).catch(() => undefined);
    }
  }, [messages.length, affectCheckInCount, affectCheckInVisible, subject, topic]);

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages, busy, error]);

  useEffect(() => () => {
    const current = trackedSession.current;
    if (!current) return;
    trackedSession.current = null;
    void trackLearningEvent('session.end', {
      subject: current.subject, topic: current.topic,
      durationMs: Math.max(0, Date.now() - current.startedAt), turnCount: current.turns,
    }, current.id).catch(() => undefined);
  }, []);

  const persistMessage = async (message: Message, role: 'tutor' | 'child', apiPair?: { user?: string; model?: string }) => {
    const id = conversationId.current;
    if (!id) return;
    try {
      await appendLessonMessage(id, { id: message.id, role, text: message.text, at: message.at || new Date().toISOString() }, apiPair);
    } catch {
      setConversationWarning('A message could not sync to your saved lesson. Reopen the lesson when you have a connection to resume it.');
    }
  };

  const ask = async (next: Message[], persistStudent = false) => {
    setBusy(true); setError('');
    try {
      const studentMessage = [...next].reverse().find((item) => item.role === 'user');
      if (!studentMessage) return;
      const trackedBeforeReply = trackedSession.current;
      const responseMs = trackedBeforeReply?.awaitingSince ? Math.max(0, Date.now() - trackedBeforeReply.awaitingSince) : undefined;
      if (persistStudent) await persistMessage(studentMessage, 'child');
      const requestHistory = [...history.current, { role: 'user' as const, text: studentMessage.text }].slice(-20);
      const exchangeCount = Math.floor(history.current.length / 2);
      const suggestionContext = `\n\nCurriculum Progress & Suggestion Adaptation (Exchange #${exchangeCount + 1}): Follow the topic-specific module roadmap while adapting to the learner's answer. Keep suggestions anchored to "${topic}" and provide only useful next actions. Use ⟦suggests: none⟧ for an assessment or direct solo question.${exchangeCount === 0 ? ` This is the learner's first response to the orientation. Respond to their actual answer; distinguish demonstrated knowledge, partial understanding, misconceptions, and concepts not yet assessed. Correct any foundational gap and continue with the earliest useful module. Do not repeat the full orientation or ask the learner to explain a mechanism they have not been taught.` : exchangeCount >= 4 ? ` Check the actual conversation, not just the counter: if the relevant learning objectives have been taught and applied, recap what has been practiced and ask whether they want a brief check now or another example first. Otherwise continue with the earliest uncovered objective or prerequisite. Do not claim the topic or curriculum is complete.` : ` Continue the earliest useful curriculum module based on demonstrated understanding. Revisit a prerequisite when needed, but do not skip essential outcomes or force a transition because of the exchange count.`}`;
      const selfReport = trackedSession.current?.selfReportedAffect;
      const supportDirective = selfReport === 'hesitant' || selfReport === 'frustrated'
        ? '\n\nLearner check-in: they said they feel stuck or need a break. Validate this gently, reduce the task to one manageable next step, and do not give away the full answer.'
        : selfReport === 'confident'
          ? '\n\nLearner check-in: they said they feel good. Keep a warm pace and offer a suitable next challenge without assuming mastery.'
          : selfReport === 'neutral' ? '\n\nLearner check-in: they said they are doing okay. Keep a steady, encouraging pace and check understanding naturally.' : '';
      const rawAnswer = await askTutor(requestHistory, `${system}${suggestionContext}${supportDirective}`);
      const parsed = extractTutorSuggestions(rawAnswer);
      const answer = parsed.text || `Let’s stay with ${topic}. I couldn’t form a clear explanation just now. Try asking about one part of this lesson again.`;
      const replySuggestions = relevantSuggestions(parsed.suggestions, topic, answer, studentMessage.text, lastSuggestions.current, parsed.explicitNone, parsed.hasExplicitTag);
      const reply: Message = { id: newMessageId(), role: 'model', text: answer, at: new Date().toISOString(), suggestions: replySuggestions };
      lastSuggestions.current = replySuggestions;
      history.current = [...history.current, { role: 'user' as const, text: studentMessage.text }, { role: 'model' as const, text: answer }].slice(-80);
      setMessages((current) => [...current, reply]);
      await persistMessage(reply, 'tutor', { user: studentMessage.text, model: answer });
      const tracked = trackedSession.current;
      if (tracked) {
        tracked.turns += 1;
        void trackLearningEvent('turn.exchange', {
          subject: tracked.subject, topic: tracked.topic,
          responseMs,
          signals: learnerProfileSignals(studentMessage.text, responseMs, tracked.interventionLevel || 0, tracked.selfReportedAffect), inputModality: 'text',
        }, tracked.id).catch(() => undefined);
        if (tracked.interventionLevel) {
          void trackLearningEvent('intervention.exited', { subject: tracked.subject, topic: tracked.topic, reason: 'hint_used', level: tracked.interventionLevel }, tracked.id).catch(() => undefined);
          tracked.interventionLevel = 0;
        }
        tracked.selfReportedAffect = undefined;
        tracked.awaitingSince = Date.now();
        tracked.awaitingMessageId = reply.id;
      }
      const cues = learnerProfileSignals(studentMessage.text);
      if (typeof cues.affect === 'string') learnerAffects.current.push(cues.affect);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The tutor couldn’t respond. Check your connection and try again.');
    } finally { setBusy(false); }
  };

  const sendMessage = (message: string) => {
    const text = message.trim();
    if (!text || busy || conversationLoading) return;
    const studentMessage: Message = { id: newMessageId(), role: 'user', text, at: new Date().toISOString() };
    const next = [...messages, studentMessage];
    setMessages(next);
    setDraft('');
    void ask(next, true);
  };
  const send = () => sendMessage(draft);

  useEffect(() => () => speechSession.current?.stop(), []);
  const toggleVoiceInput = async () => {
    if (isListening) {
      speechSession.current?.stop();
      return;
    }
    setError('');
    try {
      if (Platform.OS === 'web') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setError('Voice input is not supported in this browser.');
          return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = profile?.preferredLanguage || 'en-US';
        recognition.interimResults = false;
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => { setIsListening(false); speechSession.current = null; };
        recognition.onerror = () => { setIsListening(false); speechSession.current = null; setError('Voice input could not start. Check microphone permission and try again.'); };
        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript?.trim();
          if (transcript) setDraft((current) => `${current.trimEnd()}${current.trim() ? ' ' : ''}${transcript}`);
        };
        speechSession.current = { stop: () => recognition.stop() };
        recognition.start();
      } else {
        // Load lazily so Expo Go can still open lessons even though it does not bundle this native module.
        const { ExpoSpeechRecognitionModule } = await import('expo-speech-recognition');
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
          setError('Microphone permission is needed for voice input. You can enable it in device settings.');
          return;
        }
        let cleanup = () => {};
        const subscriptions = [
          ExpoSpeechRecognitionModule.addListener('start', () => setIsListening(true)),
          ExpoSpeechRecognitionModule.addListener('end', () => { setIsListening(false); cleanup(); speechSession.current = null; }),
          ExpoSpeechRecognitionModule.addListener('result', (event) => {
            const transcript = event.results[0]?.transcript?.trim();
            if (transcript) setDraft((current) => `${current.trimEnd()}${current.trim() ? ' ' : ''}${transcript}`);
          }),
          ExpoSpeechRecognitionModule.addListener('error', (event) => {
            setIsListening(false);
            cleanup();
            speechSession.current = null;
            if (event.error !== 'aborted') setError('Voice input could not start. Check microphone permission and try again.');
          }),
        ];
        cleanup = () => subscriptions.forEach((subscription) => subscription.remove());
        speechSession.current = { stop: () => ExpoSpeechRecognitionModule.stop(), cleanup };
        ExpoSpeechRecognitionModule.start({ lang: profile?.preferredLanguage || 'en-US', interimResults: false, continuous: false });
      }
    } catch {
      speechSession.current?.cleanup?.();
      speechSession.current = null;
      setIsListening(false);
      setError(Platform.OS === 'web' ? 'Voice input is unavailable on this device.' : 'Voice input needs the updated Kindling app. Install a new development or store build and try again.');
    }
  };

  const chooseIdleSupport = (choice: 'hint' | 'thinking' | 'dismiss') => {
    const tracked = trackedSession.current;
    if (!tracked) return;
    const idleMs = tracked.awaitingSince ? Date.now() - tracked.awaitingSince : 0;
    void trackLearningEvent('struggle.signal', { signal: 'idle', phase: choice === 'dismiss' ? 'dismissed' : choice, idleMs, subject, topic }, tracked.id).catch(() => undefined);
    if (choice === 'hint') {
      tracked.interventionLevel = 1;
      void trackLearningEvent('intervention.entered', { subject, topic, reason: 'idle', level: 1 }, tracked.id).catch(() => undefined);
      setIdleSupportStage('none');
      sendMessage('Could I get a small hint for the question you just asked? Please help me take the next step without giving away the full answer.');
    } else if (choice === 'thinking') {
      tracked.awaitingSince = Date.now();
      setIdleSupportStage('none');
      void trackLearningEvent('struggle.signal', { signal: 'idle', phase: 'still_thinking', idleMs, subject, topic }, tracked.id).catch(() => undefined);
    } else {
      tracked.handledMessageId = tracked.awaitingMessageId;
      setIdleSupportStage('none');
      void trackLearningEvent('intervention.declined', { subject, topic, reason: 'idle' }, tracked.id).catch(() => undefined);
    }
  };

  const answerAffectCheckIn = (optionId: 'great' | 'okay' | 'stuck' | 'break') => {
    const affect = optionId === 'great' ? 'confident' : optionId === 'okay' ? 'neutral' : optionId === 'stuck' ? 'hesitant' : 'frustrated';
    const tracked = trackedSession.current;
    learnerAffects.current.push(affect);
    if (tracked) {
      tracked.selfReportedAffect = affect;
      tracked.awaitingSince = Date.now();
      setIdleSupportStage('none');
    }
    setAffectCheckInVisible(false);
    setAffectCheckInCount((count) => count + 1);
    lastCheckInAt.current = Date.now();
    if (tracked) void trackLearningEvent('affect.checkin', { subject, topic, phase: 'response', reason: 'mid_session', optionId, affect }, tracked.id).catch(() => undefined);
    if (optionId === 'stuck' || optionId === 'break') {
      sendMessage(optionId === 'stuck' ? 'I am feeling a bit stuck. Please slow down and help me with one smaller step.' : 'I would like a short break, please.');
    }
  };

  const startAssessment = () => {
    const coveredText = messages
      .filter((message) => message.role === 'model' && message.text)
      .map((message) => message.text)
      .join('\n\n');
    const questions = questionsForMobileAssessment(subject, topic, 5, coveredText);
    if (!questions.length) {
      setError(`We have not covered enough check questions on ${topic} yet. Let's work through another example first.`);
      return;
    }
    const id = newMessageId();
    setAssessment({ id, questions, index: 0, answers: [], selected: null, result: null, completed: false });
    const tracked = trackedSession.current;
    if (tracked) void trackLearningEvent('assessment.started', { assessmentId: id, subject, topic, questionCount: questions.length, source: 'manual' }, tracked.id).catch(() => undefined);
  };

  const answerAssessment = (selectedIndex: number) => {
    if (!assessment || assessment.completed || assessment.result) return;
    const question = assessment.questions[assessment.index];
    const correct = selectedIndex === question.correctIndex;
    const explanation = correct ? question.explanationCorrect : question.explanationIncorrect;
    const answers = [...assessment.answers, correct];
    const tracked = trackedSession.current;
    const eventPayload = { assessmentId: assessment.id, questionId: question.id, questionIndex: assessment.index, selectedIndex, correct, correctness: correct ? 'correct' : 'incorrect', skillSlug: question.skillSlug, concept: question.concept || '', subject, topic };
    if (tracked) {
      void trackLearningEvent('assessment.answered', eventPayload, tracked.id).catch(() => undefined);
      void trackLearningEvent('turn.exchange', {
        subject, topic, studentText: question.options[selectedIndex]?.text || '', tutorText: explanation,
        gradeSource: 'assessment', signals: {
          correctness: correct ? 'correct' : 'incorrect', gradeSource: 'assessment', isHintRequest: false,
          signalEvidence: { correctness: { value: correct ? 'correct' : 'incorrect', confidence: 1, source: 'assessment', cues: [question.id] } },
        },
      }, tracked.id).catch(() => undefined);
      tracked.turns += 1;
    }
    setAssessment({ ...assessment, answers, selected: selectedIndex, result: { correct, explanation } });
  };

  const continueAssessment = () => {
    if (!assessment?.result) return;
    const nextIndex = assessment.index + 1;
    if (nextIndex >= assessment.questions.length) {
      const correct = assessment.answers.filter(Boolean).length;
      const tracked = trackedSession.current;
      if (tracked) void trackLearningEvent('assessment.completed', { assessmentId: assessment.id, subject, topic, correct, incorrect: assessment.questions.length - correct, total: assessment.questions.length, percent: Math.round((correct / assessment.questions.length) * 100), passed: correct / assessment.questions.length >= 0.6, source: 'manual', purpose: 'practice' }, tracked.id).catch(() => undefined);
      setAssessment({ ...assessment, completed: true, result: null, selected: null });
      return;
    }
    setAssessment({ ...assessment, index: nextIndex, result: null, selected: null });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to subjects" onPress={() => router.back()} hitSlop={8} style={styles.back}><Text style={styles.backGlyph}>‹</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open lesson path" onPress={() => setPathOpen(true)} style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.tutorEyebrow}>{subject.toUpperCase()} · TAP FOR PATH ▾</Text>
            <Text numberOfLines={1} style={styles.subject}>{topic}</Text>
            {unit && unit !== topic ? <Text numberOfLines={1} style={styles.topic}>{unit}</Text> : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start lesson check"
            disabled={conversationLoading || busy}
            onPress={startAssessment}
            style={({ pressed }) => [styles.checkHeaderBtn, (conversationLoading || busy) && styles.checkHeaderBtnDisabled, pressed && styles.sendPressed]}
          >
            <Text style={styles.checkHeaderBtnText}>✓ Check</Text>
          </Pressable>
        </View>

        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messageContent} keyboardShouldPersistTaps="handled">
          {conversationLoading ? <View style={styles.threadStatus}><ActivityIndicator size="small" color={Brand.teal} /><Text style={styles.threadStatusText}>Preparing your lesson on {topic}…</Text></View> : null}
          {isResumed ? <Text style={styles.resumeLabel}>PICKING UP WHERE YOU LEFT OFF</Text> : null}
          {conversationWarning ? <View style={styles.warningBox}><Text style={styles.warningText}>{conversationWarning}</Text><Pressable accessibilityRole="button" onPress={() => setRestoreAttempt((attempt) => attempt + 1)}><Text style={styles.retry}>Try to reconnect</Text></Pressable></View> : null}
          {messages.map((message, index) => (
            <View key={`${index}-${message.role}`} style={[styles.messageGroup, message.role === 'user' && styles.userMessageGroup]}>
              {message.role === 'model' ? <View style={styles.tutorAttribution}><BrandMark size={19} /><Text style={styles.tutorName}>Kindling</Text></View> : null}
              <View style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.tutorBubble]}>
                <LessonMessageContent text={message.text} isUser={message.role === 'user'} textStyle={[styles.bubbleText, message.role === 'user' && styles.userText]} />
              </View>
              {message.role === 'model' && index === messages.length - 1 && !busy && (message.suggestions?.length || 0) > 0 ? (
                <View style={styles.suggestions}>
                  <Text style={styles.suggestionLabel}>SUGGESTED REPLIES</Text>
                  <View style={styles.suggestionWrap}>
                    {(message.suggestions || []).map((reply) => (
                      <Pressable key={reply} accessibilityRole="button" disabled={busy} onPress={() => sendMessage(reply)} style={({ pressed }) => [styles.suggestionChip, pressed && styles.sendPressed]}>
                        <Text style={styles.suggestionText}>{reply}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ))}
          {busy ? <View accessibilityLiveRegion="polite" style={[styles.bubble, styles.tutorBubble, styles.thinking]}><ActivityIndicator size="small" color={Brand.teal} /><Text style={styles.thinkingText}>Kindling is thinking…</Text></View> : null}
          {idleSupportStage !== 'none' && !assessment ? <View style={styles.supportCard}><Text style={styles.assessmentEyebrow}>{idleSupportStage === 'offer' ? 'HERE IF YOU NEED ME' : 'TAKE YOUR TIME'}</Text><Text style={styles.assessmentTitle}>{idleSupportStage === 'offer' ? 'Would a small hint help?' : 'Still thinking? No rush.'}</Text><Text style={styles.assessmentBody}>{idleSupportStage === 'offer' ? `I can break the next step down for ${topic}. You can also keep thinking on your own.` : 'Take the time you need. If you get stuck, Kindling can offer a small hint.'}</Text><View style={styles.supportActions}><Pressable accessibilityRole="button" onPress={() => chooseIdleSupport('hint')} style={styles.assessmentButton}><Text style={styles.assessmentButtonText}>Give me a hint</Text></Pressable><Pressable accessibilityRole="button" onPress={() => chooseIdleSupport('thinking')} style={styles.supportSecondary}><Text style={styles.supportSecondaryText}>Still thinking</Text></Pressable><Pressable accessibilityRole="button" onPress={() => chooseIdleSupport('dismiss')} style={styles.supportDismiss}><Text style={styles.supportSecondaryText}>I’m okay</Text></Pressable></View></View> : null}
          {affectCheckInVisible && idleSupportStage === 'none' && !assessment ? <View style={styles.supportCard}><Text style={styles.assessmentEyebrow}>QUICK CHECK-IN</Text><Text style={styles.assessmentTitle}>How are you feeling about this lesson?</Text><Text style={styles.assessmentBody}>Your answer helps Kindling adjust the pace and support.</Text><View style={styles.checkInActions}>{([['great', '🌟 Feeling good'], ['okay', '🙂 Doing okay'], ['stuck', '💭 A bit stuck'], ['break', '🌿 Need a break']] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="button" onPress={() => answerAffectCheckIn(id)} style={styles.supportSecondary}><Text style={styles.supportSecondaryText}>{label}</Text></Pressable>)}</View></View> : null}
          {!conversationLoading && !busy && !assessment && messages.length >= 5 ? (
            <View style={styles.assessmentCard}>
              <Text style={styles.assessmentEyebrow}>LESSON CHECK</Text>
              <Text style={styles.assessmentTitle}>Ready to check {topic}?</Text>
              <Text style={styles.assessmentBody}>Try a quick 5-question check with instant tutor feedback to lock in what you’ve practiced.</Text>
              <Pressable accessibilityRole="button" onPress={startAssessment} style={({ pressed }) => [styles.assessmentButton, pressed && styles.sendPressed]}>
                <Text style={styles.assessmentButtonText}>Start quick check</Text>
              </Pressable>
            </View>
          ) : null}
          {assessment && !assessment.completed ? (() => {
            const question = assessment.questions[assessment.index];
            return (
              <View style={styles.assessmentCard}>
                <View style={styles.assessmentTopRow}>
                  <Text style={styles.assessmentEyebrow}>QUESTION {assessment.index + 1} OF {assessment.questions.length}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Close check" onPress={() => setAssessment(null)} hitSlop={8}>
                    <Text style={styles.assessmentDismissText}>Close ×</Text>
                  </Pressable>
                </View>
                <Text style={styles.assessmentTitle}>{question.prompt}</Text>
                {question.options.map((option, index) => (
                  <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ disabled: Boolean(assessment.result), selected: assessment.selected === index }} disabled={Boolean(assessment.result)} onPress={() => answerAssessment(index)} style={[styles.assessmentOption, assessment.result && index === question.correctIndex && styles.assessmentOptionCorrect, assessment.result && assessment.selected === index && !assessment.result.correct && styles.assessmentOptionIncorrect]}>
                    <Text style={styles.assessmentOptionText}>{option.text}</Text>
                  </Pressable>
                ))}
                {assessment.result ? (
                  <>
                    <Text style={styles.assessmentFeedback}>{assessment.result.correct ? '✓ That’s right!' : 'Good try — let’s review.'} {assessment.result.explanation}</Text>
                    <Pressable accessibilityRole="button" onPress={continueAssessment} style={styles.assessmentButton}>
                      <Text style={styles.assessmentButtonText}>{assessment.index + 1 === assessment.questions.length ? 'See results' : 'Next question →'}</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.assessmentBody}>Choose the best answer to see a tutor explanation.</Text>
                )}
              </View>
            );
          })() : null}
          {assessment?.completed ? (
            <View style={styles.assessmentCard}>
              <View style={styles.assessmentTopRow}>
                <Text style={styles.assessmentEyebrow}>CHECK COMPLETE</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Dismiss check results" onPress={() => setAssessment(null)} hitSlop={8}>
                  <Text style={styles.assessmentDismissText}>Done</Text>
                </Pressable>
              </View>
              <Text style={styles.assessmentTitle}>You got {assessment.answers.filter(Boolean).length} of {assessment.questions.length} correct</Text>
              <Text style={styles.assessmentBody}>Your scored answers have been added to your mastery profile.</Text>
              <Pressable accessibilityRole="button" onPress={startAssessment} style={styles.assessmentButton}>
                <Text style={styles.assessmentButtonText}>Try another check</Text>
              </Pressable>
            </View>
          ) : null}
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { const lastUser = [...messages].reverse().find((item) => item.role === 'user'); if (lastUser) void ask(messages); }}><Text style={styles.retry}>Try again</Text></Pressable></View> : null}
        </ScrollView>

        <View style={styles.composer}>
          <Pressable accessibilityRole="button" accessibilityLabel={isListening ? 'Stop voice input' : 'Start voice input'} accessibilityState={{ selected: isListening }} disabled={conversationLoading || busy} onPress={toggleVoiceInput} style={({ pressed }) => [styles.voiceButton, isListening && styles.voiceButtonActive, pressed && styles.sendPressed]}>
            <Text style={[styles.voiceGlyph, isListening && styles.voiceGlyphActive]}>{isListening ? '■' : '🎙'}</Text>
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            editable={!conversationLoading}
            style={styles.input}
            placeholder={isListening ? 'Listening… speak now' : conversationLoading ? 'Opening saved lesson…' : 'Ask or share your thinking…'}
            placeholderTextColor="#718079"
            multiline
            blurOnSubmit={false}
            submitBehavior="newline"
            textAlignVertical="top"
            numberOfLines={Platform.OS === 'web' ? Math.min(5, Math.max(1, draft.split('\n').length)) : undefined}
            maxLength={1200}
            accessibilityLabel="Your message to Kindling"
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim() || busy || conversationLoading} onPress={send} style={({ pressed }) => [styles.send, (!draft.trim() || busy || conversationLoading) && styles.sendDisabled, pressed && styles.sendPressed]}><Text style={styles.sendGlyph}>↑</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={pathOpen} transparent animationType="slide" onRequestClose={() => setPathOpen(false)}>
        <View style={styles.pathShade}><Pressable accessibilityRole="button" accessibilityLabel="Close lesson path" style={StyleSheet.absoluteFill} onPress={() => setPathOpen(false)} /><View style={styles.pathSheet}>
          <View style={styles.pathHeading}><View style={styles.flex}><Text style={styles.pathEyebrow}>YOUR LEARNING PATH</Text><Text style={styles.pathTitle}>Topics & lessons</Text></View><Pressable accessibilityRole="button" onPress={() => setPathOpen(false)} style={styles.pathClose}><Text style={styles.pathCloseText}>×</Text></Pressable></View>
          <ScrollView style={styles.pathList} keyboardShouldPersistTaps="handled">
            {subjectPath?.topics.map((topicRow, index) => {
              const leaves = topicRow.subtopics.filter((leaf) => leaf.id !== topicRow.id || leaf.name !== topicRow.name);
              const lessons = leaves.length ? leaves : [{ id: topicRow.id, name: topicRow.name, learningGoal: topicRow.learningGoal || '', familiarity: topicRow.familiarity || 'unknown', unitName: topicRow.name }];
              return <View key={`${topicRow.id}-${topicRow.name}`} style={styles.pathTopic}>
                <Text style={styles.pathTopicName}>{String(index + 1).padStart(2, '0')}  {topicRow.name}</Text>
                {lessons.map((lesson, lessonIndex) => <Pressable key={`${lesson.id}-${lesson.name}`} accessibilityRole="button" accessibilityState={{ selected: topic === lesson.name && unit === topicRow.name }} onPress={() => selectLesson(topicRow.name, lesson.name, lesson.learningGoal, lesson.familiarity)} style={[styles.pathLesson, topic === lesson.name && unit === topicRow.name && styles.pathLessonActive]}><View style={[styles.pathLessonDot, topic === lesson.name && unit === topicRow.name && styles.pathLessonDotActive]}><Text style={[styles.pathLessonNumber, topic === lesson.name && unit === topicRow.name && styles.pathLessonNumberActive]}>{lessonIndex + 1}</Text></View><Text style={[styles.pathLessonText, topic === lesson.name && unit === topicRow.name && styles.pathLessonTextActive]}>{lesson.name}</Text>{topic === lesson.name && unit === topicRow.name ? <Text style={styles.pathCurrent}>CURRENT</Text> : null}</Pressable>)}
              </View>;
            })}
            {!subjectPath?.topics.length ? <Text style={styles.pathEmpty}>Add topics and lesson subtopics from your subject workspace.</Text> : null}
          </ScrollView>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function extractTutorSuggestions(rawText: string) {
  const source = String(rawText || '');
  const suggestions: string[] = [];
  const blockPattern = /⟦\s*suggests?\b([^⟧]*)⟧|\[\[\s*suggests?\s*:?\s*([^\]]*)\]\]/gi;
  let match: RegExpExecArray | null;
  let sawNone = false;
  let hasExplicitTag = false;
  while ((match = blockPattern.exec(source)) !== null) {
    hasExplicitTag = true;
    const body = (match[1] || match[2] || '').replace(/^[:\s]+/, '').trim();
    if (!body || /^(none|null|nil|empty|0|no\s+suggestions?|omit|-|—|\[\])$/i.test(body)) {
      sawNone = true;
      continue;
    }
    suggestions.push(...body.split(/[|\n;]/).map((item) => item.replace(/^\s*[-•*\d.)]+\s*/, '').replace(/^['"“”]+|['"“”]+$/g, '').trim()));
  }
  const text = source.replace(blockPattern, '').replace(/\n{3,}/g, '\n\n').trim();
  const valid = [...new Set(suggestions.filter((item) => item.length >= 3 && item.length <= 90 && !/^(none|null|empty|0)$/i.test(item)))].slice(0, 5);
  return { text, suggestions: valid, explicitNone: sawNone && valid.length === 0, hasExplicitTag };
}

function topicKeywords(topic: string) {
  const stopWords = new Set(['about', 'after', 'and', 'are', 'basics', 'from', 'how', 'into', 'lesson', 'learn', 'learning', 'overview', 'that', 'the', 'their', 'this', 'through', 'understanding', 'using', 'what', 'with', 'please', 'show', 'give', 'explain', 'another', 'more', 'me', 'my', 'can', 'you']);
  return String(topic || '').toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2 && !stopWords.has(word)) || [];
}

function suggestionMatchesTurn(suggestion: string, topic: string, tutorText: string) {
  const candidate = suggestion.toLowerCase();
  if (/\b(connect this to|talk about something else|different subject|switch subjects?|tell me a joke|let'?s chat about)\b/i.test(candidate)) return false;
  const topicTerms = topicKeywords(topic);
  if (topicTerms.some((term) => candidate.includes(term))) return true;
  const tutorTerms = new Set((tutorText.toLowerCase().match(/[a-z0-9]+/g) || []).filter((term) => term.length > 3));
  const candidateTerms = candidate.match(/[a-z0-9]+/g) || [];
  const genericActions = new Set(['example', 'visual', 'diagram', 'step', 'section', 'practice', 'question', 'understanding', 'check', 'answer', 'explain', 'clarify', 'continue', 'next', 'show', 'another', 'more', 'harder', 'simpler', 'review', 'assessment', 'ready', 'try', 'me', 'my', 'let', 'give', 'walk', 'through', 'one', 'the', 'this', 'that', 'what', 'how', 'can', 'you', 'with', 'about', 'please']);
  return candidateTerms.some((term) => tutorTerms.has(term) && !genericActions.has(term)) ||
    (candidateTerms.some((term) => genericActions.has(term)) && /\b(example|visual|diagram|step|section|practice|question|understanding|check|answer|assessment|review|orientation)\b/i.test(tutorText));
}

function relevantSuggestions(suggestions: string[], topic: string, tutorText: string, learnerText = '', previousSuggestions: string[] = [], explicitNone = false, hasExplicitTag = false) {
  if (explicitNone) return [];
  const assessmentConfirmation = /\b(?:would you like to (?:start|begin)|ready to (?:start|begin)|ready for (?:the )?(?:quick )?assessment|confirm(?:ation)? to start|start the quick assessment)\b/i.test(tutorText);
  if (assessmentConfirmation && suggestions.length === 0 && !hasExplicitTag) {
    const short = topic.length > 24 ? `${topic.slice(0, 23).trimEnd()}…` : topic;
    return [`Yes, start the quick assessment on ${short}`, `Let's review one more example of ${short} first`];
  }
  if (/\b(assessment\s+questions?|question\s+1\s*(?:of\s*\d+|[:.)])|type\s+your\s+answers?\s+below|solve\s+(?:these|this)\s+on\s+your\s+own|your\s+turn\s+to\s+(?:try|solve|answer)|try\s+this\s+(?:one|problem|question))\b/i.test(tutorText) && suggestions.length === 0) {
    return [];
  }
  const recent = new Set(previousSuggestions.map((suggestion) => suggestion.toLowerCase().trim()));
  const filtered = suggestions.filter((suggestion) => {
    const normalized = suggestion.toLowerCase().trim();
    return Boolean(normalized && !recent.has(normalized) && suggestionMatchesTurn(suggestion, topic, tutorText));
  });
  if (filtered.length > 0) return filtered.slice(0, 3);
  // A malformed or off-stage explicit chip block should not be replaced with unrelated guesses.
  if (hasExplicitTag) return [];
  return lessonFallbackSuggestions(topic, tutorText, learnerText, previousSuggestions).slice(0, 3);
}

function lessonFallbackSuggestions(topic: string, tutorText = '', learnerText = '', previousSuggestions: string[] = []) {
  const label = String(topic || 'this lesson').trim();
  const short = label.length > 24 ? `${label.slice(0, 23).trimEnd()}…` : label;
  const learner = learnerText.toLowerCase();
  const confusion = /\b(confus(?:ed|ing)?|stuck|hard|difficult|don.t understand|don.t get it|not sure|wrong|why)\b/.test(learner);
  const confidence = /\b(i get it|got it|i understand|understood|that makes sense|easy|ready)\b/.test(learner);
  const askedForPractice = /\b(practice|practise|question|quiz|try one|challenge)\b/.test(learner);
  const askedForExample = /\b(example|show me|step by step)\b/.test(learner);
  const hasCorrection = /\b(not quite|instead|the key idea|common mistake|remember)\b/i.test(tutorText);
  const assessmentConfirmation = /\b(?:would you like to (?:start|begin)|ready to (?:start|begin)|ready for (?:the )?(?:quick )?assessment|confirm(?:ation)? to start|start the quick assessment)\b/i.test(tutorText);
  if (assessmentConfirmation) {
    return [`Yes, start the quick assessment on ${short}`, `Let's review one more example of ${short} first`];
  }
  const directPractice = /\b(assessment\s+questions?|question\s+1\s*(?:of\s*\d+|[:.)])|type\s+your\s+answers?\s+below|solve\s+(?:these|this)\s+on\s+your\s+own|your\s+turn\s+to\s+(?:try|solve|answer)|try\s+this\s+(?:one|problem|question))\b/i.test(tutorText);
  if (directPractice) return [];
  const stageModes: [string, string][] | null = /\b(?:topic\s+orientation|orientation\s*(?:—|-)?\s*part|diagnostic)\b/i.test(tutorText)
    ? [['map', `Clarify how the main ideas in ${short} connect`], ['gap', `Continue the topic orientation for ${short}`]]
    : /\b(?:section\s*2|worked application|worked example|step.by.step)\b/i.test(tutorText)
      ? [['work', `Continue the worked example in ${short}`], ['step', `Explain the next step in ${short}`], ['try', `Try a similar ${short} example`]]
      : /\b(?:section\s*3|guided practice|your turn|practice)\b/i.test(tutorText)
        ? [['hint', `Give me a hint for this ${short} practice`], ['check', `Check my ${short} reasoning`], ['practice', `Try another ${short} practice question`]]
        : /\b(?:section\s*4|next steps|completed|assessment complete)\b/i.test(tutorText)
          ? [['recap', `Summarize the key ideas in ${short}`], ['apply', `Show one real use of ${short}`]]
          : null;
  const modes = stageModes || (confusion
    ? [
        ['simpler', `Explain ${short} another way`],
        ['example', `Show me an example of ${short}`],
        ['step', `Walk me through ${short} one step at a time`],
        ['check', `Check my understanding of ${short}`],
        ['mistake', `Show a common mistake in ${short}`],
      ]
    : confidence
      ? [
          ['challenge', `Give me a harder ${short} question`],
          ['apply', `Show how ${short} is used in real life`],
          ['practice', `Give me a new practice question on ${short}`],
          ['check', `Check my understanding of ${short}`],
          ['mistake', `Show a tricky part of ${short}`],
        ]
      : askedForPractice
        ? [
            ['practice', `Give me a new practice question on ${short}`],
            ['check', `Check my answer about ${short}`],
            ['step', `Walk through a ${short} question with me`],
            ['example', `Show me an example of ${short}`],
            ['challenge', `Give me a harder ${short} question`],
          ]
        : askedForExample
          ? [
              ['example', `Show me a different example of ${short}`],
              ['practice', `Let me try a question about ${short}`],
              ['step', `Walk me through ${short} one step at a time`],
              ['check', `Check my understanding of ${short}`],
              ['apply', `Show how ${short} is used in real life`],
            ]
          : [
              [hasCorrection ? 'mistake' : 'example', hasCorrection ? `Show a common mistake in ${short}` : `Show me an example of ${short}`],
              ['practice', `Give me a practice question on ${short}`],
              ['simpler', `Explain ${short} another way`],
              ['check', `Check my understanding of ${short}`],
              ['step', `Walk me through ${short} one step at a time`],
              ['apply', `Show how ${short} is used in real life`],
              ['challenge', `Give me a harder ${short} question`],
        ]);
  const recent = new Set(previousSuggestions.map((suggestion) => suggestion.toLowerCase().trim()));
  const fresh = modes.filter(([, suggestion]) => !recent.has(suggestion.toLowerCase().trim())).map(([, suggestion]) => suggestion);
  const previousModes = modes.filter(([, suggestion]) => recent.has(suggestion.toLowerCase().trim())).map(([, suggestion]) => suggestion);
  return [...fresh, ...previousModes].slice(0, 4);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.parchment },
  flex: { flex: 1, minWidth: 0 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Brand.line, backgroundColor: Brand.parchment },
  back: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.line },
  backGlyph: { color: Brand.pine, fontSize: 30, lineHeight: 33, marginTop: -2 },
  headerCopy: { flex: 1, minWidth: 0, gap: 1 },
  tutorEyebrow: { color: Brand.teal, fontWeight: '800', fontSize: 10, letterSpacing: 0.7 },
  subject: { color: Brand.pine, fontWeight: '800', fontSize: 16, lineHeight: 20 },
  topic: { color: Brand.muted, fontSize: 12, lineHeight: 16 },
  checkHeaderBtn: { minHeight: 36, paddingHorizontal: 12, borderRadius: 99, backgroundColor: Brand.tealPale, borderWidth: 1, borderColor: '#B8DDD0', alignItems: 'center', justifyContent: 'center' },
  checkHeaderBtnDisabled: { opacity: 0.45 },
  checkHeaderBtnText: { color: Brand.pine, fontSize: 12, fontWeight: '800' },
  messages: { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 24, gap: 14 },
  messageGroup: { alignSelf: 'stretch', gap: 8 },
  userMessageGroup: { alignItems: 'flex-end' },
  tutorAttribution: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tutorName: { color: Brand.teal, fontSize: 12, fontWeight: '700' },
  bubble: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20 },
  tutorBubble: { width: '100%', maxWidth: '100%', alignSelf: 'stretch', backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.line },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: Brand.pine, borderBottomRightRadius: 6 },
  bubbleText: { color: Brand.ink, fontSize: 16, lineHeight: 24 },
  userText: { color: '#fff' },
  suggestions: { gap: 8, paddingTop: 2 },
  suggestionLabel: { color: Brand.muted, fontSize: 10, letterSpacing: 0.9, fontWeight: '700' },
  suggestionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { minHeight: 38, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: Brand.line, backgroundColor: '#fff', justifyContent: 'center' },
  suggestionText: { color: Brand.pine, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 },
  thinkingText: { color: Brand.muted, fontSize: 14 },
  threadStatus: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 14 },
  threadStatusText: { color: Brand.muted, fontSize: 14 },
  assessmentCard: { alignSelf: 'stretch', padding: 18, borderRadius: 20, backgroundColor: '#EAF4EF', borderWidth: 1, borderColor: '#C8DED2', gap: 10 },
  assessmentTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  assessmentEyebrow: { color: Brand.teal, fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  assessmentDismissText: { color: Brand.muted, fontSize: 12, fontWeight: '700' },
  assessmentTitle: { color: Brand.pine, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  assessmentBody: { color: Brand.muted, fontSize: 13, lineHeight: 19 },
  assessmentButton: { alignSelf: 'flex-start', minHeight: 42, paddingHorizontal: 16, borderRadius: 13, backgroundColor: Brand.pine, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  assessmentButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  assessmentOption: { minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Brand.line, backgroundColor: '#fff', justifyContent: 'center' },
  assessmentOptionCorrect: { borderColor: Brand.teal, backgroundColor: '#DDF0E5' },
  assessmentOptionIncorrect: { borderColor: Brand.error, backgroundColor: '#FCECE9' },
  assessmentOptionText: { color: Brand.ink, fontSize: 14, lineHeight: 20 },
  assessmentFeedback: { color: Brand.ink, fontSize: 13, lineHeight: 20, paddingVertical: 4 },
  supportCard: { alignSelf: 'stretch', padding: 16, borderRadius: 18, backgroundColor: '#FFF5DF', borderWidth: 1, borderColor: '#EAD6A6', gap: 9 },
  supportActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 3 },
  supportSecondary: { minHeight: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: Brand.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  supportSecondaryText: { color: Brand.pine, fontSize: 13, fontWeight: '700' },
  supportDismiss: { minHeight: 40, paddingHorizontal: 10, justifyContent: 'center' },
  checkInActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 3 },
  resumeLabel: { color: Brand.teal, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  warningBox: { alignSelf: 'stretch', padding: 12, borderRadius: 13, backgroundColor: '#FFF4D9', gap: 6 },
  warningText: { color: Brand.ink, fontSize: 13, lineHeight: 19 },
  errorBox: { alignSelf: 'stretch', padding: 13, borderRadius: 14, backgroundColor: '#FCECE9', gap: 8 },
  errorText: { color: Brand.error, fontSize: 14, lineHeight: 20 },
  retry: { color: Brand.pine, fontSize: 14, fontWeight: '700' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: Brand.line, padding: 12, paddingBottom: 10, backgroundColor: '#fff' },
  voiceButton: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.parchment },
  voiceButtonActive: { backgroundColor: Brand.teal },
  voiceGlyph: { color: Brand.pine, fontSize: 19 },
  voiceGlyphActive: { color: '#fff' },
  input: { flex: 1, minHeight: 46, maxHeight: 140, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: Brand.parchment, color: Brand.ink, fontSize: 16, lineHeight: 21, textAlignVertical: 'top' },
  send: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.pine },
  sendDisabled: { backgroundColor: '#A9B2AD' },
  sendPressed: { opacity: 0.7 },
  sendGlyph: { color: '#fff', fontSize: 24, lineHeight: 28, fontWeight: '700' },
  pathShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,31,27,0.42)' },
  pathSheet: { maxHeight: '82%', backgroundColor: Brand.parchment, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 30, gap: 12 },
  pathHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pathEyebrow: { color: Brand.teal, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  pathTitle: { color: Brand.pine, fontSize: 22, fontWeight: '800', marginTop: 3 },
  pathClose: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  pathCloseText: { color: Brand.pine, fontSize: 27, lineHeight: 30 },
  pathList: { flexGrow: 0 },
  pathTopic: { borderTopWidth: 1, borderTopColor: Brand.line, paddingTop: 14, paddingBottom: 5 },
  pathTopicName: { color: Brand.pine, fontSize: 15, fontWeight: '700', marginBottom: 7 },
  pathLesson: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 13, paddingHorizontal: 9 },
  pathLessonActive: { backgroundColor: Brand.tealPale },
  pathLessonDot: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EBDD' },
  pathLessonDotActive: { backgroundColor: Brand.teal },
  pathLessonNumber: { color: Brand.pine, fontSize: 12, fontWeight: '700' },
  pathLessonNumberActive: { color: '#fff' },
  pathLessonText: { flex: 1, minWidth: 0, color: Brand.ink, fontSize: 14, fontWeight: '600' },
  pathLessonTextActive: { color: Brand.pine, fontWeight: '700' },
  pathCurrent: { color: Brand.teal, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  pathEmpty: { color: Brand.muted, fontSize: 14, lineHeight: 21, paddingVertical: 16 },
});

function newMessageId() {
  return `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function learnerProfileSignals(text: string, responseMs?: number, interventionLevel = 0, selfReportedAffect?: string) {
  const normalized = text.toLowerCase();
  const confident = /\b(i(?:'m| am) sure|i understand|i get it|got it|that makes sense|i can do this|easy)\b/.test(normalized);
  const hesitant = /\b(not sure|i(?:'m| am) confused|i(?:'m| am) stuck|i don(?:'t|t) understand|i don(?:'t|t) get it|this is hard|i need help)\b/.test(normalized);
  const isHintRequest = /\b(hint|help me|give me the answer|show me how|i(?:'m| am) stuck|not sure)\b/.test(normalized);
  const lexicalAffect = confident && !hesitant ? 'confident' : hesitant ? 'hesitant' : undefined;
  const affect = selfReportedAffect || lexicalAffect;
  const wordCount = normalized.match(/[a-z0-9']+/g)?.length || 0;
  const signals: Record<string, unknown> = {
    correctness: 'unknown',
    isHintRequest,
    isQuestion: /\?|^(what|why|when|where|who|how|can you|could you)\b/.test(normalized.trim()),
    responseMs,
    wordCount,
    interventionActive: interventionLevel > 0,
    interventionLevel,
    engagement: affect === 'confident' ? 0.85 : affect === 'frustrated' ? 0.3 : affect === 'hesitant' ? 0.45 : responseMs != null && responseMs > 45_000 ? 0.8 : responseMs != null && responseMs < 2500 && wordCount < 4 ? 0.4 : 0.65,
  };
  if (affect) {
    signals.affect = affect;
    signals.signalEvidence = { affect: { value: affect, confidence: 0.85, source: selfReportedAffect ? 'explicit_checkin' : 'explicit_language' } };
    if (confident || hesitant) {
      const value = confident && !hesitant ? 0.85 : 0.25;
      signals.confidence = value;
      (signals.signalEvidence as Record<string, unknown>).learnerConfidence = { value, confidence: 0.75, source: 'explicit_language' };
    }
  }
  return signals;
}

function toLessonMessages(conversation: LessonConversation): Message[] {
  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  const visible = messages
    .filter((message) => message.role === 'tutor' || message.role === 'child')
    .map((message) => ({
      id: message.id || newMessageId(),
      role: message.role === 'child' ? 'user' as const : 'model' as const,
      text: message.text || '',
      at: message.at || undefined,
    }));
  if (visible.length) return visible;
  return (conversation.apiHistory || []).map((message) => ({ id: newMessageId(), role: message.role, text: message.text }));
}
