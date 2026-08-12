import { useState, useEffect, useRef, useCallback } from "react";
import {
  ai,
  buildSystemPrompt,
  createChatSession,
  buildInterventionEnterMessage,
  buildInterventionExitMessage,
  summarizeConversation,
} from "../services/gemini";
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
} from "../services/learning";

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
            /^Start the lesson on /i.test(h.text))
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
  interventionActive = false,
  interventionContext = null,
  onTutorReply,
  onSessionReset,
  onSessionBegin,
  onExchangeComplete,
  onAwaitingStudent,
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

  const chatRef = useRef(null);
  const toolsRef = useRef(tools);
  const insightsRef = useRef(learningInsights);
  const interventionActiveRef = useRef(interventionActive);
  const interventionContextRef = useRef(interventionContext);
  const chatAreaRef = useRef(null);
  const onTutorReplyRef = useRef(onTutorReply);
  const onSessionResetRef = useRef(onSessionReset);
  const onSessionBeginRef = useRef(onSessionBegin);
  const onExchangeCompleteRef = useRef(onExchangeComplete);
  const onAwaitingStudentRef = useRef(onAwaitingStudent);
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
    onTutorReplyRef.current = onTutorReply;
  }, [onTutorReply]);
  useEffect(() => {
    onSessionResetRef.current = onSessionReset;
  }, [onSessionReset]);
  useEffect(() => {
    onSessionBeginRef.current = onSessionBegin;
  }, [onSessionBegin]);
  useEffect(() => {
    onExchangeCompleteRef.current = onExchangeComplete;
  }, [onExchangeComplete]);
  useEffect(() => {
    onAwaitingStudentRef.current = onAwaitingStudent;
  }, [onAwaitingStudent]);

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
  }, [messages, isStreaming, scrollToBottom]);

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
    (activeIntervention, context) => {
      const currentStudent = studentRef.current;
      const systemPrompt = buildSystemPrompt(
        subjectName,
        topicName,
        toolsRef.current,
        currentStudent,
        insightsRef.current,
        {
          interventionActive: activeIntervention,
          interventionContext: context,
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

  // Start / resume when topic or session trigger changes
  useEffect(() => {
    if (!ai) return undefined;

    let cancelled = false;
    // Invalidate any in-flight stream / greeting from the previous topic
    const bootGen = ++bootGenRef.current;
    activeTopicRef.current = { subject: subjectName, topic: topicName };

    onSessionResetRef.current?.();
    chatRef.current = null;
    pendingStudentRef.current = null;
    skipPersistRef.current = false;

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

      // Never carry intervention across topics — resume is always normal tutoring
      interventionActiveRef.current = false;
      interventionContextRef.current = null;

      const systemPrompt = buildSystemPrompt(
        subjectName,
        topicName,
        toolsRef.current,
        currentStudent,
        insightsRef.current,
        {
          interventionActive: false,
          interventionContext: null,
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
        if (lastMsgAt && !isSameDay) {
          resumeBits.push({
            id: newMessageId(),
            role: "day_boundary",
            text: "Interaction for today starts here",
            at: new Date().toISOString(),
          });
        }
        resumeBits.push({
          id: newMessageId(),
          role: "system",
          kind: "resume",
          text:
            lastMsgAt && !isSameDay
              ? "Picking up where you left off"
              : "Continuing this topic",
          at: new Date().toISOString(),
        });
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
          chatRef.current = createChatSession(systemPrompt, []);
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
      const chat = createChatSession(systemPrompt, []);
      chatRef.current = chat;
      setIsStreaming(true);
      try {
        const greetingPrompt = `Start the lesson on "${topicName}" for ${studentName}. Introduce yourself warmly, acknowledge the ${currentStudent?.curriculum || "curriculum"} and ${currentStudent?.grade || "grade"} level, then ask a compelling opening question. Keep it concise.`;
        const response = await chat.sendMessageStream({
          message: greetingPrompt,
        });
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
        for await (const chunk of response) {
          if (isStale()) break;
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
          if (full.trim()) {
            persistUiMessage(
              { role: "tutor", text: full, at },
              { user: greetingPrompt, model: full }
            );
            onTutorReplyRef.current?.(full);
          }
          onAwaitingStudentRef.current?.();
          setMsgCount(1);
        }
      } catch (err) {
        console.error(err);
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
  }, [topicName, sessionTrigger, studentId, subjectName]);

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
      } else {
        pendingStudentRef.current = null;
      }

      setIsStreaming(true);
      try {
        const chat = chatRef.current;
        if (!chat || !stillCurrent()) return false;

        const response = await chat.sendMessageStream({
          message: apiMessage,
        });
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
        for await (const chunk of response) {
          if (!stillCurrent()) break;
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

        if (full.trim()) {
          persistUiMessage(
            { role: "tutor", text: full, at },
            { user: apiMessage, model: full }
          );
          onTutorReplyRef.current?.(full);
        }

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
        return true;
      } catch (err) {
        console.error(err);
        pendingStudentRef.current = null;
        if (showStudentText && stillCurrent()) {
          setMessages((prev) => prev.slice(0, -1));
        }
        return false;
      } finally {
        if (stillCurrent()) setIsStreaming(false);
      }
    },
    [isStreaming, scrollToBottom, persistUiMessage]
  );

  const sendMessage = useCallback(
    async (text, options = {}) => {
      const trimmed = text?.trim();
      if (
        !trimmed ||
        isStreaming ||
        !chatRef.current ||
        modeRef.current === "archive_view"
      )
        return false;

      const wasHintRequest = Boolean(
        options.wasHintRequest ||
          /hint|i('m| am) stuck|help me|don'?t (know|get|understand)/i.test(
            trimmed
          )
      );

      const apiMessage = interventionActiveRef.current
        ? `[Still in step-by-step guide mode for "${topicName}". Continue explaining/demonstrating as needed. Student says:]\n${trimmed}`
        : trimmed;

      return streamTutorFromMessage(apiMessage, {
        showStudentText: trimmed,
        wasHintRequest,
      });
    },
    [isStreaming, streamTutorFromMessage, topicName]
  );

  const enterInterventionMode = useCallback(
    async (context = {}) => {
      if (isStreaming || !ai || modeRef.current === "archive_view") return false;

      // Refuse to open guide mode for a topic we are no longer on
      const ctx = {
        subject: context.subject || subjectName,
        topic: context.topic || topicName,
        reasonText: context.reasonText,
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
      });

      return streamTutorFromMessage(directive, {
        showStudentText: null,
        systemUi: {
          kind: "intervention_enter",
          text: `Guide mode · ${ctx.topic}`,
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
      if (isStreaming || !ai || modeRef.current === "archive_view") return false;

      const currentStudent = studentRef.current;
      const studentName = currentStudent?.name?.trim() || "the student";
      const topic = context.topic || topicName;

      interventionActiveRef.current = false;
      interventionContextRef.current = null;
      rebuildChatWithHistory(false, null);

      const directive = buildInterventionExitMessage({
        studentName,
        topic,
      });

      return streamTutorFromMessage(directive, {
        showStudentText: null,
        systemUi: { kind: "intervention_exit", text: "Back to practice" },
      });
    },
    [isStreaming, rebuildChatWithHistory, streamTutorFromMessage, topicName]
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
    conversationMeta,
    journalOpen,
    openJournal,
    closeJournal,
    viewArchivedConversation,
    exitArchiveView,
    viewingArchiveId,
    isArchiveView: Boolean(viewingArchiveId),
    hasAi: Boolean(ai),
  };
}
