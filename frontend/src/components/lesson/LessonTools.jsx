import {
  Volume2,
  RefreshCw,
  Brain,
  Activity,
  LifeBuoy,
  X,
  BookOpen,
  MessageSquarePlus,
  Square,
  Lightbulb,
  Trees,
  ArrowUpRight,
  ListOrdered,
  Target,
  ClipboardCheck,
} from "lucide-react";
import { truncateGoal } from "../../services/learning/goalsSurface";

const LADDER_BTNS = [
  { level: 1, label: "Micro-hint", Icon: Lightbulb },
  { level: 2, label: "Example", Icon: BookOpen },
  { level: 3, label: "Full guide", Icon: LifeBuoy },
  { level: 4, label: "Easier path", Icon: Trees },
];

export default function LessonTools({
  tools,
  accessibility = { highContrast: false, spaciousReading: false },
  onToggleAccessibility,
  isSpeaking = false,
  onToggle,
  diffPct,
  diffLabel,
  isStreaming,
  hasAi,
  dailyCapReached = false,
  student,
  studentName,
  onRequestHint,
  onRestart,
  onEndConversation,
  onStartNewConversation,
  onOpenJournal,
  isSummarizing = false,
  conversationEnded = false,
  isArchiveView = false,
  archiveCount = 0,
  lastSignals = null,
  /** Epic L1 — structured multi-slice learner snapshot */
  learnerState = null,
  sessionSummary = null,
  learningInsights = null,
  intervention = null,
  onRequestGuide,
  onRequestLevel,
  onRequestLibraryExample,
  libraryExampleTitle = null,
  libraryExampleCount = 0,
  activeMisconceptions = null,
  multiStepAvailable = false,
  multiStepActive = false,
  multiStepTitle = null,
  multiStepPercent = null,
  onStartMultiStep,
  onExitMultiStep,
  assessmentAvailable = false,
  assessmentActive = false,
  assessmentScore = null,
  onStartAssessment,
  prePostAvailable = false,
  prePostBaseline = null,
  onStartPrePostBaseline,
  onStartPrePostFollowUp,
  onExitAssessment,
  offlinePracticePack = null,
  onStartOfflinePracticePack,
  onExitIntervention,
  onAcceptIntervention,
  onDeclineIntervention,
  onEscalateIntervention,
  hasManipulatives = false,
  manipOpen = false,
  onOpenManipulative,
  manipState = null,
  /** Epic C5 — resolved lesson goals */
  lessonGoals = null,
}) {
  /** L1.2 — pulse binds to structured slices (fallback to raw lastSignals) */
  const pulse = learnerState?.pulse || null;
  const hasLongitudinal =
    (learnerState?.knowledge?.topicAttempts || 0) > 0 ||
    (learnerState?.misconceptions?.length || 0) > 0 ||
    learnerState?.confidence?.level != null ||
    learnerState?.engagement?.level != null ||
    Boolean(pulse?.knowledgeLabel) ||
    Boolean(pulse?.assistanceLabel) ||
    Boolean(pulse?.calibrationLabel) ||
    Boolean(pulse?.independenceNote) ||
    (learnerState?.adi?.reliable && learnerState.adi.value != null) ||
    (learnerState?.behaviour?.flags?.length || 0) > 0 ||
    (learnerState?.knowledge?.focusAreas?.length || 0) > 0 ||
    (learnerState?.knowledge?.strengths?.length || 0) > 0;
  const hasObservation =
    Boolean(lastSignals) ||
    Boolean(
      pulse &&
        pulse.correctnessText &&
        pulse.correctnessText !== "Observing…"
    ) ||
    hasLongitudinal;

  const accuracyPct =
    sessionSummary?.accuracy != null
      ? Math.round(sessionSummary.accuracy * 100)
      : null;

  const interventionActive = intervention?.status === "active";
  const interventionOffered = intervention?.status === "offered";
  const activeLevel =
    intervention?.level || intervention?.context?.level || 0;
  const activeLabel =
    intervention?.context?.levelLabel ||
    intervention?.context?.activeTitle ||
    "Help mode";

  const mcLabels =
    pulse?.misconceptionLabels?.length > 0
      ? pulse.misconceptionLabels
      : (activeMisconceptions?.length
          ? activeMisconceptions
          : lastSignals?.misconceptions || []
        ).map((m) => m.label || m);

  return (
    <aside className="lesson-tools">
      {/* Epic C5 lite — goals surface */}
      {lessonGoals && (
        <div className="goals-tools-panel" role="region" aria-label="Your focus">
          <h4>
            <Target size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
            Your focus
          </h4>
          <div className="goals-tools-rows">
            <div className="goals-tools-row">
              <span>Familiarity</span>
              <strong>{lessonGoals.familiarityLabel || "—"}</strong>
            </div>
            {lessonGoals.effectiveGoal ? (
              <p className="goals-tools-goal" title={lessonGoals.effectiveGoal}>
                <span className="goals-tools-label">Topic goal</span>
                {truncateGoal(lessonGoals.effectiveGoal, 140)}
              </p>
            ) : (
              <p className="goals-tools-empty">
                No topic goal yet — set one when you add topics under Subjects.
              </p>
            )}
            {lessonGoals.profileGoal ? (
              <p className="goals-tools-goal profile" title={lessonGoals.profileGoal}>
                <span className="goals-tools-label">Longer-term</span>
                {truncateGoal(lessonGoals.profileGoal, 100)}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div>
        <h4>Live difficulty</h4>
        <div className="diff-track">
          <div
            className="diff-fill"
            style={{ width: `${diffPct}%`, transition: "width 0.7s ease" }}
          />
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>
          {diffLabel}
        </p>
      </div>

      {/* Epic B2 — graduated intervention ladder */}
      <div
        className={`intervention-tools-panel${
          interventionActive ? " active" : ""
        }${interventionOffered ? " offered" : ""}${
          activeLevel ? ` ladder-${activeLevel}` : ""
        }`}
      >
        <h4>
          <LifeBuoy size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
          Help ladder
        </h4>
        <p className="intervention-tools-text">
          Four kinds of help — from a tiny hint to an easier path. Always
          leave-anytime.
        </p>
        <div className="ladder-rungs" role="group" aria-label="Help levels">
          {LADDER_BTNS.map(({ level, label, Icon }) => {
            const isCurrent = interventionActive && activeLevel === level;
            return (
              <button
                key={level}
                type="button"
                className={`ladder-rung${isCurrent ? " current" : ""}`}
                disabled={
                  isStreaming || !hasAi || dailyCapReached || isArchiveView
                }
                onClick={() =>
                  onRequestLevel ? onRequestLevel(level) : onRequestGuide?.()
                }
                title={
                  dailyCapReached
                    ? "Unavailable — daily AI allowance reached"
                    : label
                }
              >
                <span className="ladder-rung-num">{level}</span>
                <Icon size={13} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {interventionActive ? (
          <>
            <p className="intervention-tools-text" style={{ marginTop: 10 }}>
              Active: <strong>{activeLabel}</strong> on{" "}
              <strong>{intervention.context?.topic || "this topic"}</strong>.
              {studentName} can stay as long as they need.
            </p>
            <div className="intervention-tools-actions">
              {activeLevel < 4 && onEscalateIntervention && (
                <button
                  type="button"
                  className="intervention-btn primary compact"
                  onClick={onEscalateIntervention}
                  disabled={isStreaming || !hasAi || dailyCapReached}
                >
                  <ArrowUpRight size={13} />
                  More help
                </button>
              )}
              <button
                type="button"
                className="intervention-exit-btn full"
                onClick={onExitIntervention}
                disabled={isStreaming || dailyCapReached}
              >
                <X size={14} />
                {intervention.context?.exitLabel || "Exit help"}
              </button>
            </div>
          </>
        ) : interventionOffered ? (
          <>
            <p className="intervention-tools-text" style={{ marginTop: 10 }}>
              {intervention.context?.headline ||
                "Kindling noticed a sticky moment"}
              {intervention.context?.levelLabel
                ? ` · suggested ${intervention.context.levelLabel}`
                : ""}
            </p>
            <div className="intervention-tools-actions">
              <button
                type="button"
                className="intervention-btn primary compact"
                onClick={onAcceptIntervention}
                disabled={isStreaming || !hasAi || dailyCapReached}
              >
                {intervention.context?.acceptCta || "Start help"}
              </button>
              <button
                type="button"
                className="intervention-btn ghost compact"
                onClick={onDeclineIntervention}
                disabled={isStreaming}
              >
                Not now
              </button>
            </div>
          </>
        ) : null}

        {/* Epic B4 — curated library shortcut */}
        {(libraryExampleTitle || libraryExampleCount > 0) &&
          !interventionActive &&
          !interventionOffered &&
          !multiStepActive && (
            <div className="library-example-block">
              <p className="intervention-tools-text" style={{ marginTop: 10 }}>
                {libraryExampleTitle
                  ? `Library ready: “${libraryExampleTitle}”`
                  : `${libraryExampleCount} curated example${
                      libraryExampleCount === 1 ? "" : "s"
                    } for this topic`}
              </p>
              <button
                type="button"
                className="guide-btn library-example-btn"
                onClick={onRequestLibraryExample}
                disabled={
                  isStreaming || !hasAi || dailyCapReached || isArchiveView
                }
                style={{
                  opacity:
                    isStreaming || !hasAi || dailyCapReached || isArchiveView
                      ? 0.45
                      : 1,
                }}
              >
                <BookOpen size={14} />
                Show library example
              </button>
            </div>
          )}

        {/* Epic B6 — show your work */}
        {(multiStepAvailable || multiStepActive) && !assessmentActive && (
          <div className="multistep-tools-block">
            <p className="intervention-tools-text" style={{ marginTop: 10 }}>
              {multiStepActive
                ? `Show your work${
                    multiStepTitle ? ` · ${multiStepTitle}` : ""
                  }${
                    multiStepPercent != null ? ` · ${multiStepPercent}%` : ""
                  }`
                : "Practice a multi-step problem with intermediate checks and partial credit."}
            </p>
            {multiStepActive ? (
              <button
                type="button"
                className="intervention-exit-btn full"
                onClick={onExitMultiStep}
                disabled={isStreaming || dailyCapReached}
              >
                <X size={14} />
                Exit show-your-work
              </button>
            ) : (
              <button
                type="button"
                className="guide-btn library-example-btn"
                onClick={onStartMultiStep}
                disabled={
                  isStreaming ||
                  !hasAi ||
                  dailyCapReached ||
                  isArchiveView ||
                  interventionActive
                }
                style={{
                  opacity:
                    isStreaming ||
                    !hasAi ||
                    dailyCapReached ||
                    isArchiveView ||
                    interventionActive
                      ? 0.45
                      : 1,
                }}
              >
                <ListOrdered size={14} />
                Show your work
              </button>
            )}
          </div>
        )}

        {/* Epic C6 — quick check (works offline; no AI required) */}
        {offlinePracticePack && !assessmentActive && (
          <div className="offline-practice-pack">
            <h4>{offlinePracticePack.title}</h4>
            <p className="intervention-tools-text">
              {offlinePracticePack.questionCount} saved questions with built-in explanations. Ready offline after this lesson loads; no AI needed.
            </p>
            <button
              type="button"
              className="guide-btn library-example-btn"
              onClick={onStartOfflinePracticePack}
              disabled={isStreaming || isArchiveView || interventionActive || multiStepActive}
            >
              <ClipboardCheck size={14} />
              Start offline pack
            </button>
          </div>
        )}
        {(assessmentAvailable || assessmentActive) && (
          <div className="assessment-tools-block">
            <p className="intervention-tools-text" style={{ marginTop: 10 }}>
              {assessmentActive
                ? `Quick check${
                    assessmentScore?.answered != null
                      ? ` · ${assessmentScore.correct || 0}/${
                          assessmentScore.total || 0
                        }`
                      : ""
                  }`
                : "Short multiple-choice on this lesson’s concept — one question at a time, with a tutor note after each answer."}
            </p>
            {assessmentActive ? (
              <button
                type="button"
                className="intervention-exit-btn full"
                onClick={onExitAssessment}
                disabled={isStreaming}
              >
                <X size={14} />
                Exit quick check
              </button>
            ) : (
              <button
                type="button"
                className="guide-btn library-example-btn"
                onClick={onStartAssessment}
                disabled={isArchiveView || interventionActive || multiStepActive}
                style={{
                  opacity:
                    isArchiveView || interventionActive || multiStepActive
                      ? 0.45
                      : 1,
                }}
              >
                <ClipboardCheck size={14} />
                Quick check
              </button>
            )}
          </div>
        )}
        {prePostAvailable && !assessmentActive && (
          <div className="assessment-tools-block pre-post-check-tools">
            {prePostBaseline ? (
              <>
                <p className="intervention-tools-text">
                  Before check saved: {prePostBaseline.correct}/{prePostBaseline.total} ({prePostBaseline.percent}%). Take the after check when you finish learning.
                </p>
                <button type="button" className="guide-btn library-example-btn" onClick={onStartPrePostFollowUp} disabled={isArchiveView || interventionActive || multiStepActive}>
                  <ClipboardCheck size={14} /> After-lesson check
                </button>
              </>
            ) : (
              <>
                <p className="intervention-tools-text">Optional before-and-after check with a fresh question set after the lesson.</p>
                <button type="button" className="guide-btn library-example-btn" onClick={onStartPrePostBaseline} disabled={isArchiveView || interventionActive || multiStepActive}>
                  <ClipboardCheck size={14} /> Before-and-after check
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Learner pulse — L1 structured slices of what Kindling believes right now */}
      <div className="learner-pulse">
        <h4>
          <Brain size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
          Learner pulse
        </h4>
        {hasObservation && pulse ? (
          <div className="learner-pulse-body">
            <div
              className={`pulse-chip tone-${pulse.correctnessTone || "muted"}`}
            >
              {pulse.correctnessText || "Observing…"}
            </div>
            <div className="pulse-row">
              <span>Affect</span>
              <strong>{pulse.affectLabel || "—"}</strong>
            </div>
            <div className="pulse-row">
              <span>Confidence</span>
              <strong>
                {pulse.confidencePct != null ? `${pulse.confidencePct}%` : "—"}
              </strong>
            </div>
            <div className="pulse-row">
              <span>Engagement</span>
              <strong>
                {pulse.engagementPct != null
                  ? `${pulse.engagementPct}%`
                  : learnerState?.engagement?.label &&
                      learnerState.engagement.label !== "unknown"
                    ? learnerState.engagement.label
                    : "—"}
              </strong>
            </div>
            {pulse.thinkTimeLabel && (
              <div className="pulse-row">
                <span>Think time</span>
                <strong>{pulse.thinkTimeLabel}</strong>
              </div>
            )}
            {pulse.knowledgeLabel && (
              <div className="pulse-row">
                <span>Knowledge</span>
                <strong className="pulse-strong-wrap">{pulse.knowledgeLabel}</strong>
              </div>
            )}
            {pulse.assistanceLabel && (
              <div className="pulse-row">
                <span>Support</span>
                <strong>{pulse.assistanceLabel}</strong>
              </div>
            )}
            {pulse.calibrationLabel && (
              <p className="pulse-note calibration-note">
                {pulse.calibrationLabel}
              </p>
            )}
            {pulse.independenceNote && (
              <div className="pulse-row pulse-independence">
                <span>Independence</span>
                <strong className="pulse-strong-wrap">
                  {learnerState?.adi?.independencePct != null
                    ? `${learnerState.adi.independencePct}%`
                    : learnerState?.assistance?.independencePct != null
                      ? `${learnerState.assistance.independencePct}%`
                      : "—"}
                </strong>
              </div>
            )}
            {pulse.independenceNote && (
              <p className="pulse-note independence-note">
                {pulse.independenceNote}
              </p>
            )}
            {learningInsights?.pedagogyDecision?.action && (
              <div className="pulse-row">
                <span>Next move</span>
                <strong className="pulse-strong-wrap">
                  {learningInsights.pedagogyDecision.shortLabel ||
                    learningInsights.pedagogyDecision.label ||
                    learningInsights.pedagogyDecision.action}
                </strong>
              </div>
            )}
            {mcLabels.length > 0 && (
              <div className="misconception-pulse">
                <p className="pulse-note">
                  Pattern to gently rework: {mcLabels.slice(0, 3).join(", ")}
                </p>
                {pulse.misconceptionTip ? (
                  <p className="pulse-note misconception-tip">
                    Try asking: “{pulse.misconceptionTip}”
                  </p>
                ) : null}
              </div>
            )}
            {(pulse.persistenceNote ||
              sessionSummary?.persistenceScore > 0 ||
              learningInsights?.persistenceScore > 0) && (
              <p className="pulse-note persistence-note">
                {pulse.persistenceNote ||
                  "Persistence spark: effort and bounce-backs count here — not only correct answers."}
              </p>
            )}
            {learnerState?.summary && (
              <p className="pulse-note pulse-summary" title={learnerState.summary}>
                {learnerState.summary}
              </p>
            )}
          </div>
        ) : (
          <p className="pulse-empty">
            Kindling learns from each reply — correctness, confidence, and how{" "}
            {studentName} likes to think.
          </p>
        )}

        {sessionSummary && (
          <div className="session-pulse">
            <div className="pulse-row">
              <span>
                <Activity size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                This session
              </span>
              <strong>
                {sessionSummary.turnCount || sessionSummary.counters
                  ? `${sessionSummary.turnCount ?? 0} turns`
                  : "—"}
              </strong>
            </div>
            {accuracyPct != null && (
              <div className="pulse-row">
                <span>Accuracy signal</span>
                <strong>{accuracyPct}%</strong>
              </div>
            )}
            {sessionSummary.counters && (
              <div className="pulse-mini-grid">
                <span>✓ {sessionSummary.counters.correct || 0}</span>
                <span>~ {sessionSummary.counters.partial || 0}</span>
                <span>✗ {sessionSummary.counters.incorrect || 0}</span>
                <span>💡 {sessionSummary.counters.hints || 0}</span>
              </div>
            )}
            {(sessionSummary.persistenceScore > 0 ||
              sessionSummary.counters?.persistenceEvents > 0) && (
              <div className="pulse-row">
                <span>Persistence</span>
                <strong>
                  {sessionSummary.persistenceScore ||
                    sessionSummary.counters?.persistenceEvents ||
                    0}
                </strong>
              </div>
            )}
          </div>
        )}

        {(learnerState?.knowledge?.focusAreas?.length > 0 ||
          learningInsights?.stats?.focusAreas?.length > 0) && (
          <p className="pulse-note">
            Focus areas:{" "}
            {(
              learnerState?.knowledge?.focusAreas?.length
                ? learnerState.knowledge.focusAreas
                : learningInsights.stats.focusAreas
            )
              .slice(0, 2)
              .map((f) => (typeof f === "string" ? f : f.topic || f.label || ""))
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
      </div>

      {hasManipulatives && (
        <div className="manip-tools-block">
          <h4>
            <Square size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
            Interactive model
          </h4>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 8px" }}>
            Fraction bars & number lines help make parts of a whole concrete.
            {manipState
              ? ` Showing ${manipState.num}/${manipState.den}.`
              : ""}
          </p>
          <button
            type="button"
            className="hint-btn"
            onClick={onOpenManipulative}
            disabled={isStreaming}
          >
            {manipOpen ? "Focus model in chat" : "Open fraction model"}
          </button>
        </div>
      )}

      <div className={`voice-panel${tools.voiceOutput ? " active" : ""}`}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="voice-label">
            <Volume2 size={15} />
            Voice Output
          </div>
          <button
            type="button"
            className={`switch ${tools.voiceOutput ? "on" : ""}`}
            onClick={() => onToggle("voiceOutput")}
            role="switch"
            aria-checked={tools.voiceOutput}
            aria-label="Voice output"
          />
        </div>
        {tools.voiceOutput && (
          <>
            <p className="voice-info">
              Tutor replies stay visible as captions. Kindling reads them aloud;
              click{" "}
              <strong>Read aloud</strong> under any message to replay one.
            </p>
            {isSpeaking && (
              <p className="voice-status" role="status" aria-live="polite">
                Kindling is reading a reply aloud. The text remains visible.
              </p>
            )}
          </>
        )}
      </div>

      <section className="accessibility-tools" aria-labelledby="accessibility-tools-title">
        <h4 id="accessibility-tools-title">Reading &amp; display</h4>
        <label className="accessibility-option">
          <input
            type="checkbox"
            checked={accessibility.highContrast}
            onChange={() => onToggleAccessibility?.("highContrast")}
          />
          <span>
            <strong>High contrast</strong>
            <small>Stronger text, borders, and focus outlines</small>
          </span>
        </label>
        <label className="accessibility-option">
          <input
            type="checkbox"
            checked={accessibility.spaciousReading}
            onChange={() => onToggleAccessibility?.("spaciousReading")}
          />
          <span>
            <strong>Spacious reading</strong>
            <small>
              A clear sans-serif typeface with more line and letter spacing
            </small>
          </span>
        </label>
        <label className="accessibility-option">
          <input
            type="checkbox"
            checked={accessibility.darkTheme}
            onChange={() => onToggleAccessibility?.("darkTheme")}
          />
          <span>
            <strong>Dark lesson theme</strong>
            <small>Use a darker background for the lesson and chat</small>
          </span>
        </label>
      </section>

      <div>
        <h4>Tools</h4>
        <div className="tool-row">
          Show visual models{" "}
          <button
            type="button"
            className={`switch ${tools.visuals ? "on" : ""}`}
            onClick={() => onToggle("visuals")}
            role="switch"
            aria-checked={tools.visuals}
            aria-label="Show visual models"
          />
        </div>
        <div className="tool-row">
          Extra encouragement{" "}
          <button
            type="button"
            className={`switch ${tools.encourage ? "on" : ""}`}
            onClick={() => onToggle("encourage")}
            role="switch"
            aria-checked={tools.encourage}
            aria-label="Extra encouragement"
          />
        </div>
      </div>

      <button
        type="button"
        className="hint-btn"
        onClick={onRequestHint}
        disabled={
          isStreaming ||
          !hasAi ||
          dailyCapReached ||
          interventionActive ||
          conversationEnded ||
          isArchiveView
        }
        style={{
          opacity:
            isStreaming ||
            !hasAi ||
            dailyCapReached ||
            interventionActive ||
            conversationEnded ||
            isArchiveView
              ? 0.5
              : 1,
        }}
      >
        {dailyCapReached
          ? "🔒 Daily AI limit reached"
          : isStreaming
            ? "Kindling is thinking…"
            : interventionActive
              ? activeLevel === 1
                ? "💡 In micro-hint"
                : "💡 Help mode active"
              : "💡 Get a hint"}
      </button>

      <div className="conversation-tools-panel">
        <h4>
          <BookOpen size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
          Conversations
        </h4>
        <p className="conversation-tools-text">
          Kindling remembers this topic. Come back anytime—or save a summary to
          your Learning Journal when you finish.
        </p>
        <div className="conversation-tools-stack">
          <button
            type="button"
            className="journal-open-btn"
            onClick={onOpenJournal}
            disabled={isSummarizing}
          >
            <BookOpen size={14} />
            Learning Journal
            {archiveCount > 0 ? ` (${archiveCount})` : ""}
          </button>
          <button
            type="button"
            className="new-conversation-btn"
            onClick={onStartNewConversation || onRestart}
            disabled={isStreaming || isSummarizing || !hasAi || dailyCapReached}
          >
            <MessageSquarePlus size={14} />
            New conversation
          </button>
          <button
            type="button"
            className="end-conversation-btn"
            onClick={onEndConversation}
            disabled={
              isStreaming ||
              isSummarizing ||
              conversationEnded ||
              isArchiveView ||
              !hasAi
            }
            title="Reflect briefly, then save this chat to your Learning Journal"
          >
            <Square size={13} />
            {isSummarizing ? "Saving summary…" : "Wrap up"}
          </button>
        </div>
        <button
          type="button"
          className="restart-lesson-btn subtle"
          onClick={onRestart}
          disabled={isStreaming || isSummarizing || dailyCapReached}
          title="Same as new conversation — archives the current thread"
        >
          <RefreshCw size={14} /> Fresh start on this topic
        </button>
      </div>

      <div>
        <h4>Student view</h4>
        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-soft)",
            lineHeight: 1.6,
          }}
        >
          Teaching <strong>{studentName}</strong> ({student?.grade}).
          <br />
          Aligned with {student?.curriculum || "standard curriculum"}.
          <br />
          <span style={{ opacity: 0.85 }}>
            Kindling adapts from every answer — privately and continuously.
          </span>
        </p>
      </div>
    </aside>
  );
}
