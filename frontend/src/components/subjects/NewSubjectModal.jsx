import { useState } from "react";
import { ICON_LIBRARY, COLOR_LIBRARY } from "../../constants/icons";

export default function NewSubjectModal({ onClose, onCreate, saving = false }) {
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState(ICON_LIBRARY[0].key);
  const [color, setColor] = useState(COLOR_LIBRARY[0]);
  const [firstTopic, setFirstTopic] = useState("");

  const submit = () => {
    if (!name.trim() || saving) return;
    onCreate({
      name: name.trim(),
      icon: iconKey,
      color,
      // API accepts string topic names; hook normalizes either shape
      topics: firstTopic.trim() ? [firstTopic.trim()] : [],
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>New subject</h3>
        <p className="modal-sub">
          Give it a name — you can add topics to it any time.
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
                className={`color-swatch ${color === c ? "selected" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className="field-block" style={{ marginBottom: 0 }}>
          <span className="field-label">First topic (optional)</span>
          <input
            className="modal-input"
            placeholder="e.g. Cell structure"
            value={firstTopic}
            onChange={(e) => setFirstTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
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
