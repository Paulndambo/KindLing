import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { List, MessageSquare, Settings } from "lucide-react";
import { DEFAULT_LESSON_TOPICS } from "../../constants/subjects";
import {
  useSpeechSynthesis,
  useSpeechRecognition,
} from "../../hooks/useSpeech";
import { useChatSession } from "../../hooks/useChatSession";
import { useStudentLearning } from "../../hooks/useStudentLearning";
import { useConnectivity } from "../../hooks/useConnectivity";
import { useMultiStep } from "../../hooks/useMultiStep";
import {
  buildLocalSkillPath,
} from "../../services/learning/skillGraph";
import {
  analyzeHomeworkWithGemini,
  attachHomeworkAnalysis,
  buildHomeworkStudentCaption,
  buildHomeworkTutorPrompt,
  readFileAsDataUrl,
  uploadHomeworkFile,
  validateHomeworkFile,
} from "../../services/homework";
import {
  MANIPULATIVE_TYPES,
  manipulativesForTopic,
  parseVisualDirective,
} from "../../services/learning/manipulatives";
import {
  LearningEventType,
  createLearningEvent,
  submitLearningEvents,
} from "../../services/learning";
import { reportError, trackMetric } from "../../services/telemetry";
import LessonPath from "./LessonPath";
import ChatPanel from "./ChatPanel";
import LessonTools from "./LessonTools";
import ConversationJournal from "./ConversationJournal";
import ManipulativePanel from "./manipulatives/ManipulativePanel";
import MultiStepPanel from "./MultiStepPanel";
import "../../styles/lesson.css";

