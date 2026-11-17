import { Check, PanelLeftClose, Sparkles, Lock, ChevronDown, ArrowLeft } from "lucide-react";
import {
  buildLocalSkillPath,
  topicSkillScore,
  STATE,
  STATE_LABELS,
} from "../../services/learning/skillGraph";
import { truncateGoal } from "../../services/learning/goalsSurface";
import GoalsChip from "./GoalsChip";

function SkillSparkBar({ skills = [] }) {
  if (!skills.length) return null;
  return (
    <div className="skill-spark-row" aria-label="Skills for this lesson">
      {skills
        .filter((s) => s.isPrimary)
        .map((s) => {
          const pct = Math.max(4, Math.min(100, Math.round(s.score || 0)));
          return (
            <div
              key={s.slug}
              className={`skill-spark skill-spark--${s.state || "ready"}`}
              title={`${s.name}: ${pct}% · ${s.stateLabel || ""}`}
            >
              <div className="skill-spark-track">
                <div
                  className="skill-spark-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="skill-spark-label">
                {s.state === STATE.LOCKED && <Lock size={9} />}
                {s.shortLabel || s.name}
              </span>
            </div>
          );
        })}
    </div>
  );
}

function nameOf(entry) {
  if (typeof entry === "string") return entry;
  return entry?.name || "";
}

/**
 * Lesson path: Subject → Topic (unit) switcher + Subtopics of the active unit.
 */
