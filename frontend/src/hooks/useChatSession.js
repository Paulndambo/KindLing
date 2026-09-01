import { useState, useEffect, useRef, useCallback } from "react";
import {
  buildSystemPrompt,
  createChatSession,
  buildInterventionEnterMessage,
  buildInterventionExitMessage,
  buildShowYourWorkEnterMessage,
  buildShowYourWorkExitMessage,
  buildLessonOpeningPrompt,
  normalizeTopicContext,
  summarizeConversation,
  isAiAvailable,
} from "../services/gemini";
import { AI_CONFIG_CHANGED } from "../services/ai";
import {
  getActiveConversation,
  listArchivedConversations,
  createConversation,
  withDayBoundaries,
  buildFallbackSummary,
  buildTranscript,
  newMessageId,
  dayKey,
  loadTopicShelfAsync,
  ensureActiveConversationAsync,
  appendMessageAsync,
  archiveConversationAsync,
  saveTopicShelfAsync,
  saveResumeSnapshotAsync,
} from "../services/learning";
import { reportError } from "../services/telemetry";
import { classifyFailure } from "../services/connectivity";
import {
  detectDistress,
  escalationCopy,
  reportSafetyEvent,
  resolveAgeBand,
} from "../services/safety";

/** Soft timeout so a hung Gemini stream surfaces a recoverable UX. */
const STREAM_TIMEOUT_MS = 90_000;

/**
 * Race a promise against a timeout. Does not cancel the underlying stream
 * (Gemini SDK limitation) but unblocks the UI with a recoverable error.
 */
