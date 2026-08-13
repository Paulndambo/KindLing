import { useState } from "react";
import { ICON_LIBRARY, COLOR_LIBRARY } from "../../constants/icons";
import { DEFAULT_FAMILIARITY } from "../../constants/familiarity";
import TopicIntentFields from "./TopicIntentFields";

export default function NewSubjectModal({ onClose, onCreate, saving = false }) {
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState(ICON_LIBRARY[0].key);
  const [color, setColor] = useState(COLOR_LIBRARY[0]);
  const [subjectGoal, setSubjectGoal] = useState("");
  const [firstTopic, setFirstTopic] = useState("");
  const [familiarity, setFamiliarity] = useState(DEFAULT_FAMILIARITY);
  const [topicGoal, setTopicGoal] = useState("");

  const submit = () => {
    if (!name.trim() || saving) return;
    const topicName = firstTopic.trim();
    onCreate({
      name: name.trim(),
      icon: iconKey,
      color,
      learningGoal: subjectGoal.trim(),
      topics: topicName
        ? [
            {
              name: topicName,
              familiarity,
              learningGoal: topicGoal.trim(),
            },
          ]
        : [],
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <h3>New subject</h3>
        <p className="modal-sub">
          Tell Kindling what you want to learn and how familiar you already are —
          so the first lesson starts gently and stays on target.
        </p>

        <div className="field-block">
          <span className="field-label">Subject name</span>
          <input
            className="modal-input"
            placeholder="e.g. Biology"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        <div className="field-block">
          <span className="field-label">Icon</span>
          <div className="swatch-row">
            {ICON_LIBRARY.map(({ key, Icon }) => (
              <button
                key={key}
                type="button"
                className={`icon-swatch ${iconKey === key ? "selected" : ""}`}
                onClick={() => setIconKey(key)}
                aria-label={key}
              >
                <Icon size={17} color="#1F3A34" strokeWidth={1.7} />
              </button>
            ))}
          </div>
        </div>

        <div className="field-block">
          <span className="field-label">Color</span>
          <div className="swatch-row">
            {COLOR_LIBRARY.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-swatch ${color === c ? "selected" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className="field-block">
          <span className="field-label">What do you want from this subject? (optional)</span>
          <textarea
            className="modal-input topic-goal-input"
            rows={2}
            placeholder="e.g. Feel confident before my end-of-term exams"
            value={subjectGoal}
            disabled={saving}
            onChange={(e) => setSubjectGoal(e.target.value)}
          />
        </div>

        <div className="field-block" style={{ marginBottom: 12 }}>
          <span className="field-label">First topic (optional)</span>
          <input
            className="modal-input"
            placeholder="e.g. Cell structure"
            value={firstTopic}
            disabled={saving}
            onChange={(e) => setFirstTopic(e.target.value)}
          />
        </div>

        {firstTopic.trim() ? (
          <div className="topic-intent-card">
            <p className="topic-intent-card-title">About this topic</p>
            <TopicIntentFields
              familiarity={familiarity}
              onFamiliarityChange={setFamiliarity}
              learningGoal={topicGoal}
              onLearningGoalChange={setTopicGoal}
              goalPlaceholder={`e.g. What "${firstTopic.trim()}" means and how to use it`}
              disabled={saving}
              compact
            />
          </div>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!name.trim() || saving}
            onClick={submit}
          >
            {saving ? "Creating…" : "Create subject"}
          </button>
        </div>
      </div>
    </div>
  );
}
