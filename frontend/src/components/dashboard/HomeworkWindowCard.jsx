import { useEffect, useMemo, useState } from "react";
import { Clock3, BookOpen } from "lucide-react";

const WINDOW_MINUTES = [15, 25, 40];

function lessonChoices(subject) {
  const choices = [];
  for (const [unitIndex, unit] of (subject?.topics || []).entries()) {
    const subtopics = unit.subtopics || [];
    if (subtopics.length) {
      for (const [subtopicIndex, subtopic] of subtopics.entries()) {
        choices.push({
          key: `${unitIndex}:${subtopicIndex}`,
          unit: unit.name,
          topic: subtopic.name,
        });
      }
    } else {
      choices.push({
        key: `${unitIndex}:0`,
        unit: "",
        topic: unit.name,
      });
    }
  }
  return choices;
}

export default function HomeworkWindowCard({ subjects = [], onStartLesson }) {
  const [subjectId, setSubjectId] = useState(
    String(subjects[0]?.id ?? subjects[0]?.name ?? "")
  );
  const [minutes, setMinutes] = useState(25);
  const subject = useMemo(
    () => subjects.find((item) => String(item.id ?? item.name) === subjectId) || subjects[0],
    [subjects, subjectId]
  );
  const choices = useMemo(() => lessonChoices(subject), [subject]);
  const [lessonKey, setLessonKey] = useState("");

  useEffect(() => {
    setSubjectId(String(subjects[0]?.id ?? subjects[0]?.name ?? ""));
  }, [subjects]);

  useEffect(() => {
    if (!choices.some((item) => item.key === lessonKey)) {
      setLessonKey(choices[0]?.key || "");
    }
  }, [choices, lessonKey]);

  const selectedLesson = choices.find((item) => item.key === lessonKey);

  const start = () => {
    if (!onStartLesson) return;
    onStartLesson(
      subject?.name || "Computer Science",
      selectedLesson?.topic || "Homework help",
      {
        unit: selectedLesson?.unit || "",
        homeworkWindowMinutes: minutes,
      }
    );
  };

  return (
    <section className="week-focus-card homework-window-card" aria-labelledby="homework-window-title">
      <div className="week-focus-head">
        <span className="week-focus-icon" aria-hidden>
          <Clock3 size={16} />
        </span>
        <div>
          <p className="eyebrow">A focused work window</p>
          <h3 id="homework-window-title">Homework help</h3>
        </div>
      </div>
      <p className="week-focus-hint">
        Choose a lesson and a comfortable time. Bring a photo or describe the question.
      </p>

      {subjects.length > 1 && (
        <label className="homework-window-field">
          <span>Subject</span>
          <select
            className="week-focus-input"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            {subjects.map((item) => (
              <option key={item.id ?? item.name} value={String(item.id ?? item.name)}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {choices.length > 1 && (
        <label className="homework-window-field">
          <span>Lesson</span>
          <select
            className="week-focus-input"
            value={lessonKey}
            onChange={(event) => setLessonKey(event.target.value)}
          >
            {choices.map((item) => (
              <option key={item.key} value={item.key}>
                {item.unit ? `${item.unit} · ` : ""}{item.topic}
              </option>
            ))}
          </select>
        </label>
      )}

      <span className="homework-window-label">How long would you like to focus?</span>
      <div className="homework-window-options" role="group" aria-label="Homework focus duration">
        {WINDOW_MINUTES.map((option) => (
          <button
            type="button"
            key={option}
            className={`homework-window-option${minutes === option ? " selected" : ""}`}
            aria-pressed={minutes === option}
            onClick={() => setMinutes(option)}
          >
            {option} min
          </button>
        ))}
      </div>
      <button type="button" className="homework-window-start" onClick={start}>
        <BookOpen size={15} /> Start focused lesson
      </button>
    </section>
  );
}
