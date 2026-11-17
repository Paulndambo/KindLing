import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
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
import { useSession } from '@/context/session';
import {
  askTutor,
  createAssessment,
  listAssessments,
  listSubjects,
  updateAssessment,
  type StudentAssessmentRecord,
  type Subject,
} from '@/services/api';
import {
  generateAssessment,
  revisionSystem,
  scoreAssessment,
  type AssessmentGrade,
  type AssessmentType,
  type CustomAssessment,
} from '@/services/custom-assessment';

const kinds: { id: AssessmentType; label: string; detail: string; badge: string }[] = [
  {
    id: 'multiple_choice',
    label: 'Multiple choice',
    detail: 'Choose the best answer from 4 choices.',
    badge: 'Fast & focused',
  },
  {
    id: 'open_ended',
    label: 'Open ended',
    detail: 'Explain your reasoning in your own words.',
    badge: 'Deep thinking',
  },
  {
    id: 'hybrid',
    label: 'Hybrid mix',
    detail: 'A balanced mix of multiple-choice and short written answers.',
    badge: 'Recommended',
  },
];

const COUNT_PRESETS = ['5', '8', '10', '15'];

type ChatMessage = { role: 'user' | 'model'; text: string };
type Phase = 'list' | 'setup' | 'generating' | 'active' | 'grading' | 'review';

function formatTypeLabel(type?: string) {
  if (type === 'multiple_choice') return 'Multiple choice';
  if (type === 'open_ended') return 'Open ended';
  return 'Hybrid mix';
}

