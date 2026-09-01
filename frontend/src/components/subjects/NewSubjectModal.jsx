import { useState } from "react";
import { BookOpen, Sparkles, X, ArrowRight, Loader2 } from "lucide-react";
import { ICON_LIBRARY, COLOR_LIBRARY, ICON_MAP } from "../../constants/icons";
import { DEFAULT_FAMILIARITY, familiarityLabel } from "../../constants/familiarity";
import TopicIntentFields from "./TopicIntentFields";

const ICON_LABELS = {
  calculator: "Math",
  book: "Reading",
  flask: "Science",
  globe: "World",
  code: "Code",
  music: "Music",
  palette: "Arts",
  landmark: "History",
  dumbbell: "Fitness",
  target: "Goals",
};

export default function NewSubjectModal({ onClose, onCreate, saving = false }) {
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState(ICON_LIBRARY[0].key);
  const [color, setColor] = useState(COLOR_LIBRARY[0]);
  const [subjectGoal, setSubjectGoal] = useState("");
  const [firstTopic, setFirstTopic] = useState("");
  const [familiarity, setFamiliarity] = useState(DEFAULT_FAMILIARITY);
  const [topicGoal, setTopicGoal] = useState("");

  const PreviewIcon = ICON_MAP[iconKey] || BookOpen;
  const previewName = name.trim() || "Your new subject";
  const hasTopic = Boolean(firstTopic.trim());

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
    <div
      className="modal-overlay subject-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-subject-title"
    >
      <div
        className="subject-create-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="subject-create-hero">
          <div className="subject-create-hero-copy">
            <p className="eyebrow">Curriculum builder</p>
            <h3 id="new-subject-title">Create a subject</h3>
            <p className="subject-create-lead">
              Shape a learning path Kindling can teach — pick a look, set your
              aim, and optionally start the first topic at the right pace.
            </p>
          </div>
          <button
            type="button"
            className="subject-create-close"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            <X size={18} />
          </button>
        </div>

        <div className="subject-create-body">
          <div className="subject-preview-card" style={{ "--subj-accent": color }}>
            <div
              className="subject-preview-icon"
              style={{ background: color }}
            >
              <PreviewIcon size={22} color="#1F3A34" strokeWidth={1.75} />
            </div>
            <div className="subject-preview-meta">
              <span className="subject-preview-kicker">Live preview</span>
              <strong>{previewName}</strong>
              <span className="subject-preview-sub">
                {hasTopic
                  ? `First topic: ${firstTopic.trim()} · ${familiarityLabel(familiarity)}`
                  : "Add a first topic when you are ready"}
              </span>
            </div>
            <Sparkles size={18} className="subject-preview-spark" aria-hidden />
          </div>

          <section className="subject-form-section">
            <header className="subject-form-section-head">
              <span className="subject-form-step">1</span>
              <div>
                <h4>Identity</h4>
                <p>Name and look for My Subjects</p>
              </div>
            </header>

            <div className="subject-form-stack">
              <label className="subject-field">
                <span className="field-label">
                  Subject name <span className="req-star">*</span>
                </span>
                <input
                  className="modal-input"
                  placeholder="e.g. Biology, Creative writing, Algebra II"
                  value={name}
                  autoFocus
                  disabled={saving}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
              </label>

              <div className="subject-identity-row">
                <div className="subject-field">
                  <span className="field-label">Icon</span>
                  <div className="subject-icon-grid" role="listbox" aria-label="Subject icon">
                    {ICON_LIBRARY.map(({ key, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        role="option"
                        aria-selected={iconKey === key}
                        className={`subject-icon-btn${iconKey === key ? " selected" : ""}`}
                        onClick={() => setIconKey(key)}
                        disabled={saving}
                        title={ICON_LABELS[key] || key}
                      >
                        <Icon size={18} strokeWidth={1.75} />
                        <span>{ICON_LABELS[key] || key}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="subject-field">
                  <span className="field-label">Accent color</span>
                  <div className="subject-color-row" role="listbox" aria-label="Accent color">
                    {COLOR_LIBRARY.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="option"
                        aria-selected={color === c}
                        className={`subject-color-btn${color === c ? " selected" : ""}`}
                        style={{ background: c }}
                        onClick={() => setColor(c)}
                        disabled={saving}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="subject-form-section">
            <header className="subject-form-section-head">
              <span className="subject-form-step">2</span>
              <div>
                <h4>Your aim</h4>
                <p>Optional — guides how Kindling frames this subject</p>
              </div>
            </header>
            <label className="subject-field">
              <span className="field-label">What do you want from this subject?</span>
              <textarea
                className="modal-input topic-goal-input"
                rows={2}
                placeholder="e.g. Feel confident before my end-of-term exams"
                value={subjectGoal}
                disabled={saving}
                onChange={(e) => setSubjectGoal(e.target.value)}
              />
            </label>
          </section>

          <section className="subject-form-section topic-launch-section">
            <header className="subject-form-section-head">
              <span className="subject-form-step">3</span>
              <div>
                <h4>First topic launch</h4>
                <p>Optional — start with one clear lesson focus</p>
              </div>
            </header>

            <label className="subject-field">
              <span className="field-label">First topic name</span>
              <input
                className="modal-input"
                placeholder="e.g. Cell structure, Quadratic equations, Essay outlines"
                value={firstTopic}
                disabled={saving}
                onChange={(e) => setFirstTopic(e.target.value)}
              />
            </label>

            {hasTopic ? (
              <div className="topic-intent-panel">
                <div className="topic-intent-panel-head">
                  <Sparkles size={15} />
                  <span>Pace this topic</span>
                </div>
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
            ) : (
              <p className="subject-soft-hint">
                Tip: naming a first topic unlocks familiarity and a learning goal
                so the first lesson starts gently.
              </p>
            )}
          </section>
        </div>

        <div className="subject-create-footer">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary subject-create-submit"
            disabled={!name.trim() || saving}
            onClick={submit}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                Creating…
              </>
            ) : (
              <>
                Create subject
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}