import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { List, MessageSquare, Settings } from "lucide-react";
import { DEFAULT_LESSON_TOPICS } from "../../constants/subjects";
import {
  useSpeechSynthesis,
  useSpeechRecognition,
} from "../../hooks/useSpeech";
import { useChatSession } from "../../hooks/useChatSession";
import { useStudentLearning } from "../../hooks/useStudentLearning";
import LessonPath from "./LessonPath";
import ChatPanel from "./ChatPanel";
import LessonTools from "./LessonTools";
import ConversationJournal from "./ConversationJournal";
import "../../styles/lesson.css";

export default function Lesson({ activeLesson, student, subjects }) {
  const subjectName = activeLesson?.subject || "Math";
  const studentName = student?.name?.trim() || "Student";

  const subjectTopics = useMemo(() => {
    const subjectObj = subjects?.find((s) => s.name === subjectName);
    return subjectObj?.topics?.length
      ? subjectObj.topics.map((t) => t.name)
      : DEFAULT_LESSON_TOPICS;
  }, [subjects, subjectName]);

  const defaultIdx = Math.max(
    0,
    subjectTopics.indexOf(activeLesson?.topic || subjectTopics[0])
  );
  const [activeTopicIdx, setActiveTopicIdx] = useState(defaultIdx);
  const topicName = subjectTopics[activeTopicIdx];

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

  // Pending auto-enter after recordExchange returns
  const pendingAutoInterventionRef = useRef(null);

  const { isSpeaking, isLoadingVoice, speak, stopSpeaking, prepareAudio } =
    useSpeechSynthesis();

  const {
    profile,
    insights,
    lastSignals,
    sessionSummary,
    intervention,
    beginSession,
    recordExchange,
    recordToolToggle,
    recordTopicSwitch,
    markAwaitingStudent,
    noteInputModality,
    acceptIntervention,
    declineIntervention,
    exitIntervention,
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

  const handleTutorReply = useCallback(
    (text) => {
      if (tools.voiceOutput) speak(text);
    },
    [speak, tools.voiceOutput]
  );

  const handleReadAloud = useCallback(
    (text) => {
      prepareAudio();
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

  const studentId =
    student?.id != null
      ? `id_${student.id}`
      : student?.name?.toLowerCase().replace(/\s+/g, "_") || "anonymous";

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
    conversationMeta,
    journalOpen,
    openJournal,
    closeJournal,
    viewArchivedConversation,
    exitArchiveView,
    viewingArchiveId,
    isArchiveView,
    hasAi,
  } = useChatSession({
    subjectName,
    topicName,
    student,
    studentId,
    tools,
    learningInsights: insights,
    interventionActive: intervention.status === "active",
    interventionContext: intervention.context,
    onTutorReply: handleTutorReply,
    onSessionReset: stopSpeaking,
    onSessionBegin: handleSessionBegin,
    onExchangeComplete: async ({ studentText, tutorText, wasHintRequest }) => {
      const result = await recordExchange({
        studentText,
        tutorText,
        wasHintRequest,
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
  });

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
  ]);

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

  const handleExitIntervention = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    const topic = intervention.context?.topic || topicName;
    exitIntervention();
    await exitInterventionMode({ topic });
  }, [
    exitIntervention,
    exitInterventionMode,
    intervention.context,
    topicName,
    tools.voiceOutput,
    prepareAudio,
  ]);

  /** Manual request for step-by-step guide from tools panel. */
  const handleRequestGuide = useCallback(async () => {
    if (tools.voiceOutput) prepareAudio();
    const context = acceptIntervention();
    await enterInterventionMode(context);
    setMobilePanel("chat");
  }, [acceptIntervention, enterInterventionMode, tools.voiceOutput, prepareAudio]);

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

  const diffLabel =
    intervention.status === "active"
      ? "Guide mode — step by step"
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
          onAcceptIntervention={handleAcceptIntervention}
          onDeclineIntervention={handleDeclineIntervention}
          onExitIntervention={handleExitIntervention}
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
        />

        <LessonTools
          tools={tools}
          onToggle={toggle}
          diffPct={diffPct}
          diffLabel={diffLabel}
          isStreaming={isStreaming || isSummarizing}
          hasAi={hasAi}
          student={student}
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
          onExitIntervention={handleExitIntervention}
          onAcceptIntervention={handleAcceptIntervention}
          onDeclineIntervention={handleDeclineIntervention}
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