function formatDateShort(iso?: string | null) {
  if (!iso) return 'Recently';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Recently';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AssessmentsScreen() {
  const { profile } = useSession();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [selector, setSelector] = useState<'subject' | 'topic' | 'subtopic' | null>(null);
  const [description, setDescription] = useState('');
  const [count, setCount] = useState('5');
  const [kind, setKind] = useState<AssessmentType>('hybrid');

  const [assessment, setAssessment] = useState<CustomAssessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [grade, setGrade] = useState<AssessmentGrade | null>(null);
  const [recordId, setRecordId] = useState<number | null>(null);

  const [savedAssessments, setSavedAssessments] = useState<StudentAssessmentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  const [phase, setPhase] = useState<Phase>('list');
  const [error, setError] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  const total = assessment?.questions.length || 0;
  const isQuestionAnswered = (q: CustomAssessment['questions'][number]) =>
    q.type === 'multiple_choice'
      ? answers[q.id] !== undefined && answers[q.id] !== ''
      : Boolean(answers[q.id]?.trim());

  const answered =
    assessment?.questions.filter((q) => isQuestionAnswered(q)).length || 0;
  const validCount = /^\d+$/.test(count) && Number(count) >= 5 && Number(count) <= 15;

  const selectedSubject = subjects.find((item) => String(item.id) === subjectId);
  const availableTopics = selectedSubject?.topics || [];
  const selectedTopic = availableTopics.find((item) => String(item.id) === topicId);
  const availableSubtopics = selectedTopic?.subtopics || [];
  const selectedSubtopic = availableSubtopics.find((item) => String(item.id) === subtopicId);
  const selectorOptions =
    selector === 'subject'
      ? subjects
      : selector === 'topic'
        ? availableTopics
        : availableSubtopics;
  const selectorTitle =
    selector === 'subject'
      ? 'Choose a subject'
      : selector === 'topic'
        ? 'Choose a topic'
        : 'Choose a subtopic';

  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    listAssessments()
      .then((rows) => {
        if (active) {
          setSavedAssessments(Array.isArray(rows) ? rows : []);
          setHistoryError('');
        }
      })
      .catch((cause) => {
        if (active) {
          setHistoryError(
            cause instanceof Error
              ? cause.message
              : 'Saved assessments could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listSubjects()
      .then((rows) => {
        if (active) setSubjects(rows);
      })
      .catch((cause) => {
        if (active) {
          setHistoryError(
            cause instanceof Error
              ? cause.message
              : 'Your subjects could not be loaded.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'active' || recordId == null) return undefined;
    const timer = setTimeout(() => {
      updateAssessment(recordId, { answers })
        .then((saved) => {
          setSavedAssessments((current) =>
            current.map((item) => (item.id === saved.id ? saved : item)),
          );
        })
        .catch((cause) =>
          setError(
            cause instanceof Error
              ? cause.message
              : 'Your answers could not be saved.',
          ),
        );
    }, 700);
    return () => clearTimeout(timer);
  }, [answers, phase, recordId]);

  const stats = useMemo(() => {
    const completed = savedAssessments.filter(
      (item) => item.status === 'completed' && item.result,
    );
    const inProgress = savedAssessments.filter(
      (item) => item.status !== 'completed',
    );
    const avg = completed.length
      ? Math.round(
          completed.reduce(
            (sum, item) =>
              sum +
              Number((item.result as { score?: number } | null)?.score ?? 0),
            0,
          ) / completed.length,
        )
      : null;
    return {
      total: savedAssessments.length,
      completed: completed.length,
      inProgress: inProgress.length,
      avg,
    };
  }, [savedAssessments]);

  const filteredAssessments = useMemo(() => {
    return savedAssessments.filter((item) => {
      if (statusFilter === 'active' && item.status === 'completed') return false;
      if (statusFilter === 'completed' && item.status !== 'completed')
        return false;
      return true;
    });
  }, [savedAssessments, statusFilter]);

  const generate = async () => {
    if (!selectedSubject || !selectedTopic || !selectedSubtopic || !validCount)
      return;
    setError('');
    setPhase('generating');
    setAnswers({});
    setCurrentQIndex(0);
    setGrade(null);
    setChat([]);
    try {
      const topicContext = `${selectedSubject.name} → ${selectedTopic.name} → ${selectedSubtopic.name}`;
      const generated = await generateAssessment({
        topic: topicContext,
        description,
        count: Number(count),
        kind,
        grade: profile?.grade,
      });
      const saved = await createAssessment({
        ...generated,
        topic: selectedSubtopic.name,
        subjectId: selectedSubject.id,
        topicId: selectedTopic.id,
        subtopicId: selectedSubtopic.id,
        subjectName: selectedSubject.name,
        topicName: selectedTopic.name,
        subtopicName: selectedSubtopic.name,
        answers: {},
        result: null,
        revisionMessages: [],
        status: 'active',
      });
      setRecordId(saved.id);
      setSavedAssessments((current) => [saved, ...current]);
      setAssessment(generated);
      setCurrentQIndex(0);
      setPhase('active');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Kindling could not create this assessment.',
      );
      setPhase('setup');
    }
  };

  const submit = async () => {
    if (!assessment || answered !== total) return;
    setError('');
    setPhase('grading');
    try {
      const result = await scoreAssessment(assessment, answers);
      if (recordId == null) {
        throw new Error(
          'This assessment has not been saved yet. Please try again.',
        );
      }
      const saved = await updateAssessment(recordId, {
        answers,
        result,
        status: 'completed',
      });
      setSavedAssessments((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setGrade(result);
      setPhase('review');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Kindling could not score this assessment.',
      );
      setPhase('active');
    }
  };

  const send = async (textOverride?: string) => {
    const text = (
      typeof textOverride === 'string' ? textOverride : draft
    ).trim();
    if (!text || !assessment || !grade || chatBusy) return;
    const next = [...chat, { role: 'user' as const, text }];
    setChat(next);
    if (typeof textOverride !== 'string') setDraft('');
    setChatBusy(true);
    setError('');
    try {
      const response = await askTutor(
        next,
        revisionSystem(assessment, answers, grade),
      );
      if (recordId == null)
        throw new Error('The saved assessment could not be found.');
      const transcript = [...next, { role: 'model' as const, text: response }];
      const saved = await updateAssessment(recordId, {
        revisionMessages: transcript,
      });
      setSavedAssessments((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setChat(transcript);
    } catch (cause) {
      setChat((current) => current.slice(0, -1));
      if (typeof textOverride !== 'string') setDraft(text);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Kindling could not reply. Try again.',
      );
    } finally {
      setChatBusy(false);
    }
  };

  const backToLibrary = () => {
    setPhase('list');
    setAssessment(null);
    setGrade(null);
    setAnswers({});
    setCurrentQIndex(0);
    setChat([]);
    setRecordId(null);
    setError('');
  };

  const openSetup = () => {
    setError('');
    setPhase('setup');
  };

  const openSavedAssessment = (saved: StudentAssessmentRecord) => {
    const loadedAssessment = saved as unknown as CustomAssessment;
    const loadedAnswers = saved.answers || {};
    const firstUnansweredIdx = (loadedAssessment.questions || []).findIndex(
      (q) =>
        q.type === 'multiple_choice'
          ? loadedAnswers[q.id] === undefined || loadedAnswers[q.id] === ''
          : !loadedAnswers[q.id]?.trim(),
    );

    setRecordId(saved.id);
    setAssessment(loadedAssessment);
    setAnswers(loadedAnswers);
    setCurrentQIndex(firstUnansweredIdx >= 0 ? firstUnansweredIdx : 0);
    setGrade(saved.result as unknown as AssessmentGrade | null);
    setChat(saved.revisionMessages || []);
    setSubjectId(saved.subjectId == null ? '' : String(saved.subjectId));
    setTopicId(saved.topicId == null ? '' : String(saved.topicId));
    setSubtopicId(saved.subtopicId == null ? '' : String(saved.subtopicId));
    setDescription(saved.description || '');
    setKind(saved.questionType);
    setCount(String(saved.questions.length || 5));
    setError('');
    setPhase(
      saved.status === 'completed' && saved.result ? 'review' : 'active',
    );
  };

  const activeQuestion =
    assessment?.questions[
      Math.min(currentQIndex, Math.max(0, total - 1))
    ] || null;

  return (
    <AppScreen scroll contentStyle={s.page}>
      {/* Top Header */}
      {phase === 'list' ? (
        <View style={s.topline}>
          <BrandMark size={38} />
          <View style={s.greeting}>
            <Text style={s.eyebrow}>PRACTICE & QUIZZES</Text>
            <Text numberOfLines={1} style={s.hello}>
              Assessments
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={openSetup}
            style={({ pressed }) => [
              s.topCtaButton,
              pressed && s.pressed,
            ]}
          >
            <Text style={s.topCtaButtonText}>＋ New quiz</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.topNavRow}>
          <Pressable
            accessibilityRole="button"
            onPress={backToLibrary}
            style={({ pressed }) => [s.backPill, pressed && s.pressed]}
          >
            <Text style={s.backPillText}>‹ All assessments</Text>
          </Pressable>
          {(phase === 'active' || phase === 'review') && (
            <Pressable
              accessibilityRole="button"
              onPress={openSetup}
              style={({ pressed }) => [s.newSmallPill, pressed && s.pressed]}
            >
              <Text style={s.newSmallPillText}>＋ New</Text>
            </Pressable>
          )}
        </View>
      )}

      {error ? (
        <View style={s.errorBanner}>
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        </View>
      ) : null}

      {/* ====================================================================
          PHASE 1: LIBRARY (CARDS OF EXISTING ASSESSMENTS + NEW BUTTON)
          ==================================================================== */}
      {phase === 'list' && (
        <View style={s.sectionStack}>
          {/* Prominent New Assessment CTA */}
          <Pressable
            accessibilityRole="button"
            onPress={openSetup}
            style={({ pressed }) => [s.createHeroCard, pressed && s.pressed]}
          >
            <View style={s.createHeroBadge}>
              <Text style={s.createHeroBadgeText}>✦ CHECK WHAT YOU KNOW</Text>
            </View>
            <Text style={s.createHeroTitle}>Build a custom practice quiz</Text>
            <Text style={s.createHeroSub}>
              Choose a topic and 5–15 questions. Work through one question at a
              time and get instant feedback from Kindling.
            </Text>
            <View style={s.createHeroBtn}>
              <Text style={s.createHeroBtnText}>Start new assessment →</Text>
            </View>
          </Pressable>

          {/* Summary KPI Grid */}
          <View style={s.kpiGrid}>
            <View style={s.kpiCard}>
              <Text numberOfLines={1} style={s.kpiLabel}>
                TOTAL
              </Text>
              <Text numberOfLines={1} style={s.kpiVal}>
                {stats.total}
              </Text>
              <Text numberOfLines={1} style={s.kpiCap}>
                Quizzes
              </Text>
            </View>
            <View style={s.kpiCard}>
              <Text numberOfLines={1} style={s.kpiLabel}>
                COMPLETED
              </Text>
              <Text numberOfLines={1} style={s.kpiVal}>
                {stats.completed}
              </Text>
              <Text numberOfLines={1} style={s.kpiCap}>
                Scored
              </Text>
            </View>
            <View style={s.kpiCard}>
              <Text numberOfLines={1} style={s.kpiLabel}>
                AVG SCORE
              </Text>
              <Text numberOfLines={1} style={s.kpiVal}>
                {stats.avg != null ? `${stats.avg}%` : '—'}
              </Text>
              <Text numberOfLines={1} style={s.kpiCap}>
                Mastery
              </Text>
            </View>
          </View>

          {/* Filter Pills */}
          <View style={s.filterRow}>
            {(
              [
                { id: 'all', label: `All (${stats.total})` },
                { id: 'active', label: `In progress (${stats.inProgress})` },
                { id: 'completed', label: `Completed (${stats.completed})` },
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: statusFilter === tab.id }}
                onPress={() => setStatusFilter(tab.id)}
                style={[
                  s.filterPill,
                  statusFilter === tab.id && s.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    s.filterPillText,
                    statusFilter === tab.id && s.filterPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {historyError ? (
            <Text style={s.muted}>Saved assessments: {historyError}</Text>
          ) : null}

          {loadingHistory ? (
            <View style={[ui.card, s.emptyCard]}>
              <Text style={s.choiceTitle}>Loading your assessments…</Text>
              <Text style={s.muted}>
                Fetching your saved practice sessions and scores.
              </Text>
            </View>
          ) : filteredAssessments.length === 0 ? (
            <View style={[ui.card, s.emptyCard]}>
              <Text style={s.emptyTitle}>
                {savedAssessments.length === 0
                  ? 'No assessments yet'
                  : 'No assessments in this filter'}
              </Text>
              <Text style={s.emptySub}>
                {savedAssessments.length === 0
                  ? 'Tap “Start new assessment” above to generate your first set of practice questions.'
                  : 'Switch the filter above to see all of your saved assessments.'}
              </Text>
            </View>
          ) : (
            <View style={s.cardList}>
              {filteredAssessments.map((saved) => {
                const isDone =
                  saved.status === 'completed' && Boolean(saved.result);
                const qLen = saved.questions?.length || 0;
                const score = isDone
                  ? Number(
                      (saved.result as { score?: number } | null)?.score ?? 0,
                    )
                  : null;
                const correctCount = isDone
                  ? Number(
                      (saved.result as { correct?: number } | null)?.correct ??
                        0,
                    )
                  : 0;
                const pathLabel = saved.subjectName
                  ? [saved.subjectName, saved.topicName]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Custom topic';

                return (
                  <Pressable
                    key={saved.id}
                    accessibilityRole="button"
                    onPress={() => openSavedAssessment(saved)}
                    style={({ pressed }) => [
                      ui.card,
                      s.assessCard,
                      isDone ? s.assessCardDone : s.assessCardActive,
                      pressed && s.pressed,
                    ]}
                  >
                    <View style={s.assessCardTop}>
                      <View
                        style={[
                          s.statusBadge,
                          isDone ? s.statusBadgeDone : s.statusBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            s.statusBadgeText,
                            isDone
                              ? s.statusBadgeTextDone
                              : s.statusBadgeTextActive,
                          ]}
                        >
                          {isDone ? '✓ Completed' : '● In progress'}
                        </Text>
                      </View>
                      <View style={s.typeBadge}>
                        <Text style={s.typeBadgeText}>
                          {formatTypeLabel(saved.questionType)}
                        </Text>
                      </View>
                    </View>

                    <View style={s.cardTitleWrap}>
                      <Text numberOfLines={1} style={s.cardPath}>
                        {pathLabel}
                      </Text>
                      <Text numberOfLines={2} style={s.cardTitle}>
                        {saved.title || saved.subtopicName || saved.topic}
                      </Text>
                    </View>

                    <View style={s.cardStatsBox}>
                      <View style={s.cardStatsRow}>
                        <Text style={s.muted}>
                          {isDone
                            ? `${correctCount} of ${qLen} correct`
                            : `${qLen} questions`}
                        </Text>
                        <Text style={s.cardScoreText}>
                          {isDone ? `${score}% score` : 'In progress'}
                        </Text>
                      </View>
                      {isDone && score != null ? (
                        <View style={s.barTrack}>
                          <View
                            style={[
                              s.barFill,
                              {
                                width: `${Math.max(6, Math.min(100, score))}%`,
                              },
                            ]}
                          />
                        </View>
                      ) : null}
                    </View>

                    <View style={s.assessCardFoot}>
                      <Text style={s.muted}>
                        Updated{' '}
                        {formatDateShort(saved.updatedAt || saved.createdAt)}
                      </Text>
                      <Text style={s.openActionText}>
                        {isDone ? 'Review details ›' : 'Continue ›'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ====================================================================
          PHASE 2: SETUP / CREATE NEW ASSESSMENT
          ==================================================================== */}
      {(phase === 'setup' || phase === 'generating') && (
        <View style={[ui.card, s.formCard]}>
          <SectionTitle>Build an assessment</SectionTitle>

          <View style={s.fieldBlock}>
            <Text style={s.label}>Subject *</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Subject: ${selectedSubject?.name || 'Choose a subject'}`}
              style={s.selector}
              onPress={() => setSelector('subject')}
            >
              <Text
                numberOfLines={1}
                style={
                  selectedSubject ? s.selectorText : s.selectorPlaceholder
                }
              >
                {selectedSubject?.name || 'Choose a subject'}
              </Text>
              <Text style={s.progress}>▾</Text>
            </Pressable>
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.label}>Topic unit *</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedSubject }}
              style={[s.selector, !selectedSubject && s.disabled]}
              disabled={!selectedSubject}
              onPress={() => setSelector('topic')}
            >
              <Text
                numberOfLines={1}
                style={selectedTopic ? s.selectorText : s.selectorPlaceholder}
              >
                {selectedTopic?.name || 'Choose a topic'}
              </Text>
              <Text style={s.progress}>▾</Text>
            </Pressable>
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.label}>Lesson / subtopic *</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedTopic }}
              style={[s.selector, !selectedTopic && s.disabled]}
              disabled={!selectedTopic}
              onPress={() => setSelector('subtopic')}
            >
              <Text
                numberOfLines={1}
                style={
                  selectedSubtopic ? s.selectorText : s.selectorPlaceholder
                }
              >
                {selectedSubtopic?.name || 'Choose a subtopic'}
              </Text>
              <Text style={s.progress}>▾</Text>
            </Pressable>
          </View>

          {!subjects.length && historyError ? (
            <Text style={s.error}>
              Your subjects could not be loaded: {historyError}
            </Text>
          ) : null}

          <View style={s.fieldBlock}>
            <Text style={s.label}>Number of questions</Text>
            <View style={s.presetRow}>
              {COUNT_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setCount(preset)}
                  style={[
                    s.presetChip,
                    count === preset && s.presetChipActive,
                  ]}
                >
                  <Text
                    style={[
                      s.presetChipText,
                      count === preset && s.presetChipTextActive,
                    ]}
                  >
                    {preset}
                  </Text>
                </Pressable>
              ))}
              <TextInput
                accessibilityLabel="Number of questions"
                style={[s.input, s.countInput]}
                value={count}
                onChangeText={setCount}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            {!validCount ? (
              <Text style={s.error}>Enter a number from 5 to 15.</Text>
            ) : null}
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.label}>Question format</Text>
            {kinds.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: kind === item.id }}
                onPress={() => setKind(item.id)}
                style={[s.choice, kind === item.id && s.choiceSelected]}
              >
                <View style={[s.radio, kind === item.id && s.radioSelected]} />
                <View style={s.choiceCopy}>
                  <View style={s.choiceHeaderRow}>
                    <Text style={s.choiceTitle}>{item.label}</Text>
                    <View style={s.choiceBadge}>
                      <Text style={s.choiceBadgeText}>{item.badge}</Text>
                    </View>
                  </View>
                  <Text style={s.muted}>{item.detail}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.label}>
              Focus notes <Text style={s.muted}>(optional)</Text>
            </Text>
            <TextInput
              accessibilityLabel="Optional description"
              style={[s.input, s.multilineSmall]}
              value={description}
              onChangeText={setDescription}
              maxLength={800}
              multiline
              textAlignVertical="top"
              placeholder="Any specific concepts or exam style you want to focus on?"
              placeholderTextColor={Brand.muted}
            />
          </View>

          <View style={s.setupActions}>
            <Button
              busy={phase === 'generating'}
              disabled={
                !selectedSubject ||
                !selectedTopic ||
                !selectedSubtopic ||
                !validCount
              }
              onPress={generate}
            >
              {phase === 'generating'
                ? 'Creating your questions…'
                : 'Start assessment'}
            </Button>
            <Button
              variant="secondary"
              disabled={phase === 'generating'}
              onPress={backToLibrary}
            >
              Cancel
            </Button>
          </View>
        </View>
      )}

      {/* ====================================================================
          PHASE 3: ACTIVE ASSESSMENT (ONE-QUESTION-AT-A-TIME STEPPER)
          ==================================================================== */}
      {(phase === 'active' || phase === 'grading') &&
        assessment &&
        activeQuestion && (
          <View style={s.sectionStack}>
            {/* Stepper Header Card */}
            <View style={[ui.card, s.progressHeaderCard]}>
              <View style={s.rowBetween}>
                <View style={s.rowCopy}>
                  <Text style={s.kicker}>
                    QUESTION {currentQIndex + 1} OF {total}
                  </Text>
                  <Text numberOfLines={1} style={s.sectionHeading}>
                    {assessment.topic}
                  </Text>
                </View>
                <View style={s.progressPill}>
                  <Text style={s.progressPillText}>
                    {answered}/{total} done
                  </Text>
                </View>
              </View>

              <View style={s.barTrack}>
                <View
                  style={[
                    s.barFill,
                    {
                      width: `${Math.round(
                        (answered / Math.max(1, total)) * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>

              {/* Interactive Question Step Dots */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.stepDotsRow}
              >
                {assessment.questions.map((q, idx) => {
                  const isCurrent = idx === currentQIndex;
                  const done = isQuestionAnswered(q);
                  return (
                    <Pressable
                      key={q.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Go to question ${idx + 1}`}
                      onPress={() => setCurrentQIndex(idx)}
                      style={[
                        s.stepDot,
                        done && s.stepDotDone,
                        isCurrent && s.stepDotCurrent,
                      ]}
                    >
                      <Text
                        style={[
                          s.stepDotText,
                          done && s.stepDotTextDone,
                          isCurrent && s.stepDotTextCurrent,
                        ]}
                      >
                        {idx + 1}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Single Focused Question Card */}
            <View
              style={[
                ui.card,
                s.questionCard,
                isQuestionAnswered(activeQuestion) && s.questionCardAnswered,
              ]}
            >
              <View style={s.qTopRow}>
                <View style={s.qNumBadge}>
                  <Text style={s.qNumBadgeText}>
                    Question {currentQIndex + 1}
                  </Text>
                </View>
                <Text style={s.qTypeLabel}>
                  {activeQuestion.type === 'multiple_choice'
                    ? 'Multiple choice'
                    : 'Written answer'}{' '}
                  · {activeQuestion.difficulty}
                </Text>
              </View>

              {activeQuestion.concept ? (
                <Text style={s.conceptTag}>◎ {activeQuestion.concept}</Text>
              ) : null}

              <Text style={s.question}>{activeQuestion.prompt}</Text>

              {activeQuestion.type === 'multiple_choice' ? (
                <View style={s.optionsList}>
                  {activeQuestion.options.map((option, optionIndex) => {
                    const selected =
                      answers[activeQuestion.id] === String(optionIndex);
                    return (
                      <Pressable
                        key={optionIndex}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() =>
                          setAnswers((current) => ({
                            ...current,
                            [activeQuestion.id]: String(optionIndex),
                          }))
                        }
                        style={[s.option, selected && s.optionSelected]}
                      >
                        <View
                          style={[
                            s.optionLetterBox,
                            selected && s.optionLetterBoxSelected,
                          ]}
                        >
                          <Text
                            style={[
                              s.optionLetter,
                              selected && s.optionLetterSelected,
                            ]}
                          >
                            {String.fromCharCode(65 + optionIndex)}
                          </Text>
                        </View>
                        <Text style={s.optionText}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={s.writtenAnswerWrap}>
                  <Text style={s.boxHeaderLabel}>YOUR RESPONSE & WORKING</Text>
                  <TextInput
                    accessibilityLabel={`Your answer to question ${currentQIndex + 1}`}
                    style={[s.input, s.multiline]}
                    multiline
                    textAlignVertical="top"
                    value={answers[activeQuestion.id] || ''}
                    onChangeText={(value) =>
                      setAnswers((current) => ({
                        ...current,
                        [activeQuestion.id]: value,
                      }))
                    }
                    placeholder="Write your answer clearly and show your thinking…"
                    placeholderTextColor={Brand.muted}
                  />
                </View>
              )}
            </View>

            {/* Stepper Navigation Footer */}
            <View style={s.stepperNavRow}>
              <Button
                variant="secondary"
                disabled={currentQIndex === 0 || phase === 'grading'}
                onPress={() =>
                  setCurrentQIndex((idx) => Math.max(0, idx - 1))
                }
                style={s.stepperBtn}
              >
                ← Previous
              </Button>

              {currentQIndex < total - 1 ? (
                <Button
                  onPress={() =>
                    setCurrentQIndex((idx) => Math.min(total - 1, idx + 1))
                  }
                  style={s.stepperBtn}
                >
                  Next question →
                </Button>
              ) : (
                <Button
                  busy={phase === 'grading'}
                  disabled={answered !== total}
                  onPress={submit}
                  style={s.stepperBtn}
                >
                  {phase === 'grading'
                    ? 'Scoring…'
                    : answered === total
                      ? 'Submit & score ✓'
                      : `${total - answered} left`}
                </Button>
              )}
            </View>

            {answered === total && currentQIndex < total - 1 ? (
              <Button busy={phase === 'grading'} onPress={submit}>
                {phase === 'grading'
                  ? 'Scoring your work…'
                  : 'All answered — Submit & score ✓'}
              </Button>
            ) : null}
          </View>
        )}

      {/* ====================================================================
          PHASE 4: ASSESSMENT DETAILS / REVIEW SCREEN
          ==================================================================== */}
      {phase === 'review' && assessment && grade && (
        <View style={s.sectionStack}>
          {/* Score Summary Banner */}
          <View style={[ui.card, s.scoreBanner]}>
            <View style={s.scoreTopRow}>
              <View style={s.scoreCircle}>
                <Text style={s.scoreCircleVal}>{grade.score}%</Text>
                <Text style={s.scoreCircleSub}>SCORE</Text>
              </View>
              <View style={s.rowCopy}>
                <Text style={s.kicker}>ASSESSMENT COMPLETE</Text>
                <Text style={s.sectionHeading}>
                  {grade.correct} of {total} fully correct
                </Text>
                <Text style={s.muted}>
                  {grade.points} of {grade.maxPoints} total points earned
                </Text>
              </View>
            </View>
            <BodyText style={{ lineHeight: 22 }}>{grade.summary}</BodyText>
            <View style={s.scoreActionsRow}>
              <Button
                variant="secondary"
                onPress={backToLibrary}
                style={s.stepperBtn}
              >
                All assessments
              </Button>
              <Button onPress={openSetup} style={s.stepperBtn}>
                New quiz
              </Button>
            </View>
          </View>

          <SectionTitle>Question breakdown</SectionTitle>

          {assessment.questions.map((q, index) => {
            const review = grade.reviews.find(
              (item) => item.questionId === q.id,
            );
            const pts = review?.points ?? 0;
            const right = pts === 2;
            const partial = pts === 1;
            const answer =
              q.type === 'multiple_choice'
                ? q.options[Number(answers[q.id])]
                : answers[q.id];

            return (
              <View
                key={q.id}
                style={[
                  s.detailCard,
                  right
                    ? s.detailCardCorrect
                    : partial
                      ? s.detailCardPartial
                      : s.detailCardReview,
                ]}
              >
                <View style={s.detailHeader}>
                  <View style={s.rowCopy}>
                    <Text style={s.detailQNum}>QUESTION {index + 1}</Text>
                    {q.concept ? (
                      <Text numberOfLines={1} style={s.detailConcept}>
                        {q.concept}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      s.verdictBadge,
                      right
                        ? s.verdictGood
                        : partial
                          ? s.verdictPartial
                          : s.verdictFlag,
                    ]}
                  >
                    <Text
                      style={[
                        s.verdictText,
                        right
                          ? s.verdictTextGood
                          : partial
                            ? s.verdictTextPartial
                            : s.verdictTextFlag,
                      ]}
                    >
                      {right ? '✓ Correct' : partial ? '◐ Partial' : '✕ Review'}{' '}
                      · {pts}/2
                    </Text>
                  </View>
                </View>

                <Text style={s.detailPrompt}>{q.prompt}</Text>

                <View
                  style={[
                    s.answerBlock,
                    right ? s.answerBlockGood : s.answerBlockFlag,
                  ]}
                >
                  <Text style={s.boxHeaderLabel}>YOUR ANSWER</Text>
                  <Text style={s.boxBodyText}>
                    {answer || 'No answer submitted'}
                  </Text>
                </View>

                {!right ? (
                  <View style={[s.answerBlock, s.answerBlockExpected]}>
                    <Text style={[s.boxHeaderLabel, { color: Brand.teal }]}>
                      EXPECTED ANSWER
                    </Text>
                    <Text style={s.boxBodyText}>
                      {review?.expectedAnswer || q.expectedAnswer}
                    </Text>
                  </View>
                ) : null}

                {review?.feedback ? (
                  <View style={s.feedbackBlock}>
                    <Text style={[s.boxHeaderLabel, { color: Brand.teal }]}>
                      ✦ TUTOR FEEDBACK
                    </Text>
                    <Text style={s.boxBodyText}>{review.feedback}</Text>
                  </View>
                ) : null}

                {!right && review?.improvement ? (
                  <View style={s.improveBlock}>
                    <Text style={[s.boxHeaderLabel, { color: '#9A630C' }]}>
                      HOW TO IMPROVE
                    </Text>
                    <Text style={s.boxBodyText}>{review.improvement}</Text>
                  </View>
                ) : null}

                {!right && review?.example ? (
                  <View style={s.exampleBlock}>
                    <Text style={[s.boxHeaderLabel, { color: '#5A4BB7' }]}>
                      WORKED EXAMPLE
                    </Text>
                    <Text style={s.boxBodyText}>{review.example}</Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={chatBusy}
                  onPress={() =>
                    send(
                      `Can we walk through Question ${index + 1} (${
                        q.concept || 'this concept'
                      }) step by step and try a similar example?`,
                    )
                  }
                  style={({ pressed }) => [
                    s.discussBtn,
                    pressed && s.pressed,
                  ]}
                >
                  <Text style={s.discussBtnText}>
                    💬 Practice Question {index + 1} with Kindling
                  </Text>
                </Pressable>
              </View>
            );
          })}

          {/* 1-on-1 Revision Coach Card */}
          <View style={[ui.card, s.chatCard]}>
            <SectionTitle>1-on-1 Revision with Kindling</SectionTitle>
            <Text style={s.muted}>
              Ask about any question, request another worked example, or
              practice a concept you missed.
            </Text>

            {chat.map((message, index) => (
              <View
                key={`${message.role}-${index}`}
                style={message.role === 'user' ? s.userBubble : s.tutorBubble}
              >
                <Text style={s.bubbleLabel}>
                  {message.role === 'user' ? 'YOU' : 'KINDLING'}
                </Text>
                <Text style={s.boxBodyText}>{message.text}</Text>
              </View>
            ))}

            {chatBusy ? (
              <Text style={s.muted}>Kindling is thinking…</Text>
            ) : null}

            <View style={{ gap: 10 }}>
              <TextInput
                accessibilityLabel="Ask Kindling about your assessment"
                style={[s.input, s.multilineSmall]}
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={1000}
                placeholder="Ask for an explanation or more practice…"
                placeholderTextColor={Brand.muted}
              />
              <Button disabled={!draft.trim() || chatBusy} onPress={() => send()}>
                Send message
              </Button>
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={selector !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelector(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setSelector(null)}>
          <Pressable
            style={s.modalSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={s.sectionHeading}>{selectorTitle}</Text>
            <ScrollView>
              {selectorOptions.map((item) => (
                <Pressable
                  key={item.id ?? item.name}
                  style={s.modalOption}
                  onPress={() => {
                    if (selector === 'subject') {
                      setSubjectId(String(item.id));
                      setTopicId('');
                      setSubtopicId('');
                    } else if (selector === 'topic') {
                      setTopicId(String(item.id));
                      setSubtopicId('');
                    } else {
                      setSubtopicId(String(item.id));
                    }
                    setSelector(null);
                  }}
                >
                  <Text style={s.selectorText}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button variant="secondary" onPress={() => setSelector(null)}>
              Cancel
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  page: {
    paddingTop: 14,
    paddingBottom: 34,
    gap: 18,
  },
  sectionStack: { gap: 16 },
  rowCopy: { flex: 1, minWidth: 0, gap: 3 },
  pressed: { opacity: 0.75 },

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

  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backPill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
  },
  backPillText: { color: Brand.pine, fontWeight: '700', fontSize: 13.5 },
  newSmallPill: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Brand.pine,
  },
  newSmallPillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  kicker: {
    color: Brand.teal,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  errorBanner: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#FFF3F1',
    borderWidth: 1,
    borderColor: '#EBC2BA',
  },
  error: { color: Brand.error, fontSize: 13.5, lineHeight: 19, fontWeight: '600' },

  // Library View
  createHeroCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: Brand.pine,
    gap: 9,
  },
  createHeroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(243, 200, 104, 0.2)',
  },
  createHeroBadgeText: {
    color: Brand.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  createHeroTitle: { color: '#fff', fontSize: 21, fontWeight: '700' },
  createHeroSub: {
    color: '#D2E2DC',
    fontSize: 13.5,
    lineHeight: 20,
  },
  createHeroBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Brand.gold,
  },
  createHeroBtnText: { color: Brand.pine, fontWeight: '700', fontSize: 13.5 },

  kpiGrid: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.card,
    gap: 2,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Brand.muted,
  },
  kpiVal: { fontSize: 20, fontWeight: '700', color: Brand.ink },
  kpiCap: { fontSize: 11, color: Brand.muted },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.line,
  },
  filterPillActive: { backgroundColor: Brand.pine, borderColor: Brand.pine },
  filterPillText: { fontSize: 12.5, fontWeight: '600', color: Brand.muted },
  filterPillTextActive: { color: '#fff', fontWeight: '700' },

  emptyCard: { alignItems: 'center', padding: 24, gap: 8 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.ink,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13.5,
    lineHeight: 20,
    color: Brand.muted,
    textAlign: 'center',
  },

  cardList: { gap: 12 },
  assessCard: { padding: 16, gap: 12, borderLeftWidth: 4 },
  assessCardDone: { borderLeftColor: Brand.teal },
  assessCardActive: { borderLeftColor: Brand.amber },
  assessCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusBadgeDone: { backgroundColor: '#DEF3E7' },
  statusBadgeActive: { backgroundColor: Brand.amberPale },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextDone: { color: '#1C6644' },
  statusBadgeTextActive: { color: '#96600E' },
  typeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Brand.subtle,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: Brand.muted },
  cardTitleWrap: { gap: 3, minWidth: 0 },
  cardPath: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Brand.teal,
  },
  cardTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: Brand.ink,
    lineHeight: 22,
  },
  cardStatsBox: {
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E6ECE8',
    gap: 7,
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardScoreText: { fontSize: 12.5, fontWeight: '700', color: Brand.ink },
  barTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#E3EDE8',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: Brand.teal },
  assessCardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
  },
  openActionText: { fontSize: 13, fontWeight: '700', color: Brand.pine },

  // Setup Form
  formCard: { padding: 18, gap: 16 },
  fieldBlock: { gap: 7 },
  label: { color: Brand.ink, fontSize: 13.5, fontWeight: '700' },
  muted: { color: Brand.muted, fontSize: 12.5, lineHeight: 18 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderColor: Brand.line,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: Brand.ink,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  selector: {
    minHeight: 48,
    borderRadius: 12,
    borderColor: Brand.line,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minWidth: 0,
  },
  selectorText: {
    flex: 1,
    minWidth: 0,
    color: Brand.ink,
    fontSize: 14.5,
    fontWeight: '600',
  },
  selectorPlaceholder: { flex: 1, minWidth: 0, color: Brand.muted, fontSize: 14.5 },
  disabled: { opacity: 0.5 },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: '#fff',
  },
  presetChipActive: { backgroundColor: Brand.pine, borderColor: Brand.pine },
  presetChipText: { fontSize: 13, fontWeight: '700', color: Brand.muted },
  presetChipTextActive: { color: '#fff' },
  countInput: {
    width: 68,
    textAlign: 'center',
    minHeight: 40,
    paddingVertical: 6,
  },
  multiline: { minHeight: 104 },
  multilineSmall: { minHeight: 78 },
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.line,
    padding: 13,
    backgroundColor: '#fff',
  },
  choiceSelected: { borderColor: Brand.teal, backgroundColor: '#F2F9F6' },
  choiceCopy: { flex: 1, minWidth: 0, gap: 3 },
  choiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  choiceTitle: { fontSize: 14.5, fontWeight: '700', color: Brand.ink },
  choiceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: Brand.tealPale,
  },
  choiceBadgeText: { fontSize: 10, fontWeight: '700', color: Brand.teal },
  radio: {
    width: 18,
    height: 18,
    marginTop: 2,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Brand.muted,
    flexShrink: 0,
  },
  radioSelected: { borderColor: Brand.teal, backgroundColor: Brand.teal },
  setupActions: { gap: 10, marginTop: 4 },

  // Active Assessment Stepper
  progressHeaderCard: { padding: 15, gap: 12 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minWidth: 0,
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Brand.tealPale,
    flexShrink: 0,
  },
  progressPillText: { color: Brand.pine, fontWeight: '700', fontSize: 12 },
  sectionHeading: { color: Brand.pine, fontSize: 18, fontWeight: '700' },
  progress: { color: Brand.teal, fontWeight: '700' },
  stepDotsRow: {
    gap: 7,
    paddingTop: 2,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: Brand.tealPale,
    borderColor: Brand.teal,
  },
  stepDotCurrent: {
    backgroundColor: Brand.pine,
    borderColor: Brand.pine,
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.muted,
  },
  stepDotTextDone: {
    color: Brand.pine,
  },
  stepDotTextCurrent: {
    color: '#FFFFFF',
  },

  questionCard: { padding: 18, gap: 14 },
  questionCardAnswered: { borderColor: '#9ED3B7' },
  qTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Brand.line,
  },
  qNumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Brand.tealPale,
  },
  qNumBadgeText: { fontSize: 11, fontWeight: '700', color: Brand.pine },
  qTypeLabel: { fontSize: 11.5, fontWeight: '600', color: Brand.muted },
  conceptTag: { fontSize: 12, fontWeight: '700', color: Brand.teal },
  question: {
    color: Brand.ink,
    fontWeight: '700',
    fontSize: 16.5,
    lineHeight: 24,
  },
  optionsList: { gap: 9 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderRadius: 13,
    borderColor: Brand.line,
    borderWidth: 1.5,
    backgroundColor: '#fff',
    minWidth: 0,
  },
  optionSelected: { borderColor: Brand.teal, backgroundColor: '#F0F9F6' },
  optionLetterBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.tealPale,
    flexShrink: 0,
  },
  optionLetterBoxSelected: { backgroundColor: Brand.teal },
  optionLetter: { color: Brand.pine, fontWeight: '700', fontSize: 12.5 },
  optionLetterSelected: { color: '#fff' },
  optionText: {
    flex: 1,
    minWidth: 0,
    color: Brand.ink,
    fontSize: 14.5,
    lineHeight: 21,
  },
  writtenAnswerWrap: { gap: 6 },
  stepperNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    flex: 1,
  },

  // Review / Details Screen
  scoreBanner: { padding: 18, gap: 14 },
  scoreTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: Brand.teal,
    backgroundColor: Brand.tealPale,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreCircleVal: { fontSize: 20, fontWeight: '700', color: Brand.pine },
  scoreCircleSub: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Brand.teal,
  },
  scoreActionsRow: { flexDirection: 'row', gap: 10 },

  detailCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    borderLeftWidth: 4,
    gap: 12,
  },
  detailCardCorrect: { borderLeftColor: Brand.teal },
  detailCardPartial: { borderLeftColor: Brand.amber },
  detailCardReview: { borderLeftColor: '#CF5656' },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Brand.line,
  },
  detailQNum: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Brand.pine,
  },
  detailConcept: { fontSize: 12.5, fontWeight: '600', color: Brand.teal },
  verdictBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  verdictGood: { backgroundColor: '#DEF3E7' },
  verdictPartial: { backgroundColor: Brand.amberPale },
  verdictFlag: { backgroundColor: '#FDE5E4' },
  verdictText: { fontSize: 11, fontWeight: '700' },
  verdictTextGood: { color: '#1C6644' },
  verdictTextPartial: { color: '#96600E' },
  verdictTextFlag: { color: '#A9383B' },

  detailPrompt: {
    color: Brand.ink,
    fontWeight: '700',
    fontSize: 15.5,
    lineHeight: 22,
  },
  answerBlock: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  answerBlockGood: { backgroundColor: '#F2FBF6', borderColor: '#BFE5D0' },
  answerBlockFlag: { backgroundColor: '#FFFAF0', borderColor: Brand.line },
  answerBlockExpected: { backgroundColor: '#F0F9F8', borderColor: '#BFE0DE' },
  feedbackBlock: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EEF8F7',
    borderWidth: 1,
    borderColor: Brand.line,
    gap: 4,
  },
  improveBlock: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFCF5',
    borderWidth: 1,
    borderColor: '#F2DEC0',
    gap: 4,
  },
  exampleBlock: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8F7FE',
    borderWidth: 1,
    borderColor: '#DDD9F6',
    gap: 4,
  },
  boxHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: Brand.muted,
  },
  boxBodyText: { color: Brand.ink, fontSize: 14, lineHeight: 20 },
  discussBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Brand.subtle,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  discussBtnText: { fontSize: 12, fontWeight: '700', color: Brand.pine },

  chatCard: { padding: 18, gap: 12 },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    padding: 12,
    borderRadius: 14,
    backgroundColor: Brand.tealPale,
    gap: 3,
  },
  tutorBubble: {
    alignSelf: 'flex-start',
    maxWidth: '94%',
    padding: 12,
    borderRadius: 14,
    backgroundColor: Brand.parchment,
    gap: 3,
  },
  bubbleLabel: {
    color: Brand.teal,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  modalSheet: {
    maxHeight: '75%',
    gap: 14,
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#fff',
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.line,
  },
});