export default function Lesson({ activeLesson, student, subjects }) {
  const subjectName = activeLesson?.subject || "Math";
  const studentName = student?.name?.trim() || "Student";

  const subjectObj = useMemo(
    () => subjects?.find((s) => s.name === subjectName) || null,
    [subjects, subjectName]
  );

  const subjectTopicRecords = useMemo(() => {
    if (subjectObj?.topics?.length) return subjectObj.topics;
    return DEFAULT_LESSON_TOPICS.map((name, i) => ({
      id: `local-${i}`,
      name,
      familiarity: "new",
      learningGoal: "",
    }));
  }, [subjectObj]);

  const subjectTopics = useMemo(
    () => subjectTopicRecords.map((t) => t.name),
    [subjectTopicRecords]
  );

  const defaultIdx = Math.max(
    0,
    subjectTopics.indexOf(activeLesson?.topic || subjectTopics[0])
  );
  const [activeTopicIdx, setActiveTopicIdx] = useState(defaultIdx);
  const topicName = subjectTopics[activeTopicIdx];
  const activeTopicRecord = subjectTopicRecords[activeTopicIdx] || null;

  const topicContext = useMemo(
    () => ({
      familiarity: activeTopicRecord?.familiarity || "new",
      learningGoal: activeTopicRecord?.learningGoal || "",
      subjectGoal: subjectObj?.learningGoal || "",
    }),
    [activeTopicRecord, subjectObj]
  );

  const [tools, setTools] = useState({
    visuals: true,
    encourage: false,
    voiceOutput: false,
  });

  // Mobile panel switcher: "chat" | "path" | "tools"
  const [mobilePanel, setMobilePanel] = useState("chat");
  /** Desktop: collapse lesson-path sidebar for more chat room */
  const [pathCollapsed, setPathCollapsed] = useState(false);

  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef(null);
  const lastInputWasVoiceRef = useRef(false);
  const [homeworkBusy, setHomeworkBusy] = useState(false);
  const [homeworkError, setHomeworkError] = useState("");

  // Epic A6 interactive models
  const availableManipulatives = useMemo(
    () => manipulativesForTopic(topicName),
    [topicName]
  );
  const [manipOpen, setManipOpen] = useState(
    () => manipulativesForTopic(topicName).length > 0
  );
  const [manipType, setManipType] = useState(MANIPULATIVE_TYPES.FRACTION_BAR);
  const [manipState, setManipState] = useState({ num: 1, den: 4 });
  const [tutorPulse, setTutorPulse] = useState(null);
  const tutorPulseTimerRef = useRef(null);

  // Pending auto-enter after recordExchange returns
  const pendingAutoInterventionRef = useRef(null);

  const { isSpeaking, isLoadingVoice, speak, stopSpeaking, prepareAudio } =
    useSpeechSynthesis();

  const connectivity = useConnectivity({ enabled: true });

  const studentId =
    student?.id != null
      ? `id_${student.id}`
      : student?.name?.toLowerCase().replace(/\s+/g, "_") || "anonymous";

  const {
    profile,
    insights,
    lastSignals,
    sessionSummary,
    intervention,
    softNudge,
    affectCheckIn,
    persistenceNote,
    beginSession,
    recordExchange,
    recordToolToggle,
    recordTopicSwitch,
    markAwaitingStudent,
    noteInputModality,
    acceptIntervention,
    declineIntervention,
    exitIntervention,
    requestInterventionLevel,
    requestLibraryExample,
    escalateIntervention,
    dismissSoftNudge,
    acceptSoftNudgeHelp,
    respondAffectCheckIn,
    dismissAffectCheckIn,
    dismissPersistenceNote,
    applyResumeSnapshot,
    getSessionId,
    offerIntervention,
    exampleLibrary,
    activeMisconceptionHits,
  } = useStudentLearning({
    student,
    subjectName,
    topicName,
    tools,
  });

  const toggle = useCallback(
    (key) => {
      setTools((t) => {
        const nextValue = !t[key];
        const turningVoiceOn = key === "voiceOutput" && nextValue;
        const turningVoiceOff = key === "voiceOutput" && t.voiceOutput;

        if (turningVoiceOn) prepareAudio();
        if (turningVoiceOff) stopSpeaking();

        recordToolToggle(key, nextValue);
        return { ...t, [key]: nextValue };
      });
    },
    [prepareAudio, stopSpeaking, recordToolToggle]
  );

  const logManipulative = useCallback(
    (action, extra = {}) => {
      const sessionId = getSessionId?.() || undefined;
      submitLearningEvents(
        createLearningEvent(
          LearningEventType.MANIPULATIVE_USED,
          {
            action,
            type: extra.type || manipType,
            num: extra.num ?? manipState.num,
            den: extra.den ?? manipState.den,
            subject: subjectName,
            topic: topicName,
            sessionId,
            ...extra,
          },
          { studentId, sessionId }
        )
      );
      trackMetric("manipulative.used", {
        sessionId,
        tags: { action, type: extra.type || manipType, topic: topicName },
      });
    },
    [
      getSessionId,
      manipType,
      manipState.num,
      manipState.den,
      subjectName,
      topicName,
      studentId,
    ]
  );

  // Reset manipulative defaults when topic changes
  useEffect(() => {
    const avail = manipulativesForTopic(topicName);
    if (avail.length) {
      setManipType(avail[0]);
      setManipOpen(tools.visuals !== false);
      setManipState({ num: 1, den: topicName.toLowerCase().includes("number") ? 4 : 4 });
      setTutorPulse(null);
    } else {
      setManipOpen(false);
    }
  }, [topicName, tools.visuals]);

  const handleTutorReply = useCallback(
    (text) => {
      if (tools.voiceOutput) speak(text);
      // Epic A6: tutor can drive the manipulative via hidden visual tags
      const directive = parseVisualDirective(text);
      if (directive && availableManipulatives.length) {
        setManipType(directive.type);
        setManipState({ num: directive.num, den: directive.den });
        setManipOpen(true);
        setTutorPulse({
          num: directive.num,
          den: directive.den,
          label: directive.label || "Kindling moved the model",
          type: directive.type,
        });
        logManipulative("tutor_set", {
          type: directive.type,
          num: directive.num,
          den: directive.den,
          fromTag: !directive.fromNaturalLanguage,
        });
        if (tutorPulseTimerRef.current) {
          window.clearTimeout(tutorPulseTimerRef.current);
        }
        tutorPulseTimerRef.current = window.setTimeout(
          () => setTutorPulse(null),
          8000
        );
      }
    },
    [speak, tools.voiceOutput, availableManipulatives.length, logManipulative]
  );

  const handleReadAloud = useCallback(
    (text) => {
      prepareAudio();
      // stripMathCheckTags is also applied inside stripMarkdown for TTS
      speak(text);
    },
    [prepareAudio, speak]
  );

  const handleTranscript = useCallback((text) => {
    lastInputWasVoiceRef.current = true;
    noteInputModality("voice");
    setInputVal(text);
  }, [noteInputModality]);

  const { isListening, toggleListening } =
    useSpeechRecognition(handleTranscript);

  const handleSessionBegin = useCallback(() => {
    beginSession();
  }, [beginSession]);

  // Epic B6 — multi-step show-your-work (hook needs getSessionId from learning)
  const multiStep = useMultiStep({
    studentId,
    subjectName,
    topicName,
    getSessionId,
  });

  const {
    messages,
    isStreaming,
    isSummarizing,
    msgCount,
    chatAreaRef,
    sendMessage,
    startNewConversation,
    endConversation,
    continueAfterEnd,
    enterInterventionMode,
    exitInterventionMode,
    enterMultiStepMode,
    exitMultiStepMode,
    conversationMeta,
    journalOpen,
    openJournal,
    closeJournal,
    viewArchivedConversation,
    exitArchiveView,
    viewingArchiveId,
    isArchiveView,
    hasAi,
    chatError,
    clearChatError,
    retryLastFailed,
    safetyEscalation,
    acknowledgeSafetyPause,
    resumeAfterSafety,
    persistResumeSnapshot,
    sendHomeworkHelp,
    conversationId,
  } = useChatSession({
    subjectName,
    topicName,
    student,
    studentId,
    tools,
    learningInsights: insights,
    topicContext,
    interventionActive: intervention.status === "active",
    interventionContext: intervention.context,
    multiStepSession: multiStep.multiStepSession,
    onTutorReply: handleTutorReply,
    onSessionReset: stopSpeaking,
    onSessionBegin: handleSessionBegin,
    onExchangeComplete: async ({ studentText, tutorText, wasHintRequest }) => {
      // Epic B6 — grade current show-your-work step when mode is active
      const stepOutcome = multiStep.recordStepAnswer(studentText, {
        tutorText,
      });
      const result = await recordExchange({
        studentText,
        tutorText,
        wasHintRequest,
        multiStepOutcome: stepOutcome,
      });
      // Auto-enter only for *this* topic — attach topic so a later switch discards it
      if (result?.interventionAction?.action === "auto_enter") {
        pendingAutoInterventionRef.current = {
          ...(result.interventionAction.context || {}),
          topic: topicName,
          subject: subjectName,
        };
      }
    },
    onAwaitingStudent: markAwaitingStudent,
    onResumeSnapshot: applyResumeSnapshot,
  });

  const handleStartMultiStep = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    const ses = multiStep.startMultiStep();
    if (ses) {
      await enterMultiStepMode(ses);
      setMobilePanel("chat");
    }
  }, [
    multiStep,
    enterMultiStepMode,
    tools.voiceOutput,
    prepareAudio,
  ]);

  const handleExitMultiStep = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    const prev = multiStep.multiStepSession;
    multiStep.exitMultiStep();
    await exitMultiStepMode(prev);
  }, [multiStep, exitMultiStepMode, tools.voiceOutput, prepareAudio]);

  const handleMultiStepHint = useCallback(() => {
    const step = multiStep.multiStepCurrentStep;
    const hint = step?.hint;
    if (!hint) return;
    noteInputModality("text");
    sendMessage(`Can you give me a hint for this step? (${step.label})`);
  }, [multiStep.multiStepCurrentStep, noteInputModality, sendMessage]);

  // Persist resume snapshot when intervention/tools change (Epic A2)
  useEffect(() => {
    if (!persistResumeSnapshot) return undefined;
    const handle = window.setTimeout(() => {
      void persistResumeSnapshot({
        intervention: {
          status: intervention.status,
          reason: intervention.reason,
          context: intervention.context,
          autoEntered: intervention.autoEntered,
          level: intervention.level || intervention.context?.level,
        },
        tools,
        personalization: insights
          ? {
              summary: insights.summary,
              directives: insights.directives,
              topicMastery: insights.stats?.topicMastery,
              topicSkillState: insights.stats?.topicSkillState,
            }
          : null,
        sessionId: getSessionId?.() || null,
        subject: subjectName,
        topic: topicName,
      });
    }, 800);
    return () => window.clearTimeout(handle);
  }, [
    intervention.status,
    intervention.reason,
    intervention.context,
    intervention.autoEntered,
    tools,
    insights,
    subjectName,
    topicName,
    persistResumeSnapshot,
    getSessionId,
  ]);

  // When struggle auto-triggers intervention, start guide mode after streaming settles.
  // Never fire a pending intervention from a *different* topic (topic switch race).
  useEffect(() => {
    if (!pendingAutoInterventionRef.current || isStreaming) return;
    const ctx = pendingAutoInterventionRef.current;
    const ctxTopic = ctx?.topic;
    if (ctxTopic && ctxTopic !== topicName) {
      // Stale pending from previous topic — discard
      pendingAutoInterventionRef.current = null;
      return;
    }
    pendingAutoInterventionRef.current = null;
    enterInterventionMode(ctx);
  }, [isStreaming, messages, enterInterventionMode, topicName]);

  // Track topic switches for learning API; clear cross-topic auto-intervention
  const prevTopicRef = useRef(topicName);
  useEffect(() => {
    if (prevTopicRef.current !== topicName) {
      pendingAutoInterventionRef.current = null;
      recordTopicSwitch(subjectName, topicName);
      prevTopicRef.current = topicName;
    }
  }, [topicName, subjectName, recordTopicSwitch]);

  const handleSend = useCallback(async () => {
    const text = inputVal.trim();
    if (!text) return;
    if (connectivity.online === false) return;
    if (tools.voiceOutput) prepareAudio();

    if (lastInputWasVoiceRef.current) {
      noteInputModality("voice");
      lastInputWasVoiceRef.current = false;
    } else {
      noteInputModality("text");
    }

    setInputVal("");
    await sendMessage(text);
    inputRef.current?.focus();
  }, [
    inputVal,
    sendMessage,
    tools.voiceOutput,
    prepareAudio,
    noteInputModality,
    connectivity.online,
  ]);

  const handleRetryChatError = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    await retryLastFailed();
  }, [retryLastFailed, tools.voiceOutput, prepareAudio]);

  /**
   * Epic A4: photo homework → upload → vision analyze → guided tutor help.
   */
  const handleAttachHomework = useCallback(
    async (file) => {
      setHomeworkError("");
      const check = validateHomeworkFile(file);
      if (!check.ok) {
        setHomeworkError(check.reason || "Could not use that image.");
        return;
      }
      if (!hasAi) {
        setHomeworkError("AI is not configured — cannot read the photo yet.");
        return;
      }

      setHomeworkBusy(true);
      try {
        const { dataUrl, base64, mimeType } = await readFileAsDataUrl(file);

        // 1) Persist upload (best-effort when offline / unauth)
        let homeworkMeta = {
          id: null,
          imageUrl: dataUrl,
        };
        try {
          const uploaded = await uploadHomeworkFile(file, {
            subject: subjectName,
            topic: topicName,
            conversationId: conversationId || "",
            studentId,
          });
          homeworkMeta = {
            id: uploaded.id,
            imageUrl: uploaded.imageUrl || dataUrl,
          };
        } catch (upErr) {
          // Still allow local analysis if upload fails
          console.warn("Homework upload failed, continuing with local preview", upErr);
        }

        // 2) Vision / OCR via Gemini
        const analysis = await analyzeHomeworkWithGemini({
          base64,
          mimeType,
          subject: subjectName,
          topic: topicName,
          studentName,
        });

        if (analysis.isHomework === false) {
          setHomeworkError(
            "That photo does not look like school work. Try a clearer page of your homework."
          );
          trackMetric("homework.rejected_not_homework", {
            tags: { subject: subjectName, topic: topicName },
          });
          return;
        }

        if (homeworkMeta.id) {
          try {
            const saved = await attachHomeworkAnalysis(homeworkMeta.id, analysis);
            if (saved?.imageUrl) homeworkMeta.imageUrl = saved.imageUrl;
          } catch (aErr) {
            console.warn("Could not attach analysis to server record", aErr);
          }
        }

        const caption = buildHomeworkStudentCaption(analysis);
        const apiMessage = buildHomeworkTutorPrompt({
          analysis,
          subject: subjectName,
          topic: topicName,
          studentName,
          interventionActive: intervention.status === "active",
        });

        if (tools.voiceOutput) prepareAudio();
        await sendHomeworkHelp({
          caption,
          apiMessage,
          imageUrl: homeworkMeta.imageUrl,
          homeworkId: homeworkMeta.id,
          analysis,
        });

        // Strong struggle signal from photo → offer guide mode (respect intervention rules)
        if (intervention.status === "idle" && (analysis.errors?.length || 0) >= 2) {
          offerIntervention({
            reason: "homework_errors",
            autoEnter: false,
          });
        }

        trackMetric("homework.analyzed", {
          tags: {
            subject: subjectName,
            topic: topicName,
            errorCount: analysis.errors?.length || 0,
            confidence: analysis.confidence,
          },
        });
      } catch (err) {
        console.error(err);
        setHomeworkError(
          err?.message || "Could not read that photo. Try again with better light."
        );
        reportError({
          kind: "lesson",
          code: "HOMEWORK_FLOW_FAIL",
          message: err?.message || "Homework flow failed",
          component: "Lesson.handleAttachHomework",
          extra: { subject: subjectName, topic: topicName },
        });
      } finally {
        setHomeworkBusy(false);
      }
    },
    [
      hasAi,
      subjectName,
      topicName,
      conversationId,
      studentId,
      studentName,
      intervention.status,
      tools.voiceOutput,
      prepareAudio,
      sendHomeworkHelp,
      offerIntervention,
    ]
  );

  const requestHint = useCallback(() => {
    noteInputModality("text");
    sendMessage("Can you give me a hint?", { wasHintRequest: true });
  }, [sendMessage, noteInputModality]);

  const handleAcceptIntervention = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    const context = acceptIntervention();
    await enterInterventionMode(context);
    setMobilePanel("chat");
  }, [acceptIntervention, enterInterventionMode, tools.voiceOutput, prepareAudio]);

  const handleDeclineIntervention = useCallback(() => {
    declineIntervention();
  }, [declineIntervention]);

  const handleNudgeThinking = useCallback(() => {
    dismissSoftNudge();
  }, [dismissSoftNudge]);

  const handleNudgeHelp = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    const result = acceptSoftNudgeHelp();
    const context = result?.context;
    if (!context) return;
    if (isStreaming) {
      pendingAutoInterventionRef.current = {
        ...context,
        topic: topicName,
        subject: subjectName,
      };
      return;
    }
    await enterInterventionMode(context);
    setMobilePanel("chat");
  }, [
    acceptSoftNudgeHelp,
    enterInterventionMode,
    tools.voiceOutput,
    prepareAudio,
    topicName,
    subjectName,
    isStreaming,
  ]);

  const handleExitIntervention = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    const topic = intervention.context?.topic || topicName;
    const level = intervention.level || intervention.context?.level;
    exitIntervention();
    await exitInterventionMode({ topic, level });
  }, [
    exitIntervention,
    exitInterventionMode,
    intervention.context,
    intervention.level,
    topicName,
    tools.voiceOutput,
    prepareAudio,
  ]);

  /** Manual request for full guide (legacy entry). */
  const handleRequestGuide = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    const context = requestInterventionLevel(3);
    await enterInterventionMode(context);
    setMobilePanel("chat");
  }, [
    requestInterventionLevel,
    enterInterventionMode,
    tools.voiceOutput,
    prepareAudio,
  ]);

  /** Epic B2 — start a specific ladder level from tools. */
  const handleRequestLevel = useCallback(
    async (level) => {
      if (tools.voiceOutput) prepareAudio();
      const context = requestInterventionLevel(level);
      await enterInterventionMode(context);
      setMobilePanel("chat");
    },
    [
      requestInterventionLevel,
      enterInterventionMode,
      tools.voiceOutput,
      prepareAudio,
    ]
  );

  /** Epic B4 — start library worked example for this topic. */
  const handleRequestLibraryExample = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    const context = requestLibraryExample();
    await enterInterventionMode(context);
    setMobilePanel("chat");
  }, [
    requestLibraryExample,
    enterInterventionMode,
    tools.voiceOutput,
    prepareAudio,
  ]);

  /** Offer or jump to next ladder rung while help is active. */
  const handleEscalateIntervention = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    // If already offered escalate card, accept it; else offer next level and enter
    if (
      intervention.status === "offered" &&
      (intervention.escalate || intervention.reason === "escalate")
    ) {
      const context = acceptIntervention();
      await enterInterventionMode(context);
      setMobilePanel("chat");
      return;
    }
    const result = escalateIntervention({ autoEnter: true });
    const context = result?.context;
    if (context) {
      await enterInterventionMode(context);
      setMobilePanel("chat");
    }
  }, [
    tools.voiceOutput,
    prepareAudio,
    intervention.status,
    intervention.escalate,
    intervention.reason,
    acceptIntervention,
    escalateIntervention,
    enterInterventionMode,
  ]);

  const handlePickOfferLevel = useCallback(
    async (level) => {
      if (tools.voiceOutput) prepareAudio();
      const context = acceptIntervention({ level, reason: "student_request" });
      await enterInterventionMode(context);
      setMobilePanel("chat");
    },
    [
      acceptIntervention,
      enterInterventionMode,
      tools.voiceOutput,
      prepareAudio,
    ]
  );

  // Difficulty from live mastery + session progress (not just message count)
  const topicMastery =
    insights?.stats?.topicMastery ??
    profile?.mastery?.[`${subjectName}::${topicName}`]?.score ??
    null;

  const sessionAccuracy = sessionSummary?.accuracy;
  const baseFromMastery =
    topicMastery != null ? Math.min(90, Math.max(15, topicMastery)) : 20;
  const progressBump = Math.min(msgCount * 4, 25);
  const accuracyBump =
    sessionAccuracy != null ? Math.round(sessionAccuracy * 15) : 0;
  const diffPct = Math.min(
    96,
    Math.round(baseFromMastery * 0.55 + progressBump + accuracyBump)
  );

  const skillPath = useMemo(
    () => buildLocalSkillPath(profile, subjectName, topicName),
    [profile, subjectName, topicName]
  );

  const skillLabel = skillPath?.topicStateLabel;

  const diffLabel =
    multiStep.multiStepActive
      ? `Show your work · ${multiStep.multiStepPartialCredit?.percent || 0}%`
      : multiStep.multiStepCompleted
        ? "Work path complete"
        : intervention.status === "active"
          ? "Guide mode — step by step"
          : skillLabel && skillPath?.hasGraph
            ? skillLabel
            : lastSignals?.correctness === "incorrect"
              ? "Scaffolding…"
              : lastSignals?.correctness === "correct"
                ? "Leveling up"
                : diffPct < 30
                  ? "Warming up…"
                  : diffPct < 55
                    ? "Building momentum"
                    : diffPct < 80
                      ? "Pushing further!"
                      : "🏆 Near mastery!";

  // Prefer skill-blend mastery when graph is active
  const skillBlend =
    skillPath?.hasGraph && skillPath.skills?.length
      ? Math.round(
          skillPath.skills
            .filter((s) => s.isPrimary)
            .reduce((a, s) => a + (s.score || 0), 0) /
            Math.max(
              1,
              skillPath.skills.filter((s) => s.isPrimary).length
            )
        )
      : null;
  const effectiveDiffPct =
    skillBlend != null
      ? Math.min(96, Math.round(skillBlend * 0.7 + progressBump + accuracyBump * 0.5))
      : diffPct;

  return (
    <section id="lesson">
      <div
        className={`lesson-shell${pathCollapsed ? " path-collapsed" : ""}`}
        data-mobile-panel={mobilePanel}
      >
        <LessonPath
          subjectName={subjectName}
          topics={subjectTopics}
          activeTopicIdx={activeTopicIdx}
          onSelectTopic={(i) => {
            setActiveTopicIdx(i);
            setMobilePanel("chat");
          }}
          student={student}
          onCollapse={() => setPathCollapsed(true)}
          learningProfile={profile}
          activeSkillPath={skillPath}
          recommendedNext={
            insights?.stats?.recommendedNextSkill || skillPath?.recommendedNext
          }
        />

        <ChatPanel
          topicName={topicName}
          subjectName={subjectName}
          studentName={studentName}
          curriculum={student?.curriculum}
          messages={messages}
          isStreaming={isStreaming}
          isSpeaking={isSpeaking}
          isLoadingVoice={isLoadingVoice}
          isListening={isListening}
          hasAi={hasAi}
          inputVal={inputVal}
          setInputVal={(v) => {
            lastInputWasVoiceRef.current = false;
            setInputVal(v);
          }}
          chatAreaRef={chatAreaRef}
          inputRef={inputRef}
          onSend={handleSend}
          onToggleListening={toggleListening}
          onSpeak={handleReadAloud}
          onStopSpeaking={stopSpeaking}
          intervention={intervention}
          softNudge={softNudge}
          onAcceptIntervention={handleAcceptIntervention}
          onDeclineIntervention={handleDeclineIntervention}
          onExitIntervention={handleExitIntervention}
          onNudgeThinking={handleNudgeThinking}
          onNudgeHelp={handleNudgeHelp}
          onEscalateIntervention={handleEscalateIntervention}
          onPickLevel={handlePickOfferLevel}
          affectCheckIn={affectCheckIn}
          onAffectRespond={respondAffectCheckIn}
          onAffectDismiss={dismissAffectCheckIn}
          persistenceNote={persistenceNote}
          onDismissPersistenceNote={dismissPersistenceNote}
          pathCollapsed={pathCollapsed}
          onExpandPath={() => setPathCollapsed(false)}
          isResume={conversationMeta?.isResume}
          isArchiveView={isArchiveView || Boolean(viewingArchiveId)}
          conversationEnded={conversationMeta?.status === "ended"}
          endedSummary={conversationMeta?.lastEndedSummary}
          isSummarizing={isSummarizing}
          onStartNewConversation={startNewConversation}
          onContinueAfterEnd={continueAfterEnd}
          onOpenJournal={openJournal}
          onExitArchiveView={exitArchiveView}
          archiveCount={conversationMeta?.archived?.length || 0}
          chatError={chatError}
          onRetryChatError={handleRetryChatError}
          onDismissChatError={clearChatError}
          connectivity={connectivity}
          safetyEscalation={safetyEscalation}
          onSafetyPause={acknowledgeSafetyPause}
          onSafetyResume={resumeAfterSafety}
          onAttachHomework={handleAttachHomework}
          homeworkBusy={homeworkBusy}
          homeworkError={homeworkError}
          onClearHomeworkError={() => setHomeworkError("")}
          multiStepSlot={
            multiStep.multiStepSession ? (
              <MultiStepPanel
                session={multiStep.multiStepSession}
                open
                onExit={handleExitMultiStep}
                onHint={handleMultiStepHint}
                disabled={isStreaming || isSummarizing}
              />
            ) : null
          }
          manipulativeSlot={
            availableManipulatives.length > 0 && tools.visuals !== false ? (
              <ManipulativePanel
                topicName={topicName}
                open={manipOpen}
                onOpenChange={(open) => {
                  setManipOpen(open);
                  logManipulative(open ? "open" : "close");
                }}
                type={manipType}
                onTypeChange={(t) => {
                  setManipType(t);
                  logManipulative("switch_type", { type: t });
                }}
                num={manipState.num}
                den={manipState.den}
                onStateChange={(next) => {
                  setManipState(next);
                  logManipulative("adjust", {
                    num: next.num,
                    den: next.den,
                  });
                }}
                tutorPulse={tutorPulse}
                disabled={isStreaming || isSummarizing}
                onShareWithTutor={async ({ text, type, num, den }) => {
                  logManipulative("share", { type, num, den });
                  noteInputModality("text");
                  await sendMessage(
                    `${text} What do you notice about this model?`
                  );
                }}
              />
            ) : null
          }
        />

        <LessonTools
          tools={tools}
          onToggle={toggle}
          diffPct={effectiveDiffPct}
          diffLabel={diffLabel}
          isStreaming={isStreaming || isSummarizing}
          hasAi={hasAi}
          student={student}
          hasManipulatives={availableManipulatives.length > 0}
          manipOpen={manipOpen}
          onOpenManipulative={() => {
            setManipOpen(true);
            setMobilePanel("chat");
            logManipulative("open_from_tools");
          }}
          manipState={manipState}
          studentName={studentName}
          onRequestHint={requestHint}
          onRestart={startNewConversation}
          onEndConversation={endConversation}
          onStartNewConversation={startNewConversation}
          onOpenJournal={openJournal}
          isSummarizing={isSummarizing}
          conversationEnded={conversationMeta?.status === "ended"}
          isArchiveView={isArchiveView || Boolean(viewingArchiveId)}
          archiveCount={conversationMeta?.archived?.length || 0}
          lastSignals={lastSignals}
          sessionSummary={sessionSummary}
          learningInsights={insights}
          intervention={intervention}
          onRequestGuide={handleRequestGuide}
          onRequestLevel={handleRequestLevel}
          onRequestLibraryExample={handleRequestLibraryExample}
          libraryExampleTitle={
            exampleLibrary?.best?.title || insights?.libraryExampleTitle
          }
          libraryExampleCount={exampleLibrary?.examples?.length || 0}
          activeMisconceptions={activeMisconceptionHits}
          multiStepAvailable={multiStep.multiStepAvailable}
          multiStepActive={multiStep.multiStepActive}
          multiStepTitle={multiStep.multiStepSession?.problem?.title}
          multiStepPercent={multiStep.multiStepPartialCredit?.percent}
          onStartMultiStep={handleStartMultiStep}
          onExitMultiStep={handleExitMultiStep}
          onExitIntervention={handleExitIntervention}
          onAcceptIntervention={handleAcceptIntervention}
          onDeclineIntervention={handleDeclineIntervention}
          onEscalateIntervention={handleEscalateIntervention}
        />
      </div>

      <ConversationJournal
        open={journalOpen}
        onClose={closeJournal}
        topicName={topicName}
        subjectName={subjectName}
        archived={conversationMeta?.archived || []}
        onView={viewArchivedConversation}
        onStartNew={() => {
          closeJournal();
          startNewConversation();
        }}
      />

      {/* Mobile bottom tab bar */}
      <nav className="lesson-mobile-tabs">
        <button
          className={mobilePanel === "path" ? "active" : ""}
          onClick={() => setMobilePanel("path")}
          aria-label="Lesson path"
        >
          <List size={20} />
          <span>Path</span>
        </button>
        <button
          className={mobilePanel === "chat" ? "active" : ""}
          onClick={() => setMobilePanel("chat")}
          aria-label="Chat"
        >
          <MessageSquare size={20} />
          <span>Chat</span>
        </button>
        <button
          className={mobilePanel === "tools" ? "active" : ""}
          onClick={() => setMobilePanel("tools")}
          aria-label="Tools"
        >
          <Settings size={20} />
          <span>Tools</span>
        </button>
      </nav>
    </section>
  );
}
