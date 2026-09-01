import { Check, PanelLeftClose, Sparkles, Lock } from "lucide-react";
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
    <div className="skill-spark-row" aria-label="Skills for this topic">
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

function topicNameOf(entry) {
  if (typeof entry === "string") return entry;
  return entry?.name || "";
}

export default function LessonPath({
  subjectName,
  topics,
  activeTopicIdx,
  onSelectTopic,
  student,
  onCollapse,
  learningProfile = null,
  activeSkillPath = null,
  recommendedNext = null,
  /** Epic C5 — resolved goals for the active topic */
  lessonGoals = null,
}) {
  const studentName = student?.name?.trim() || "Student";

  return (
    <aside className="lesson-side" aria-label="Lesson path">
      <div>
        <div className="lesson-side-header">
          <h4>Lesson path — {subjectName}</h4>
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

        {lessonGoals && (lessonGoals.hasLessonGoal || lessonGoals.weekFocus) && (
          <div className="lesson-path-goals">
            <GoalsChip goals={lessonGoals} compact />
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
                Next spark: <strong>{recommendedNext.shortLabel || recommendedNext.name}</strong>
              </p>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {topics.map((entry, i) => {
            const t = topicNameOf(entry);
            const recGoal =
              typeof entry === "object"
                ? entry?.learningGoal || entry?.learning_goal || ""
                : "";
            const recFam =
              typeof entry === "object" ? entry?.familiarity || "" : "";
            const status =
              i < activeTopicIdx
                ? "done-topic"
                : i === activeTopicIdx
                  ? "active-topic"
                  : "todo-topic";
            const path = buildLocalSkillPath(learningProfile, subjectName, t);
            const score = topicSkillScore(learningProfile, t);
            const locked =
              path.hasGraph && path.topicState === STATE.LOCKED && i !== activeTopicIdx;

            const titleBits = [
              i === activeTopicIdx
                ? "Current topic"
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
                key={t || i}
                disabled={i === activeTopicIdx}
                className={`topic-node-row ${status}${locked ? " topic-locked" : ""}`}
                title={titleBits.join(" · ")}
                onClick={() => onSelectTopic(i)}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background:
                      i < activeTopicIdx
                        ? "var(--marigold)"
                        : i === activeTopicIdx
                          ? "var(--teal)"
                          : "transparent",
                    border:
                      i >= activeTopicIdx
                        ? i === activeTopicIdx
                          ? "none"
                          : "1.5px solid rgba(246,242,233,.35)"
                        : "none",
                    boxShadow:
                      i === activeTopicIdx
                        ? "0 0 0 4px rgba(62,138,143,.3)"
                        : "none",
                  }}
                />
                <span style={{ flex: 1, textAlign: "left" }}>
                  {t}
                  {score != null && (
                    <span className="topic-skill-pct">{score}%</span>
                  )}
                </span>
                {locked && <Lock size={11} opacity={0.7} />}
                {i < activeTopicIdx && !locked && (
                  <Check size={11} color="#E4A32A" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <details className="session-info-details">
        <summary>About this session</summary>
        <div className="session-info">
          <b>Student</b>
          {studentName}
          {student?.grade ? ` (${student.grade})` : ""}
          <br />
          <span style={{ fontSize: 11, opacity: 0.8 }}>
            {student?.countryFlag ? `${student.countryFlag} ` : ""}
            {student?.schoolName || "—"}
          </span>
        </div>
        <div className="session-info">
          <b>Curriculum</b>
          {student?.curriculum || "—"}
        </div>
        <div className="session-info">
          <b>Tutor</b>
          Kindling · adaptive
        </div>
      </details>
    </aside>
  );
}