export default function LessonPath({
  subjectName,
  /** Parent topics (units) with nested subtopics */
  units = [],
  activeUnitIdx = 0,
  onSelectUnit,
  /** Subtopics of the active unit (lesson leaves) */
  subtopics = [],
  activeSubtopicIdx = 0,
  onSelectSubtopic,
  student,
  onCollapse,
  learningProfile = null,
  activeSkillPath = null,
  recommendedNext = null,
  lessonGoals = null,
  onNavigate = null,
}) {
  const studentName = student?.name?.trim() || "Student";
  const activeUnit = units[activeUnitIdx] || null;
  const unitName = nameOf(activeUnit) || "Topic";
  const unitCount = units.length;

  const lessonCount = subtopics.length;
  const progressLabel =
    lessonCount > 0
      ? `Lesson ${Math.min(activeSubtopicIdx + 1, lessonCount)} of ${lessonCount}`
      : null;

  return (
    <aside className="lesson-side" aria-label="Lesson path">
      {/* Top: fixed chrome (does not scroll over lessons) */}
      <div className="lesson-side-top">
        {onNavigate && (
          <div className="lesson-side-nav">
            <button
              type="button"
              className="lesson-side-back"
              onClick={() => onNavigate("subjects")}
              title="Back to My subjects"
            >
              <ArrowLeft size={14} aria-hidden />
              <span>Subjects</span>
            </button>
            <button
              type="button"
              className="lesson-side-back"
              onClick={() => onNavigate("dashboard")}
              title="Open Dashboard"
            >
              <span>Dashboard</span>
            </button>
          </div>
        )}
        <div className="lesson-side-header">
          <div className="lesson-side-titles">
            <p className="lesson-side-eyebrow">Lesson path</p>
            <h4 title={subjectName}>{subjectName}</h4>
          </div>
          {onCollapse && (
            <button
              type="button"
              className="lesson-side-collapse"
              onClick={onCollapse}
              aria-label="Hide lesson path"
              title="Hide lesson path"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        {unitCount > 0 && (
          <div className="lesson-unit-switcher">
            <label className="lesson-unit-label" htmlFor="lesson-unit-select">
              Topic
              {unitCount > 1 ? (
                <span className="lesson-unit-meta">
                  {activeUnitIdx + 1} / {unitCount}
                </span>
              ) : null}
            </label>
            <div className="lesson-unit-select-wrap">
              <select
                id="lesson-unit-select"
                className="lesson-unit-select"
                value={String(activeUnitIdx)}
                onChange={(e) => onSelectUnit?.(Number(e.target.value))}
                aria-label="Switch topic unit"
              >
                {units.map((u, i) => (
                  <option key={u.id || nameOf(u) || i} value={i}>
                    {nameOf(u)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="lesson-unit-chevron" aria-hidden />
            </div>
            {activeUnit?.learningGoal ? (
              <p className="lesson-unit-goal" title={activeUnit.learningGoal}>
                {truncateGoal(activeUnit.learningGoal, 140)}
              </p>
            ) : null}
          </div>
        )}

        {lessonGoals && lessonGoals.hasLessonGoal && (
          <div className="lesson-path-goals">
            <GoalsChip goals={lessonGoals} compact className="on-dark" />
          </div>
        )}

        {activeSkillPath?.hasGraph && (
          <div className="skill-path-panel">
            <div className="skill-path-panel-head">
              <Sparkles size={13} />
              <span>Skill sparks</span>
              <span className="skill-path-state">
                {activeSkillPath.topicStateLabel ||
                  STATE_LABELS[activeSkillPath.topicState] ||
                  ""}
              </span>
            </div>
            <SkillSparkBar skills={activeSkillPath.skills} />
            {recommendedNext && (
              <p className="skill-path-next">
                Next spark:{" "}
                <strong>
                  {recommendedNext.shortLabel || recommendedNext.name}
                </strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Middle: independently scrollable lesson list */}
      <div className="lesson-subtopic-section">
        <div className="lesson-subtopic-section-head">
          <div className="lesson-subtopic-heading-row">
            <p className="lesson-subtopic-heading">Lessons</p>
            {progressLabel ? (
              <span className="lesson-subtopic-progress">{progressLabel}</span>
            ) : null}
          </div>
          <p className="lesson-subtopic-unit" title={unitName}>
            in {unitName}
          </p>
        </div>

        <div className="lesson-subtopic-list" role="list">
          {subtopics.map((entry, i) => {
            const t = nameOf(entry);
            const recGoal =
              typeof entry === "object"
                ? entry?.learningGoal || entry?.learning_goal || ""
                : "";
            const recFam =
              typeof entry === "object" ? entry?.familiarity || "" : "";
            const status =
              i < activeSubtopicIdx
                ? "done-topic"
                : i === activeSubtopicIdx
                  ? "active-topic"
                  : "todo-topic";
            const path = buildLocalSkillPath(learningProfile, subjectName, t);
            const score = topicSkillScore(learningProfile, t);
            const locked =
              path.hasGraph &&
              path.topicState === STATE.LOCKED &&
              i !== activeSubtopicIdx;

            const titleBits = [
              i === activeSubtopicIdx
                ? "Current lesson"
                : locked
                  ? `Growing roots — warm up prereqs before ${t}`
                  : score != null
                    ? `${t} · ~${score}% skill blend`
                    : `Switch to: ${t}`,
            ];
            if (recFam) titleBits.push(`Familiarity: ${recFam}`);
            if (recGoal) titleBits.push(truncateGoal(recGoal, 100));

            return (
              <button
                key={entry?.id || t || i}
                type="button"
                role="listitem"
                disabled={i === activeSubtopicIdx}
                className={`topic-node-row ${status}${locked ? " topic-locked" : ""}`}
                title={titleBits.join(" · ")}
                onClick={() => onSelectSubtopic?.(i)}
              >
                <span className="topic-node-index" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`topic-node-dot${
                    i < activeSubtopicIdx
                      ? " is-done"
                      : i === activeSubtopicIdx
                        ? " is-active"
                        : " is-todo"
                  }`}
                  aria-hidden
                />
                <span className="topic-node-text">
                  <span className="topic-node-name">{t}</span>
                  {score != null && (
                    <span className="topic-skill-pct">{score}%</span>
                  )}
                </span>
                {locked && (
                  <Lock size={12} className="topic-node-status-icon" aria-hidden />
                )}
                {i < activeSubtopicIdx && !locked && (
                  <Check
                    size={13}
                    className="topic-node-status-icon is-check"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
          {subtopics.length === 0 && (
            <p className="lesson-subtopic-empty">
              No lessons in this topic yet.
            </p>
          )}
        </div>
      </div>

      {/* Bottom: pinned footer — never covers the scrollable list */}
      <details className="session-info-details">
        <summary>About this session</summary>
        <div className="session-info">
          <div className="session-info-row">
            <b>Student</b>
            <span>
              {studentName}
              {student?.grade ? ` (${student.grade})` : ""}
            </span>
          </div>
          <div className="session-info-row">
            <b>Subject</b>
            <span>{subjectName}</span>
          </div>
          <div className="session-info-row">
            <b>Topic</b>
            <span>{unitName}</span>
          </div>
          <div className="session-info-row">
            <b>Lesson</b>
            <span>{nameOf(subtopics[activeSubtopicIdx]) || "—"}</span>
          </div>
        </div>
      </details>
    </aside>
  );
}
