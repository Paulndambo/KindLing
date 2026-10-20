import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { BrandMark } from '@/components/mobile-ui';
import { useSession } from '@/context/session';
import { appendLessonMessage, askTutor, ensureLessonConversation, listSubjects, type LessonConversation, type Subject } from '@/services/api';
import { LessonMessageContent } from '@/components/lesson-message';

type Message = { id: string; role: 'user' | 'model'; text: string; at?: string; suggestions?: string[] };

export default function LessonScreen() {
  const params = useLocalSearchParams<{ subject?: string; topic?: string; unit?: string; goal?: string; grade?: string }>();
  const { profile, session } = useSession();
  const subject = String(params.subject || 'Learning');
  const [topic, setTopic] = useState(String(params.topic || subject));
  const [unit, setUnit] = useState(String(params.unit || params.topic || subject));
  const [goal, setGoal] = useState(String(params.goal || ''));
  const [subjectPath, setSubjectPath] = useState<Subject | null>(null);
  const [pathOpen, setPathOpen] = useState(false);
  const learnerName = profile?.name?.trim().split(/\s+/)[0] || session?.name?.trim().split(/\s+/)[0];
  const openingRequest = `Open the FIRST live lesson on "${topic}"${unit !== topic ? ` within "${unit}"` : ''} (${subject})${goal ? `, aiming at this learning goal: "${goal}"` : ''}. Because this is the first message introducing the learner to tutoring on "${topic}", structure your response like a smart, organized private tutor in three clear parts so our tutoring has a clear structure from start to finish: (1) **Topic Introduction**: Warmly introduce "${topic}" — explain what it is, why it matters in real life, and the big-picture intuition; (2) **Structured Topic Study Plan**: Lay out a complete Study Plan for "${topic}" including **Learning Objectives / Goals**, **Key Concepts**, and **4 Tutoring Sections** (Section 1: Core Intuition & Visual Foundation, Section 2: Core Mechanism & Worked Application, Section 3: Guided Practice & Problem Solving, Section 4: Wind-Down, Quick Assessment & Next Steps); (3) **Kick Off Section 1 Immediately**: Begin teaching Section 1 right away across 1–2 substantive paragraphs with a concrete real-world example and an inline **visual demonstration** (in a \`\`\`diagram fenced block), then finish with ONE focused question checking Section 1.`;
  const openingId = useMemo(() => newMessageId(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [isResumed, setIsResumed] = useState(false);
  const [conversationWarning, setConversationWarning] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const conversationId = useRef<string | null>(null);
  const history = useRef<{ role: 'user' | 'model'; text: string }[]>([]);
  const lastSuggestions = useRef<string[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const grade = String(params.grade || profile?.grade || '');
  const system = useMemo(() => [
    'You are Kindling, a warm, articulate, deeply knowledgeable, and highly structured private tutor whom parents trust to give their child a genuine, high-value education. Teach the learner the named lesson with substantive depth, visual demonstrations, and natural, flowing human conversation; never give clipped, robotic 1–2 sentence replies. Unpack the underlying "why" and intuition behind concepts, walk through concrete examples, and heavily invest in complementing your text with visual demonstrations (` ```diagram ` fenced blocks showing visual bars, number lines, step flows, comparisons, or spatial models) so the learner can see the idea in action. Use one focused visual when a single model captures the idea, or interleave multiple visuals right between the paragraphs they illustrate when explaining multiple stages, comparisons, or both a core concept and a worked example.',
    `Lesson focus: teach "${topic}" in the context of "${subject}" and the topic "${unit}". ${goal ? `The learning goal is: ${goal}.` : ''} Keep every explanation, visual demonstration, example, practice question, and follow-up suggestion 100% tied to this lesson.`,
    `Structured Topic Study Plan & Section-by-Section Guidance (Critical): Never let tutoring feel scattered or keep going endlessly without a foreseeable stopping point. Every lesson on "${topic}" is governed by a 4-Section Study Plan laid out in the first message: (Section 1) Core Intuition & Visual Foundation, (Section 2) Core Mechanism & Worked Application, (Section 3) Guided Practice & Problem Solving, and (Section 4) Wind-Down, Quick Assessment (After Confirmation) & Next Steps. Follow the Study Plan strictly in order (Section 1 → Section 2 → Section 3 → Section 4), explicitly signposting section transitions. When Sections 1–3 are covered (typically after 4–5 productive exchanges, or earlier if the learner masters the objectives), signal that you are winding down "${topic}", briefly recap the Study Plan objectives completed, and ask for the learner's confirmation to take Section 4's Quick Assessment. Once the learner confirms, present a focused 2–3 question Quick Assessment on "${topic}" (emitting ⟦suggests: none⟧ while they answer). After they answer the Quick Assessment, review their answers warmly, celebrate completing the full Study Plan on "${topic}", and point them to concrete potential next steps.`,
    'For the first tutor turn (introducing the topic), deliver three organized parts: (1) a rich Topic Introduction explaining what the topic is and why it matters in real life, (2) a clear Topic Study Plan detailing Learning Objectives/Goals, Key Concepts, and Sections 1–4, and (3) an immediate kickoff of Section 1 with substantive teaching, a worked example, one or more inline ` ```diagram ` visual demonstrations, and one focused check-in question on Section 1.',
    'For later turns, engage thoughtfully with the learner’s actual response, keep tutoring anchored to the active Section of your Study Plan, and advance methodically to the next Section with rich, grade-appropriate depth paired with a concrete example and one or more inline visual demonstrations (` ```diagram ` blocks placed between paragraphs). Ask one focused question or wind-down confirmation prompt at a time at the end of your turn.',
    `At the end of each reply, append a hidden suggestion block in this format: ⟦suggests: option one | option two⟧ OR ⟦suggests: none⟧. Every suggestion must stay 100% anchored to "${topic}" and help the learner navigate the Study Plan or move forward toward completing "${topic}" — never deviate to off-topic tangents, hobbies, or other subjects. It is NOT mandatory to always give 4 or 5 suggestions: provide 1, 2, 3, 4, or none (⟦suggests: none⟧) based on necessity (for example, emit ⟦suggests: none⟧ when presenting a Quick Assessment or direct solo practice question where the learner should type their own answer; emit 1–2 confirmation chips when asking to start the Quick Assessment). The block is interface metadata; never mention it.`,
    'Safety: you are an educational tutor only. Never provide sexual content, instructions for self-harm, weapons, or illegal acts. If the learner expresses crisis or abuse, pause tutoring, respond kindly, and encourage them to speak to a trusted adult right away. Do not ask for passwords, addresses, or secrets.',
    `Learner grade: ${grade || 'unknown; use child-safe language'}. Subject: ${subject}. Topic: ${unit}. Lesson: ${topic}. ${goal ? `Learning goal: ${goal}.` : ''}`,
    `Learner name: ${learnerName || 'not provided'}. Use their name naturally and sparingly; teaching the selected lesson comes first.`,
  ].join('\n\n'), [grade, subject, topic, unit, goal, learnerName]);

  useEffect(() => {
    let active = true;
    void listSubjects().then((subjects) => {
      if (active) setSubjectPath(subjects.find((item) => item.name === subject) || null);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [subject]);

  const selectLesson = (nextUnit: string, nextTopic: string, nextGoal = '') => {
    if (nextTopic === topic && nextUnit === unit) { setPathOpen(false); return; }
    setUnit(nextUnit); setTopic(nextTopic); setGoal(nextGoal); setPathOpen(false);
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
      try {
        const conversation = await ensureLessonConversation(subject, topic);
        if (!active) return;
        conversationId.current = conversation.id;
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
            suggestions: relevantSuggestions(introduction.suggestions, topic, introduction.text, '', [], introduction.explicitNone),
          };
          lastSuggestions.current = opening.suggestions || [];
          history.current = [{ role: 'model', text: opening.text }];
          setMessages([opening]);
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
  }, [subject, topic, unit, goal, openingRequest, system, restoreAttempt, openingId]);

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages, busy, error]);

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
      if (persistStudent) await persistMessage(studentMessage, 'child');
      const requestHistory = [...history.current, { role: 'user' as const, text: studentMessage.text }].slice(-20);
      const exchangeCount = Math.floor(history.current.length / 2);
      const activeSection = Math.min(3, exchangeCount + 1);
      const suggestionContext = `\n\nStudy Plan Pacing & Suggestion Adaptation (Exchange #${exchangeCount + 1}): Follow the 4-Section Study Plan established in your opening message strictly in order so tutoring stays structured. Keep every suggestion 100% anchored to navigating or moving forward in "${topic}". Provide 0 to 4 suggestions based on necessity (use ⟦suggests: none⟧ when presenting a Quick Assessment or direct solo question).${exchangeCount >= 4 ? ` You have covered Sections 1–3 of the Study Plan for "${topic}": transition to Section 4 (Wind-Down), ask confirmation for a Quick Assessment, present the Quick Assessment once confirmed, and point to Next Steps.` : ` Guide the learner methodically through Section ${activeSection} of the Study Plan toward Section ${activeSection + 1}.`}`;
      const rawAnswer = await askTutor(requestHistory, `${system}${suggestionContext}`);
      const parsed = extractTutorSuggestions(rawAnswer);
      const answer = parsed.text || `Let’s stay with ${topic}. I couldn’t form a clear explanation just now. Try asking about one part of this lesson again.`;
      const replySuggestions = relevantSuggestions(parsed.suggestions, topic, answer, studentMessage.text, lastSuggestions.current, parsed.explicitNone);
      const reply: Message = { id: newMessageId(), role: 'model', text: answer, at: new Date().toISOString(), suggestions: replySuggestions };
      lastSuggestions.current = replySuggestions;
      history.current = [...history.current, { role: 'user' as const, text: studentMessage.text }, { role: 'model' as const, text: answer }].slice(-80);
      setMessages((current) => [...current, reply]);
      await persistMessage(reply, 'tutor', { user: studentMessage.text, model: answer });
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to subjects" onPress={() => router.back()} hitSlop={8} style={styles.back}><Text style={styles.backGlyph}>‹</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open lesson path" onPress={() => setPathOpen(true)} style={styles.headerCopy}><Text style={styles.tutorEyebrow}>KINDLING · YOUR TUTOR</Text><Text style={styles.subject}>{subject}</Text><Text numberOfLines={1} style={styles.topic}>{unit}  ·  {topic}  ▾</Text></Pressable>
          <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>AI</Text></View>
        </View>

        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messageContent} keyboardShouldPersistTaps="handled">
          {conversationLoading ? <View style={styles.threadStatus}><ActivityIndicator size="small" color={Brand.teal} /><Text style={styles.threadStatusText}>Preparing a focused introduction to {topic}…</Text></View> : null}
          {isResumed ? <Text style={styles.resumeLabel}>PICKING UP WHERE YOU LEFT OFF</Text> : null}
          {conversationWarning ? <View style={styles.warningBox}><Text style={styles.warningText}>{conversationWarning}</Text><Pressable accessibilityRole="button" onPress={() => setRestoreAttempt((attempt) => attempt + 1)}><Text style={styles.retry}>Try to reconnect</Text></Pressable></View> : null}
          {messages.map((message, index) => (
            <View key={`${index}-${message.role}`} style={styles.messageGroup}>
              {message.role === 'model' ? <View style={styles.tutorAttribution}><BrandMark size={19} /><Text style={styles.tutorName}>Kindling</Text></View> : null}
              <View style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.tutorBubble]}>
                <LessonMessageContent text={message.text} isUser={message.role === 'user'} textStyle={[styles.bubbleText, message.role === 'user' && styles.userText]} />
              </View>
              {message.role === 'model' && index === messages.length - 1 && !busy && (message.suggestions?.length || 0) > 0 ? (
                <View style={styles.suggestions}>
                  <Text style={styles.suggestionLabel}>NEXT WITH KINDLING · {topic.toUpperCase()}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionList}>
                    {(message.suggestions || []).map((reply) => (
                      <Pressable key={reply} accessibilityRole="button" disabled={busy} onPress={() => sendMessage(reply)} style={({ pressed }) => [styles.suggestionChip, pressed && styles.sendPressed]}>
                        <Text style={styles.suggestionText}>{reply}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ))}
          {busy ? <View accessibilityLiveRegion="polite" style={[styles.bubble, styles.tutorBubble, styles.thinking]}><ActivityIndicator size="small" color={Brand.teal} /><Text style={styles.thinkingText}>Kindling is thinking…</Text></View> : null}
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { const lastUser = [...messages].reverse().find((item) => item.role === 'user'); if (lastUser) void ask(messages); }}><Text style={styles.retry}>Try again</Text></Pressable></View> : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            editable={!conversationLoading}
            style={styles.input}
            placeholder={conversationLoading ? 'Opening saved lesson…' : 'Ask or share your thinking…'}
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
              const lessons = leaves.length ? leaves : [{ id: topicRow.id, name: topicRow.name, learningGoal: '', unitName: topicRow.name }];
              return <View key={`${topicRow.id}-${topicRow.name}`} style={styles.pathTopic}>
                <Text style={styles.pathTopicName}>{String(index + 1).padStart(2, '0')}  {topicRow.name}</Text>
                {lessons.map((lesson, lessonIndex) => <Pressable key={`${lesson.id}-${lesson.name}`} accessibilityRole="button" accessibilityState={{ selected: topic === lesson.name && unit === topicRow.name }} onPress={() => selectLesson(topicRow.name, lesson.name, lesson.learningGoal)} style={[styles.pathLesson, topic === lesson.name && unit === topicRow.name && styles.pathLessonActive]}><View style={[styles.pathLessonDot, topic === lesson.name && unit === topicRow.name && styles.pathLessonDotActive]}><Text style={[styles.pathLessonNumber, topic === lesson.name && unit === topicRow.name && styles.pathLessonNumberActive]}>{lessonIndex + 1}</Text></View><Text style={[styles.pathLessonText, topic === lesson.name && unit === topicRow.name && styles.pathLessonTextActive]}>{lesson.name}</Text>{topic === lesson.name && unit === topicRow.name ? <Text style={styles.pathCurrent}>CURRENT</Text> : null}</Pressable>)}
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
  while ((match = blockPattern.exec(source)) !== null) {
    const body = (match[1] || match[2] || '').replace(/^[:\s]+/, '').trim();
    if (!body || /^(none|null|nil|empty|0|no\s+suggestions?|omit|-|—|\[\])$/i.test(body)) {
      sawNone = true;
      continue;
    }
    suggestions.push(...body.split(/[|\n;]/).map((item) => item.replace(/^\s*[-•*\d.)]+\s*/, '').replace(/^['"“”]+|['"“”]+$/g, '').trim()));
  }
  const text = source.replace(blockPattern, '').replace(/\n{3,}/g, '\n\n').trim();
  const valid = [...new Set(suggestions.filter((item) => item.length >= 3 && item.length <= 90 && !/^(none|null|empty|0)$/i.test(item)))].slice(0, 5);
  return { text, suggestions: valid, explicitNone: sawNone && valid.length === 0 };
}

function topicKeywords(topic: string) {
  const stopWords = new Set(['about', 'after', 'and', 'are', 'basics', 'from', 'how', 'into', 'lesson', 'learn', 'learning', 'overview', 'that', 'the', 'their', 'this', 'through', 'understanding', 'using', 'what', 'with']);
  return String(topic || '').toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2 && !stopWords.has(word)) || [];
}

function relevantSuggestions(suggestions: string[], topic: string, tutorText: string, learnerText = '', previousSuggestions: string[] = [], explicitNone = false) {
  if (explicitNone) return [];
  if (/\b(quick\s+assessment|assessment\s+questions?|question\s+1\s*(?:of\s*\d+|[:.)]))\b/i.test(tutorText) && suggestions.length === 0) {
    return [];
  }
  const recent = new Set(previousSuggestions.map((suggestion) => suggestion.toLowerCase().trim()));
  const filtered = suggestions.filter((suggestion) => {
    const normalized = suggestion.toLowerCase().trim();
    if (!normalized || recent.has(normalized)) return false;
    if (/\b(connect\s+this\s+to|talk\s+about\s+something\s+else|different\s+subject|tell\s+me\s+a\s+joke)\b/i.test(normalized)) return false;
    return true;
  });
  if (filtered.length > 0) {
    return filtered.slice(0, 5);
  }
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
  const modes = confusion
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
            ];
  const recent = new Set(previousSuggestions.map((suggestion) => suggestion.toLowerCase().trim()));
  const fresh = modes.filter(([, suggestion]) => !recent.has(suggestion.toLowerCase().trim())).map(([, suggestion]) => suggestion);
  const previousModes = modes.filter(([, suggestion]) => recent.has(suggestion.toLowerCase().trim())).map(([, suggestion]) => suggestion);
  return [...fresh, ...previousModes].slice(0, 4);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.parchment },
  flex: { flex: 1 },
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Brand.line, backgroundColor: Brand.parchment },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  backGlyph: { color: Brand.pine, fontSize: 33, lineHeight: 36, marginTop: -3 },
  headerCopy: { flex: 1, gap: 1 },
  tutorEyebrow: { color: Brand.teal, fontWeight: '800', fontSize: 9, letterSpacing: 0.9 },
  subject: { color: Brand.pine, fontWeight: '700', fontSize: 16 },
  topic: { color: Brand.muted, fontSize: 13 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, backgroundColor: Brand.tealPale },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Brand.teal },
  liveText: { color: Brand.pine, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  messages: { flex: 1 },
  messageContent: { padding: 16, paddingBottom: 20, gap: 12 },
  messageGroup: { alignSelf: 'stretch', gap: 8 },
  tutorAttribution: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  tutorName: { color: Brand.teal, fontSize: 12, fontWeight: '700' },
  bubble: { width: '100%', maxWidth: '100%', alignSelf: 'stretch', paddingHorizontal: 16, paddingVertical: 13, borderRadius: 18 },
  tutorBubble: { alignSelf: 'stretch', backgroundColor: '#fff', borderWidth: 1, borderColor: Brand.line },
  userBubble: { alignSelf: 'stretch', backgroundColor: Brand.pine },
  bubbleText: { color: Brand.ink, fontSize: 16, lineHeight: 23 },
  userText: { color: '#fff' },
  suggestions: { gap: 7, paddingLeft: 4 },
  suggestionLabel: { color: Brand.muted, fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  suggestionList: { gap: 8, paddingRight: 12 },
  suggestionChip: { minHeight: 38, paddingHorizontal: 13, borderRadius: 99, borderWidth: 1, borderColor: Brand.line, backgroundColor: '#fff', justifyContent: 'center' },
  suggestionText: { color: Brand.pine, fontSize: 13, fontWeight: '600' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 },
  thinkingText: { color: Brand.muted, fontSize: 14 },
  threadStatus: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 14 },
  threadStatusText: { color: Brand.muted, fontSize: 14 },
  resumeLabel: { color: Brand.teal, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  warningBox: { alignSelf: 'stretch', padding: 12, borderRadius: 13, backgroundColor: '#FFF4D9', gap: 6 },
  warningText: { color: Brand.ink, fontSize: 13, lineHeight: 19 },
  errorBox: { alignSelf: 'stretch', padding: 13, borderRadius: 14, backgroundColor: '#FCECE9', gap: 8 },
  errorText: { color: Brand.error, fontSize: 14, lineHeight: 20 },
  retry: { color: Brand.pine, fontSize: 14, fontWeight: '700' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: Brand.line, padding: 12, paddingBottom: 10, backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 48, maxHeight: 140, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, backgroundColor: Brand.parchment, color: Brand.ink, fontSize: 16, lineHeight: 21, textAlignVertical: 'top' },
  send: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.pine },
  sendDisabled: { backgroundColor: '#A9B2AD' },
  sendPressed: { opacity: 0.7 },
  sendGlyph: { color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '700' },
  pathShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,31,27,0.42)' },
  pathSheet: { maxHeight: '82%', backgroundColor: Brand.parchment, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 30, gap: 12 },
  pathHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pathEyebrow: { color: Brand.teal, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  pathTitle: { color: Brand.pine, fontSize: 22, fontWeight: '700', marginTop: 3 },
  pathClose: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  pathCloseText: { color: Brand.pine, fontSize: 27, lineHeight: 30 },
  pathList: { flexGrow: 0 },
  pathTopic: { borderTopWidth: 1, borderTopColor: Brand.line, paddingTop: 14, paddingBottom: 5 },
  pathTopicName: { color: Brand.pine, fontSize: 15, fontWeight: '800', marginBottom: 7 },
  pathLesson: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 13, paddingHorizontal: 9 },
  pathLessonActive: { backgroundColor: Brand.tealPale },
  pathLessonDot: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EBDD' },
  pathLessonDotActive: { backgroundColor: Brand.teal },
  pathLessonNumber: { color: Brand.pine, fontSize: 12, fontWeight: '700' },
  pathLessonNumberActive: { color: '#fff' },
  pathLessonText: { flex: 1, color: Brand.ink, fontSize: 14, fontWeight: '600' },
  pathLessonTextActive: { color: Brand.pine, fontWeight: '800' },
  pathCurrent: { color: Brand.teal, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  pathEmpty: { color: Brand.muted, fontSize: 14, lineHeight: 21, paddingVertical: 16 },
});

function newMessageId() {
  return `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