function withStreamTimeout(promise, ms, label = "Request timed out") {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** Strip synthetic / internal user turns that confuse resume. */
function sanitizeApiHistory(apiHistory = []) {
  return (apiHistory || [])
    .filter((h) => h?.text?.trim() && (h.role === "user" || h.role === "model"))
    .filter(
      (h) =>
        !(
          h.role === "user" &&
          (/\[INTERNAL/i.test(h.text) ||
            /Still in step-by-step guide mode/i.test(h.text) ||
            /^Start the lesson on /i.test(h.text) ||
            /^Open the FIRST live lesson on /i.test(h.text))
        )
    )
    .map((h) => ({ role: h.role, text: h.text }));
}

/**
 * Rebuild Gemini history from UI messages when apiHistory is missing.
 */
function rebuildApiHistoryFromMessages(messages = []) {
  const history = [];
  for (const m of messages) {
    if (m.role === "child" && m.text?.trim()) {
      history.push({ role: "user", text: m.text });
    } else if (m.role === "tutor" && m.text?.trim()) {
      history.push({ role: "model", text: m.text });
    }
  }
  return history.slice(-80);
}

/**
 * Manages a Gemini chat session for a live lesson topic with durable history.
 * - Resumes the active conversation for this subject×topic
 * - Day boundaries in the UI
 * - New conversation / end + journal summary
 */
export function useChatSession({
  subjectName,
  topicName,
  student,
  studentId: studentIdProp,
  tools,
  learningInsights = null,
  /** @type {{ familiarity?: string, learningGoal?: string, subjectGoal?: string } | null} */
  topicContext = null,
  interventionActive = false,
  interventionContext = null,
  multiStepSession = null,
  onTutorReply,
  onSessionReset,
  onSessionBegin,
  /**
   * Epic B7 — optional await before fresh greeting so energy chip can shape first turn.
   * Should resolve quickly on skip/answer or after a short timeout (never hang forever).
   */
  onAwaitSessionStartEnergy = null,
  onExchangeComplete,
  onAwaitingStudent,
  onResumeSnapshot,
}) {
  const studentId =
    studentIdProp ||
    (student?.id != null
      ? `id_${student.id}`
      : student?.name?.toLowerCase().replace(/\s+/g, "_") || "anonymous");

  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [sessionTrigger, setSessionTrigger] = useState(0);
  const [conversationMeta, setConversationMeta] = useState({
    id: null,
    status: "active",
    isResume: false,
    archived: [],
    lastEndedSummary: null,
  });
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [viewingArchiveId, setViewingArchiveId] = useState(null);
  /** @type {[null | { code: string, title: string, message: string, recoverable: boolean, phase: string }, Function]} */
  const [chatError, setChatError] = useState(null);
  /**
   * High-severity safety pause (distress). Blocks normal tutoring until dismissed.
   * @type {[null | { category: string, code: string, copy: object }, Function]}
   */
  const [safetyEscalation, setSafetyEscalation] = useState(null);
  /** Re-render when BYOK keys / routing prefs change. */
  const [aiConfigTick, setAiConfigTick] = useState(0);

  useEffect(() => {
    const bump = () => setAiConfigTick((t) => t + 1);
    window.addEventListener(AI_CONFIG_CHANGED, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(AI_CONFIG_CHANGED, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const hasAi = isAiAvailable();

  const chatRef = useRef(null);
  /** Last failed action so Retry can re-run without re-showing the student bubble. */
  const lastFailedRef = useRef(null);
  const toolsRef = useRef(tools);
  const insightsRef = useRef(learningInsights);
  const interventionActiveRef = useRef(interventionActive);
  const interventionContextRef = useRef(interventionContext);
  const multiStepSessionRef = useRef(multiStepSession);
  const topicContextRef = useRef(topicContext);
  const chatAreaRef = useRef(null);
  const onTutorReplyRef = useRef(onTutorReply);
  const onSessionResetRef = useRef(onSessionReset);
  const onSessionBeginRef = useRef(onSessionBegin);
  const onAwaitSessionStartEnergyRef = useRef(onAwaitSessionStartEnergy);
  const onExchangeCompleteRef = useRef(onExchangeComplete);
  const onAwaitingStudentRef = useRef(onAwaitingStudent);
  const onResumeSnapshotRef = useRef(onResumeSnapshot);
  const pendingStudentRef = useRef(null);
  const historyRef = useRef([]); // { role: 'user'|'model', text }
  const conversationIdRef = useRef(null);
  const modeRef = useRef("fresh"); // fresh | resume | archive_view
  const skipPersistRef = useRef(false);
  /** Bumps on every topic/session boot so in-flight streams from a previous topic are ignored. */
  const bootGenRef = useRef(0);
  const activeTopicRef = useRef({ subject: subjectName, topic: topicName });

  useEffect(() => {
    toolsRef.current = tools;
  }, [tools]);
  useEffect(() => {
    insightsRef.current = learningInsights;
  }, [learningInsights]);
  useEffect(() => {
    interventionActiveRef.current = interventionActive;
  }, [interventionActive]);
  useEffect(() => {
    interventionContextRef.current = interventionContext;
  }, [interventionContext]);
  useEffect(() => {
    multiStepSessionRef.current = multiStepSession;
  }, [multiStepSession]);
  useEffect(() => {
    topicContextRef.current = topicContext;
  }, [topicContext]);
  useEffect(() => {
    onTutorReplyRef.current = onTutorReply;
  }, [onTutorReply]);
  useEffect(() => {
    onSessionResetRef.current = onSessionReset;
  }, [onSessionReset]);
  useEffect(() => {
    onSessionBeginRef.current = onSessionBegin;
  }, [onSessionBegin]);
  useEffect(() => {
    onAwaitSessionStartEnergyRef.current = onAwaitSessionStartEnergy;
  }, [onAwaitSessionStartEnergy]);
  useEffect(() => {
    onExchangeCompleteRef.current = onExchangeComplete;
  }, [onExchangeComplete]);
  useEffect(() => {
    onAwaitingStudentRef.current = onAwaitingStudent;
  }, [onAwaitingStudent]);
  useEffect(() => {
    onResumeSnapshotRef.current = onResumeSnapshot;
  }, [onResumeSnapshot]);

  const studentRef = useRef(student);
  useEffect(() => {
    studentRef.current = student;
  }, [student]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = chatAreaRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, chatError, scrollToBottom]);

  const clearChatError = useCallback(() => {
    setChatError(null);
    lastFailedRef.current = null;
  }, []);

  /**
   * Drop empty / partial streaming tutor bubbles after a failed stream.
   * Never removes the student's message — history must survive.
   */
  const stripFailedTutorBubble = useCallback(() => {
    setMessages((prev) => {
      const updated = [...prev];
      while (updated.length) {
        const last = updated[updated.length - 1];
        if (
          last?.role === "tutor" &&
          (last.streaming || !String(last.text || "").trim())
        ) {
          updated.pop();
          continue;
        }
        break;
      }
      return updated;
    });
  }, []);

  const surfaceAiError = useCallback(
    (err, { phase, studentText = null, wasHintRequest = false } = {}) => {
      const classified = classifyFailure(err);
      lastFailedRef.current = {
        phase,
        studentText,
        wasHintRequest,
        at: Date.now(),
      };
      setChatError({
        ...classified,
        phase,
      });
      stripFailedTutorBubble();
    },
    [stripFailedTutorBubble]
  );

  const refreshJournalList = useCallback(async () => {
    const shelf = await loadTopicShelfAsync(studentId, subjectName, topicName);
    setConversationMeta((m) => ({
      ...m,
      archived: listArchivedConversations(shelf),
    }));
  }, [studentId, subjectName, topicName]);

  const persistUiMessage = useCallback(
    (message, apiPair = null) => {
      if (skipPersistRef.current || !conversationIdRef.current) return;
      // Fire-and-forget: local write-through + backend when authed
      void appendMessageAsync(
        studentId,
        subjectName,
        topicName,
        conversationIdRef.current,
        message,
        apiPair
      );
    },
    [studentId, subjectName, topicName]
  );

  const rebuildChatWithHistory = useCallback(
    (activeIntervention, context, multiStep) => {
      const currentStudent = studentRef.current;
      // undefined → keep ref; null → clear multi-step from prompt
      const msForPrompt =
        multiStep === undefined
          ? multiStepSessionRef.current
          : multiStep;
      const systemPrompt = buildSystemPrompt(
        subjectName,
        topicName,
        toolsRef.current,
        currentStudent,
        insightsRef.current,
        {
          interventionActive:
            Boolean(activeIntervention) &&
            !(msForPrompt && msForPrompt.status === "active"),
          interventionContext: context,
          multiStepSession: msForPrompt,
          topicContext: {
            ...normalizeTopicContext(topicContextRef.current),
            isFirstSession: false,
          },
        }
      );
      const history = historyRef.current
        .filter((h) => h.text?.trim())
        .map((h) => ({ role: h.role, text: h.text }));
      try {
        const rebuilt = createChatSession(systemPrompt, history);
        chatRef.current = rebuilt;
        return rebuilt;
      } catch (err) {
        console.warn("Chat rebuild with history failed", err);
        const chat = createChatSession(systemPrompt, []);
        chatRef.current = chat;
        return chat;
      }
    },
    [subjectName, topicName]
  );

  // Keep tutor checklist in sync as multi-step advances
  useEffect(() => {
    multiStepSessionRef.current = multiStepSession;
    if (!chatRef.current) return;
    if (!multiStepSession) return;
    try {
      rebuildChatWithHistory(
        interventionActiveRef.current,
        interventionContextRef.current,
        multiStepSession
      );
    } catch {
      /* ignore */
    }
  }, [multiStepSession, rebuildChatWithHistory]);

  // Start / resume when topic or session trigger changes
  useEffect(() => {
    if (!isAiAvailable()) return undefined;

    let cancelled = false;
    // Invalidate any in-flight stream / greeting from the previous topic
    const bootGen = ++bootGenRef.current;
    activeTopicRef.current = { subject: subjectName, topic: topicName };

    onSessionResetRef.current?.();
    chatRef.current = null;
    pendingStudentRef.current = null;
    skipPersistRef.current = false;
    lastFailedRef.current = null;
    setChatError(null);
    setSafetyEscalation(null);

    onSessionBeginRef.current?.({ subjectName, topicName });

    const currentStudent = studentRef.current;
    const studentName = currentStudent?.name?.trim() || "the student";

    const isStale = () => cancelled || bootGenRef.current !== bootGen;

    const run = async () => {
      // Defer React state updates out of the synchronous effect body
      await Promise.resolve();
      if (isStale()) return;
      setIsStreaming(false);

      // Prefer backend shelf so history survives localStorage clears
      await loadTopicShelfAsync(studentId, subjectName, topicName);
      if (isStale()) return;

      const { conversation } = await ensureActiveConversationAsync(
        studentId,
        subjectName,
        topicName
      );
      if (isStale()) return;

      conversationIdRef.current = conversation.id;

      const shelf = await loadTopicShelfAsync(studentId, subjectName, topicName);
      if (isStale()) return;
      const archived = listArchivedConversations(shelf);

      // Prefer UI messages; fall back to apiHistory. created=false alone is not enough
      // (ensure may return created:true while a prior local/remote thread still exists).
      const messageCount = (conversation.messages || []).length;
      const apiCount = (conversation.apiHistory || []).length;
      const shelfActive = getActiveConversation(shelf);
      const thread =
        messageCount > 0 || apiCount > 0
          ? conversation
          : shelfActive &&
              ((shelfActive.messages || []).length > 0 ||
                (shelfActive.apiHistory || []).length > 0)
            ? shelfActive
            : conversation;

      const hasHistory =
        ((thread.messages || []).length > 0 ||
          (thread.apiHistory || []).length > 0) &&
        thread.status !== "archived";

      modeRef.current = hasHistory ? "resume" : "fresh";
      if (thread.id) conversationIdRef.current = thread.id;

      // Safe resume of intervention: only if snapshot matches this topic
      const snap = thread.resumeSnapshot || {};
      const snapTopic = snap.topic || snap.intervention?.context?.topic;
      const snapSubject = snap.subject || snap.intervention?.context?.subject;
      const snapMatchesTopic =
        (!snapTopic || snapTopic === topicName) &&
        (!snapSubject || snapSubject === subjectName);
      const resumeIntervention =
        hasHistory &&
        snapMatchesTopic &&
        snap.intervention &&
        (snap.intervention.status === "active" ||
          snap.intervention.status === "offered");

      // Prefer restoring guide mode as *offered* so the student opts in (safer than auto-active)
      const restoredActive = false;
      const restoredCtx = resumeIntervention
        ? snap.intervention.context || {
            subject: subjectName,
            topic: topicName,
            reasonText: snap.intervention.reason,
          }
        : null;

      interventionActiveRef.current = restoredActive;
      interventionContextRef.current = restoredActive ? restoredCtx : null;

      const baseTopicCtx = normalizeTopicContext(topicContextRef.current);
      const systemPrompt = buildSystemPrompt(
        subjectName,
        topicName,
        toolsRef.current,
        currentStudent,
        insightsRef.current,
        {
          interventionActive: restoredActive,
          interventionContext: restoredActive ? restoredCtx : null,
          topicContext: {
            ...baseTopicCtx,
            isFirstSession: !hasHistory,
          },
        }
      );

      if (isStale()) return;

      setViewingArchiveId(null);
      setConversationMeta({
        id: thread.id,
        status: "active",
        isResume: hasHistory,
        archived,
        lastEndedSummary: null,
        resumeSnapshot: snap,
      });

      if (hasHistory) {
        // Silent resume: restore the exact thread. Never call the model here —
        // a synthetic turn on topic switch looked like feedback for a reply
        // the student never made.
        const stored = thread.messages || [];
        historyRef.current = sanitizeApiHistory(thread.apiHistory || []);

        // If apiHistory is empty but UI messages exist, rebuild a minimal history
        // from visible turns so the next student send has context.
        if (!historyRef.current.length && stored.length) {
          historyRef.current = rebuildApiHistoryFromMessages(stored);
        }

        const lastMsgAt = stored[stored.length - 1]?.at;
        const isSameDay =
          lastMsgAt && dayKey(lastMsgAt) === dayKey(new Date().toISOString());

        const resumeBits = [];
        // Day boundary only when needed; header already shows a "Resuming" pill
        // so avoid stacking another "picking up" system chip on every reopen.
        if (lastMsgAt && !isSameDay) {
          resumeBits.push({
            id: newMessageId(),
            role: "day_boundary",
            text: "New day — continuing this topic",
            at: new Date().toISOString(),
          });
        }
        if (resumeIntervention) {
          resumeBits.push({
            id: newMessageId(),
            role: "system",
            kind: "intervention_resume",
            text: "You were in guide mode last time — say if you want step-by-step help again",
            at: new Date().toISOString(),
          });
        }
        const display = [...withDayBoundaries(stored), ...resumeBits];

        if (isStale()) return;

        setMessages(display);
        setMsgCount(
          stored.filter((m) => m.role === "tutor" || m.role === "child").length
        );
        setIsStreaming(false);

        try {
          chatRef.current = createChatSession(systemPrompt, historyRef.current);
        } catch (err) {
          console.error(err);
          reportError({
            kind: "gemini",
            message: err?.message || "Failed to rebuild chat session",
            code: err?.name || "CHAT_REBUILD",
            component: "useChatSession.resume",
            extra: { subject: subjectName, topic: topicName },
          });
          try {
            chatRef.current = createChatSession(systemPrompt, []);
          } catch (err2) {
            chatRef.current = null;
            surfaceAiError(err2, { phase: "resume" });
          }
        }

        // Restore learning-layer intervention as *offered* (safe opt-in)
        if (resumeIntervention) {
          onResumeSnapshotRef.current?.({
            ...snap,
            intervention: {
              ...snap.intervention,
              status: "offered",
              context: restoredCtx,
              restoredFromSnapshot: true,
            },
          });
        } else if (snap && Object.keys(snap).length) {
          onResumeSnapshotRef.current?.(snap);
        }

        onAwaitingStudentRef.current?.();
        requestAnimationFrame(() => scrollToBottom());
        return;
      }

      // Brand-new topic thread only — full intro
      historyRef.current = [];
      if (isStale()) return;
      setMessages([]);
      setMsgCount(0);

      // Epic B7 — briefly wait for optional energy chip so first turn can soften pace.
      // Resolves on answer/skip or timeout; never blocks the lesson permanently.
      try {
        await onAwaitSessionStartEnergyRef.current?.();
      } catch {
        /* ignore gate errors */
      }
      if (isStale()) return;

      // Rebuild system prompt after energy response may have updated insights
      const greetingSystemPrompt = buildSystemPrompt(
        subjectName,
        topicName,
        toolsRef.current,
        currentStudent,
        insightsRef.current,
        {
          interventionActive: false,
          interventionContext: null,
          topicContext: {
            ...baseTopicCtx,
            isFirstSession: true,
          },
        }
      );

      let chat;
      try {
        chat = createChatSession(greetingSystemPrompt, []);
        chatRef.current = chat;
      } catch (err) {
        console.error(err);
        reportError({
          kind: "gemini",
          message: err?.message || "Failed to create chat session",
          code: err?.name || "CHAT_CREATE",
          component: "useChatSession.greeting",
          extra: { subject: subjectName, topic: topicName },
        });
        surfaceAiError(err, { phase: "greeting" });
        return;
      }
      setIsStreaming(true);
      const greetingPrompt = buildLessonOpeningPrompt({
        topicName,
        studentName,
        student: currentStudent,
        topicContext: {
          ...baseTopicCtx,
          isFirstSession: true,
        },
      });
      try {
        const response = await withStreamTimeout(
          chat.sendMessageStream({
            message: greetingPrompt,
          }),
          STREAM_TIMEOUT_MS,
          "Greeting timed out"
        );
        let full = "";
        const startAt = new Date().toISOString();
        if (!isStale()) {
          setMessages([
            {
              id: newMessageId(),
              role: "day_boundary",
              text: "Interaction for today starts here",
              at: startAt,
            },
            {
              id: newMessageId(),
              role: "tutor",
              text: "",
              streaming: true,
              at: startAt,
            },
          ]);
        }
        const streamDeadline = Date.now() + STREAM_TIMEOUT_MS;
        for await (const chunk of response) {
          if (isStale()) break;
          if (Date.now() > streamDeadline) {
            throw new Error("Greeting timed out");
          }
          const piece = typeof chunk?.text === "string" ? chunk.text : "";
          if (!piece) continue;
          full += piece;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: full,
              streaming: true,
            };
            return updated;
          });
          scrollToBottom();
        }
        if (!isStale()) {
          const at = new Date().toISOString();
          if (!full.trim()) {
            throw new Error("Empty tutor greeting");
          }
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: full,
              streaming: false,
              at,
            };
            return updated;
          });
          historyRef.current = [
            { role: "user", text: greetingPrompt },
            { role: "model", text: full },
          ];
          persistUiMessage(
            { role: "tutor", text: full, at },
            { user: greetingPrompt, model: full }
          );
          onTutorReplyRef.current?.(full);
          onAwaitingStudentRef.current?.();
          setMsgCount(1);
          setChatError(null);
          lastFailedRef.current = null;
        }
      } catch (err) {
        console.error(err);
        reportError({
          kind: "gemini",
          message: err?.message || "Lesson greeting stream failed",
          code: err?.name || "GREETING_STREAM",
          component: "useChatSession.greeting",
          extra: { subject: subjectName, topic: topicName },
        });
        if (!isStale()) {
          stripFailedTutorBubble();
          surfaceAiError(err, { phase: "greeting" });
        }
      } finally {
        if (!isStale()) setIsStreaming(false);
      }
    };

    run();
    return () => {
      cancelled = true;
      // Ensure a late stream from this boot cannot land after unmount/switch
      bootGenRef.current += 0; // keep generation; next effect increments
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicName, sessionTrigger, studentId, subjectName, aiConfigTick, hasAi]);

  const streamTutorFromMessage = useCallback(
    async (
      apiMessage,
      { showStudentText = null, wasHintRequest = false, systemUi = null } = {}
    ) => {
      if (!chatRef.current || isStreaming || modeRef.current === "archive_view")
        return false;

      // Capture boot generation — if user switches topics mid-stream, drop results
      const bootGen = bootGenRef.current;
      const topicAtStart = activeTopicRef.current.topic;
      const stillCurrent = () =>
        bootGenRef.current === bootGen &&
        activeTopicRef.current.topic === topicAtStart;

      if (systemUi) {
        const sysMsg = {
          id: newMessageId(),
          role: "system",
          kind: systemUi.kind,
          text: systemUi.text,
          at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, sysMsg]);
        if (stillCurrent()) persistUiMessage(sysMsg);
      }

      if (showStudentText) {
        const childMsg = {
          id: newMessageId(),
          role: "child",
          text: showStudentText,
          at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, childMsg]);
        if (stillCurrent()) persistUiMessage(childMsg);
        pendingStudentRef.current = {
          text: showStudentText,
          wasHintRequest,
        };
      }
      // else: leave pendingStudentRef as set by retryLastFailed (do not clear)

      setIsStreaming(true);
      setChatError(null);
      try {
        if (!stillCurrent()) return false;

        let chat = chatRef.current;
        if (!chat) {
          chat = rebuildChatWithHistory(
            interventionActiveRef.current,
            interventionContextRef.current
          );
        }
        if (!chat || !stillCurrent()) {
          throw new Error("Chat session unavailable");
        }

        const response = await withStreamTimeout(
          chat.sendMessageStream({
            message: apiMessage,
          }),
          STREAM_TIMEOUT_MS,
          "Tutor reply timed out"
        );
        let full = "";
        const tutorId = newMessageId();
        if (stillCurrent()) {
          setMessages((prev) => [
            ...prev,
            {
              id: tutorId,
              role: "tutor",
              text: "",
              streaming: true,
              at: new Date().toISOString(),
            },
          ]);
        }
        const streamDeadline = Date.now() + STREAM_TIMEOUT_MS;
        for await (const chunk of response) {
          if (!stillCurrent()) break;
          if (Date.now() > streamDeadline) {
            throw new Error("Tutor reply timed out");
          }
          const piece = typeof chunk?.text === "string" ? chunk.text : "";
          if (!piece) continue;
          full += piece;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "tutor" && last.streaming) {
              updated[updated.length - 1] = {
                ...last,
                text: full,
                streaming: true,
              };
            }
            return updated;
          });
          scrollToBottom();
        }

        if (!stillCurrent()) {
          // Topic switched — do not write into the new topic's thread
          pendingStudentRef.current = null;
          return false;
        }

        if (!full.trim()) {
          throw new Error("Empty tutor reply");
        }

        const at = new Date().toISOString();
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "tutor") {
            updated[updated.length - 1] = {
              ...last,
              text: full,
              streaming: false,
              at,
            };
          }
          return updated;
        });

        historyRef.current = [
          ...historyRef.current,
          { role: "user", text: apiMessage },
          { role: "model", text: full },
        ];

        persistUiMessage(
          { role: "tutor", text: full, at },
          { user: apiMessage, model: full }
        );
        onTutorReplyRef.current?.(full);

        const pending = pendingStudentRef.current;
        pendingStudentRef.current = null;
        if (pending) {
          await onExchangeCompleteRef.current?.({
            studentText: pending.text,
            tutorText: full,
            wasHintRequest: pending.wasHintRequest,
          });
        }

        onAwaitingStudentRef.current?.();
        setMsgCount((c) => c + 1);
        setChatError(null);
        lastFailedRef.current = null;
        return true;
      } catch (err) {
        console.error(err);
        reportError({
          kind: "gemini",
          message: err?.message || "Tutor stream failed",
          code: err?.name || "TUTOR_STREAM",
          component: "useChatSession.stream",
          extra: {
            subject: subjectName,
            topic: topicName,
            hadStudentText: Boolean(showStudentText),
          },
        });
        const pending = pendingStudentRef.current;
        pendingStudentRef.current = null;
        // Keep the student message in UI + storage — never drop history on failure
        if (stillCurrent()) {
          surfaceAiError(err, {
            phase: "stream",
            studentText: pending?.text || showStudentText || null,
            wasHintRequest: pending?.wasHintRequest || wasHintRequest,
          });
        }
        return false;
      } finally {
        if (stillCurrent()) setIsStreaming(false);
      }
    },
    [
      isStreaming,
      scrollToBottom,
      persistUiMessage,
      subjectName,
      topicName,
      surfaceAiError,
      rebuildChatWithHistory,
    ]
  );

  /**
   * Homework photo remediation (Epic A4).
   * Shows a student homework bubble (with preview) and streams a guided tutor reply.
   */
  const sendHomeworkHelp = useCallback(
    async ({
      caption,
      apiMessage,
      imageUrl = null,
      homeworkId = null,
      analysis = null,
    } = {}) => {
      if (
        isStreaming ||
        modeRef.current === "archive_view" ||
        safetyEscalation ||
        !apiMessage?.trim()
      ) {
        return false;
      }

      if (!isAiAvailable()) {
        surfaceAiError(new Error("API key missing"), { phase: "config" });
        return false;
      }

      if (!chatRef.current) {
        try {
          rebuildChatWithHistory(
            interventionActiveRef.current,
            interventionContextRef.current
          );
        } catch (err) {
          surfaceAiError(err, { phase: "stream" });
          return false;
        }
      }

      const showText =
        caption?.trim() || "I uploaded a photo of my work.";

      // Custom UI message with homework attachment
      const childMsg = {
        id: newMessageId(),
        role: "child",
        text: showText,
        kind: "homework",
        homework: {
          id: homeworkId,
          imageUrl,
          analysis: analysis
            ? {
                problem: analysis.problem,
                studentWork: analysis.studentWork,
                errors: analysis.errors,
                focusSkill: analysis.focusSkill,
              }
            : null,
        },
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, childMsg]);
      if (conversationIdRef.current) {
        persistUiMessage(childMsg);
      }

      pendingStudentRef.current = {
        text: showText,
        wasHintRequest: false,
        homeworkId,
      };

      return streamTutorFromMessage(apiMessage.trim(), {
        showStudentText: null,
        wasHintRequest: false,
      });
    },
    [
      isStreaming,
      safetyEscalation,
      surfaceAiError,
      rebuildChatWithHistory,
      persistUiMessage,
      streamTutorFromMessage,
    ]
  );

  const sendMessage = useCallback(
    async (text, options = {}) => {
      const trimmed = text?.trim();
      if (
        !trimmed ||
        isStreaming ||
        modeRef.current === "archive_view" ||
        safetyEscalation
      )
        return false;

      // —— Child safety floor: high-severity distress stops the AI path ——
      const distress = detectDistress(trimmed);
      if (distress.severity === "high") {
        const at = new Date().toISOString();
        const childMsg = {
          id: newMessageId(),
          role: "child",
          text: trimmed,
          at,
        };
        setMessages((prev) => [...prev, childMsg]);
        if (conversationIdRef.current) {
          persistUiMessage(childMsg);
        }
        const copy = escalationCopy(distress);
        setSafetyEscalation({
          category: distress.category,
          code: distress.code,
          copy,
        });
        const ageBand = resolveAgeBand(studentRef.current?.grade);
        void reportSafetyEvent({
          category: distress.category,
          code: distress.code,
          severity: "high",
          ageBand,
          component: "useChatSession",
          sessionId: conversationIdRef.current || undefined,
          extra: { subject: subjectName, topic: topicName },
        });
        scrollToBottom(true);
        return false;
      }

      if (!isAiAvailable()) {
        surfaceAiError(new Error("API key missing"), { phase: "config" });
        return false;
      }

      // Rebuild chat if a prior failure left us without a session
      if (!chatRef.current) {
        try {
          rebuildChatWithHistory(
            interventionActiveRef.current,
            interventionContextRef.current
          );
        } catch (err) {
          surfaceAiError(err, { phase: "stream", studentText: trimmed });
          return false;
        }
      }

      if (!chatRef.current) {
        surfaceAiError(new Error("Chat session unavailable"), {
          phase: "stream",
          studentText: trimmed,
        });
        return false;
      }

      const wasHintRequest = Boolean(
        options.wasHintRequest ||
          /hint|i('m| am) stuck|help me|don'?t (know|get|understand)/i.test(
            trimmed
          )
      );

      const ms = multiStepSessionRef.current;
      const msActive = ms && ms.status === "active";
      const curStep = msActive ? ms.steps?.[ms.currentIndex] : null;
      const apiMessage = msActive
        ? `[Show-your-work mode. Current step ${curStep?.index || "?"}: ${curStep?.prompt || curStep?.label || ""}. Student responds:]\n${trimmed}`
        : interventionActiveRef.current
          ? `[Still in step-by-step guide mode for "${topicName}". Continue explaining/demonstrating as needed. Student says:]\n${trimmed}`
          : trimmed;

      return streamTutorFromMessage(apiMessage, {
        showStudentText: trimmed,
        wasHintRequest,
      });
    },
    [
      isStreaming,
      streamTutorFromMessage,
      topicName,
      subjectName,
      surfaceAiError,
      rebuildChatWithHistory,
      safetyEscalation,
      persistUiMessage,
      scrollToBottom,
    ]
  );

  /** Student acknowledges safety pause — keep tutoring stopped (lesson chrome only). */
  const acknowledgeSafetyPause = useCallback(() => {
    setSafetyEscalation((prev) =>
      prev
        ? {
            ...prev,
            acknowledged: true,
            paused: true,
          }
        : null
    );
  }, []);

  /** Student chooses to return to the lesson after a high-severity pause. */
  const resumeAfterSafety = useCallback(() => {
    setSafetyEscalation(null);
    const sysMsg = {
      id: newMessageId(),
      role: "system",
      kind: "safety_resume",
      text: "Back to the lesson — whenever you're ready",
      at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, sysMsg]);
    if (conversationIdRef.current) {
      persistUiMessage(sysMsg);
    }
  }, [persistUiMessage]);

  /**
   * Retry the last failed greeting or student turn without losing history.
   */
  const retryLastFailed = useCallback(async () => {
    if (isStreaming || modeRef.current === "archive_view") return false;
    const failed = lastFailedRef.current;
    if (!failed) {
      setChatError(null);
      return false;
    }

    setChatError(null);

    if (failed.phase === "greeting" || failed.phase === "resume") {
      // Re-boot the session effect (history already on shelf for resume)
      setSessionTrigger((n) => n + 1);
      return true;
    }

    if (failed.phase === "stream" && failed.studentText) {
      // Rebuild chat with history, then re-send without duplicating the child bubble
      try {
        rebuildChatWithHistory(
          interventionActiveRef.current,
          interventionContextRef.current
        );
      } catch (err) {
        surfaceAiError(err, {
          phase: "stream",
          studentText: failed.studentText,
          wasHintRequest: failed.wasHintRequest,
        });
        return false;
      }

      const wasHintRequest = Boolean(failed.wasHintRequest);
      const trimmed = failed.studentText;
      const ms = multiStepSessionRef.current;
      const msActive = ms && ms.status === "active";
      const curStep = msActive ? ms.steps?.[ms.currentIndex] : null;
      const apiMessage = msActive
        ? `[Show-your-work mode. Current step ${curStep?.index || "?"}: ${curStep?.prompt || curStep?.label || ""}. Student responds:]\n${trimmed}`
        : interventionActiveRef.current
          ? `[Still in step-by-step guide mode for "${topicName}". Continue explaining/demonstrating as needed. Student says:]\n${trimmed}`
          : trimmed;

      pendingStudentRef.current = {
        text: trimmed,
        wasHintRequest,
      };

      return streamTutorFromMessage(apiMessage, {
        showStudentText: null,
        wasHintRequest,
      });
    }

    // Generic recovery: restart stream path
    setSessionTrigger((n) => n + 1);
    return true;
  }, [
    isStreaming,
    rebuildChatWithHistory,
    streamTutorFromMessage,
    surfaceAiError,
    topicName,
  ]);

  const enterInterventionMode = useCallback(
    async (context = {}) => {
      if (isStreaming || !isAiAvailable() || modeRef.current === "archive_view")
        return false;

      // Refuse to open help mode for a topic we are no longer on
      const ctx = {
        ...context,
        subject: context.subject || subjectName,
        topic: context.topic || topicName,
        reasonText: context.reasonText,
        level: context.level,
        levelId: context.levelId,
        levelLabel: context.levelLabel,
        workedExample: context.workedExample,
        easierSkill: context.easierSkill,
      };
      if (
        ctx.topic !== topicName ||
        ctx.topic !== activeTopicRef.current.topic
      ) {
        return false;
      }

      const currentStudent = studentRef.current;
      const studentName = currentStudent?.name?.trim() || "the student";

      interventionActiveRef.current = true;
      interventionContextRef.current = ctx;
      rebuildChatWithHistory(true, ctx);

      const directive = buildInterventionEnterMessage({
        studentName,
        topic: ctx.topic,
        subject: ctx.subject,
        reasonText: ctx.reasonText,
        level: ctx.level,
        workedExample: ctx.workedExample,
        easierSkill: ctx.easierSkill,
      });

      const chip =
        ctx.levelLabel ||
        (ctx.level === 1
          ? "Micro-hint"
          : ctx.level === 2
            ? "Worked example"
            : ctx.level === 4
              ? "Easier path"
              : "Guide mode");

      return streamTutorFromMessage(directive, {
        showStudentText: null,
        systemUi: {
          kind: "intervention_enter",
          text: `${chip} · ${ctx.topic}`,
        },
      });
    },
    [
      isStreaming,
      rebuildChatWithHistory,
      streamTutorFromMessage,
      subjectName,
      topicName,
    ]
  );

  const exitInterventionMode = useCallback(
    async (context = {}) => {
      if (isStreaming || !isAiAvailable() || modeRef.current === "archive_view")
        return false;

      const currentStudent = studentRef.current;
      const studentName = currentStudent?.name?.trim() || "the student";
      const topic = context.topic || topicName;
      const level = context.level ?? interventionContextRef.current?.level;

      interventionActiveRef.current = false;
      interventionContextRef.current = null;
      rebuildChatWithHistory(false, null);

      const directive = buildInterventionExitMessage({
        studentName,
        topic,
        level,
      });

      return streamTutorFromMessage(directive, {
        showStudentText: null,
        systemUi: { kind: "intervention_exit", text: "Back to practice" },
      });
    },
    [isStreaming, rebuildChatWithHistory, streamTutorFromMessage, topicName]
  );

  /** Epic B6 — enter show-your-work multi-step mode */
  const enterMultiStepMode = useCallback(
    async (session) => {
      if (
        isStreaming ||
        !isAiAvailable() ||
        modeRef.current === "archive_view" ||
        !session
      ) {
        return false;
      }
      multiStepSessionRef.current = session;
      rebuildChatWithHistory(
        interventionActiveRef.current,
        interventionContextRef.current,
        session
      );
      const currentStudent = studentRef.current;
      const studentName = currentStudent?.name?.trim() || "the student";
      const directive = buildShowYourWorkEnterMessage({
        studentName,
        session,
      });
      return streamTutorFromMessage(directive, {
        showStudentText: null,
        systemUi: {
          kind: "multistep_enter",
          text: `Show your work · ${session.problem?.title || "problem"}`,
        },
      });
    },
    [isStreaming, rebuildChatWithHistory, streamTutorFromMessage]
  );

  const exitMultiStepMode = useCallback(
    async (session = null) => {
      if (isStreaming || !isAiAvailable() || modeRef.current === "archive_view") {
        return false;
      }
      const prev = session || multiStepSessionRef.current;
      multiStepSessionRef.current = null;
      rebuildChatWithHistory(
        interventionActiveRef.current,
        interventionContextRef.current,
        null
      );
      const currentStudent = studentRef.current;
      const studentName = currentStudent?.name?.trim() || "the student";
      const directive = buildShowYourWorkExitMessage({
        studentName,
        session: prev,
      });
      return streamTutorFromMessage(directive, {
        showStudentText: null,
        systemUi: { kind: "multistep_exit", text: "Back to open practice" },
      });
    },
    [isStreaming, rebuildChatWithHistory, streamTutorFromMessage]
  );

  /**
   * End current conversation: summarize → Learning Journal → clear active.
   */
  const endConversation = useCallback(async () => {
    if (isStreaming || isSummarizing) return null;
    const convId = conversationIdRef.current;
    if (!convId) return null;

    const shelf = await loadTopicShelfAsync(studentId, subjectName, topicName);
    const conv =
      shelf.conversations.find((c) => c.id === convId) ||
      getActiveConversation(shelf);
    if (!conv) return null;

    setIsSummarizing(true);
    try {
      const transcript = buildTranscript(conv.messages || []);
      const studentName = studentRef.current?.name?.trim() || "Student";
      let summaryPayload = await summarizeConversation({
        studentName,
        subject: subjectName,
        topic: topicName,
        transcript,
      });
      if (!summaryPayload) {
        summaryPayload = buildFallbackSummary({
          topic: topicName,
          messages: conv.messages,
        });
      }

      const { conversation: archived } = await archiveConversationAsync(
        studentId,
        subjectName,
        topicName,
        conv.id,
        summaryPayload
      );

      conversationIdRef.current = null;
      chatRef.current = null;
      historyRef.current = [];
      modeRef.current = "fresh";

      setMessages([
        {
          id: newMessageId(),
          role: "system",
          kind: "conversation_ended",
          text: "Conversation saved to your Learning Journal",
          at: new Date().toISOString(),
        },
      ]);
      setMsgCount(0);
      const refreshed = await loadTopicShelfAsync(
        studentId,
        subjectName,
        topicName
      );
      setConversationMeta({
        id: null,
        status: "ended",
        isResume: false,
        archived: listArchivedConversations(refreshed),
        lastEndedSummary: archived,
      });

      return archived;
    } finally {
      setIsSummarizing(false);
    }
  }, [isStreaming, isSummarizing, studentId, subjectName, topicName]);

  /**
   * Start a brand-new conversation on this topic.
   * Archives the current one (with summary) if it has substance.
   */
  const startNewConversation = useCallback(async () => {
    if (isStreaming || isSummarizing) return;

    const convId = conversationIdRef.current;
    if (convId) {
      const shelf = await loadTopicShelfAsync(studentId, subjectName, topicName);
      const conv = shelf.conversations.find((c) => c.id === convId);
      const hasSubstance =
        conv &&
        (conv.messages || []).some(
          (m) => m.role === "child" || m.role === "tutor"
        );

      if (hasSubstance && conv.status === "active") {
        setIsSummarizing(true);
        try {
          const transcript = buildTranscript(conv.messages || []);
          let summaryPayload = await summarizeConversation({
            studentName: studentRef.current?.name?.trim() || "Student",
            subject: subjectName,
            topic: topicName,
            transcript,
          });
          if (!summaryPayload) {
            summaryPayload = buildFallbackSummary({
              topic: topicName,
              messages: conv.messages,
            });
          }
          await archiveConversationAsync(
            studentId,
            subjectName,
            topicName,
            conv.id,
            summaryPayload
          );
        } finally {
          setIsSummarizing(false);
        }
      } else if (conv?.status === "active") {
        await archiveConversationAsync(
          studentId,
          subjectName,
          topicName,
          conv.id,
          {
            title: `${topicName} · opened`,
            summary:
              "A short session was started and a new conversation began.",
            highlights: [],
            nextStep: null,
          }
        );
      }
    }

    const next = createConversation({
      subject: subjectName,
      topic: topicName,
    });
    const shelf = await loadTopicShelfAsync(studentId, subjectName, topicName);
    const others = (shelf.conversations || [])
      .filter((c) => c.id !== next.id)
      .map((c) =>
        c.status === "active"
          ? {
              ...c,
              status: "archived",
              endedAt: c.endedAt || new Date().toISOString(),
            }
          : c
      );
    await saveTopicShelfAsync(studentId, {
      ...shelf,
      subject: subjectName,
      topic: topicName,
      activeConversationId: next.id,
      conversations: [next, ...others],
    });

    conversationIdRef.current = next.id;
    setViewingArchiveId(null);
    const refreshed = await loadTopicShelfAsync(
      studentId,
      subjectName,
      topicName
    );
    setConversationMeta({
      id: next.id,
      status: "active",
      isResume: false,
      lastEndedSummary: null,
      archived: listArchivedConversations(refreshed),
    });
    setSessionTrigger((n) => n + 1);
  }, [isStreaming, isSummarizing, studentId, subjectName, topicName]);

  /** After ending, continue with a new conversation on same topic */
  const continueAfterEnd = useCallback(async () => {
    const next = createConversation({
      subject: subjectName,
      topic: topicName,
    });
    const shelf = await loadTopicShelfAsync(studentId, subjectName, topicName);
    await saveTopicShelfAsync(studentId, {
      ...shelf,
      subject: subjectName,
      topic: topicName,
      activeConversationId: next.id,
      conversations: [next, ...(shelf.conversations || [])],
    });
    conversationIdRef.current = next.id;
    setViewingArchiveId(null);
    setSessionTrigger((n) => n + 1);
  }, [studentId, subjectName, topicName]);
  const openJournal = useCallback(() => {
    refreshJournalList();
    setJournalOpen(true);
  }, [refreshJournalList]);

  const closeJournal = useCallback(() => setJournalOpen(false), []);

  /**
   * Read-only view of an archived conversation in the chat pane.
   */
  const viewArchivedConversation = useCallback(
    async (archiveId) => {
      const shelf = await loadTopicShelfAsync(studentId, subjectName, topicName);
      let conv = shelf.conversations.find((c) => c.id === archiveId);
      // If messages were omitted from a stale cache, reload shelf once more
      if (conv && (!conv.messages || conv.messages.length === 0) && conv.messageCount > 0) {
        const fresh = await loadTopicShelfAsync(studentId, subjectName, topicName);
        conv = fresh.conversations.find((c) => c.id === archiveId) || conv;
      }
      if (!conv) return;
      modeRef.current = "archive_view";
      skipPersistRef.current = true;
      chatRef.current = null;
      conversationIdRef.current = null;
      setViewingArchiveId(archiveId);
      setMessages(withDayBoundaries(conv.messages || []));
      setMsgCount(
        (conv.messages || []).filter(
          (m) => m.role === "tutor" || m.role === "child"
        ).length
      );
      setConversationMeta((m) => ({
        ...m,
        status: "archive_view",
        lastEndedSummary: conv,
      }));
      setJournalOpen(false);
    },
    [studentId, subjectName, topicName]
  );

  const exitArchiveView = useCallback(() => {
    skipPersistRef.current = false;
    setViewingArchiveId(null);
    setSessionTrigger((n) => n + 1);
  }, []);

  // Legacy alias
  const restartSession = startNewConversation;

  const displayMessages = messages;

  return {
    messages: displayMessages,
    isStreaming,
    isSummarizing,
    msgCount,
    chatAreaRef,
    sendMessage,
    restartSession,
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
    isArchiveView: Boolean(viewingArchiveId),
    hasAi,
    chatError,
    clearChatError,
    retryLastFailed,
    safetyEscalation,
    acknowledgeSafetyPause,
    resumeAfterSafety,
    conversationId: conversationMeta?.id || null,
    sendHomeworkHelp,
    /** Persist intervention/tools snapshot for cross-session resume (Epic A2). */
    persistResumeSnapshot: async (snapshot) => {
      const id = conversationIdRef.current;
      if (!id) return;
      await saveResumeSnapshotAsync(
        studentId,
        subjectName,
        topicName,
        id,
        snapshot
      );
    },
  };
}
