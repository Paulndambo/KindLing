import { Check, PanelLeftClose } from "lucide-react";

export default function LessonPath({
  subjectName,
  topics,
  activeTopicIdx,
  onSelectTopic,
  student,
  onCollapse,
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
        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {topics.map((t, i) => {
            const status =
              i < activeTopicIdx
                ? "done-topic"
                : i === activeTopicIdx
                  ? "active-topic"
                  : "todo-topic";
            return (
              <button
                key={t}
                disabled={i === activeTopicIdx}
                className={`topic-node-row ${status}`}
                title={
                  i === activeTopicIdx ? "Current topic" : `Switch to: ${t}`
                }
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
                <span style={{ flex: 1 }}>{t}</span>
                {i < activeTopicIdx && <Check size={11} color="#E4A32A" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="session-info">
        <b>Student Profile</b>
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
        <b>AI Tutor</b>
        Kindling · Powered by Gemini
      </div>
    </aside>
  );
}
