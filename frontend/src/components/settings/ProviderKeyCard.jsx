import { useState } from "react";
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";

export default function ProviderKeyCard({
  provider,
  status,
  isPrimary,
  platformGemini,
  onSave,
  onRemove,
  onMakePrimary,
}) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(status?.baseUrl || provider.defaultBaseUrl || "");
  const [label, setLabel] = useState(status?.label || "");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const hasKey = Boolean(status?.hasKey);

  const handleSaveFull = async (e) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setMessage("Paste an API key to save.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await onSave(provider.id, {
        apiKey: trimmed,
        baseUrl: provider.allowsCustomBaseUrl ? baseUrl : undefined,
        label,
      });
      setApiKey("");
      setMessage("Key saved on this device.");
    } catch (err) {
      setMessage(err?.message || "Could not save key");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setMessage("");
    try {
      await onRemove(provider.id);
      setMessage("Key removed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className={`provider-card${isPrimary ? " primary" : ""}${hasKey ? " has-key" : ""}`}
    >
      <div className="provider-card-head">
        <div
          className="provider-dot"
          style={{ background: provider.color || "var(--teal)" }}
        />
        <div className="provider-card-titles">
          <h3>
            {provider.name}
            {isPrimary && (
              <span className="provider-primary-pill">
                <Star size={11} /> Primary
              </span>
            )}
          </h3>
          <p>{provider.description}</p>
        </div>
      </div>

      <div className="provider-status-row">
        {hasKey ? (
          <span className="provider-status ok">
            <Check size={13} /> Key on device · {status.mask}
          </span>
        ) : platformGemini ? (
          <span className="provider-status platform">
            Platform Gemini available
          </span>
        ) : (
          <span className="provider-status">No personal key</span>
        )}
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="provider-docs"
        >
          Get key <ExternalLink size={12} />
        </a>
      </div>

      <form className="provider-form" onSubmit={handleSaveFull}>
        <label className="provider-field">
          <span>API key</span>
          <div className="provider-key-input">
            <KeyRound size={14} className="provider-key-icon" />
            <input
              type={show ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                hasKey
                  ? "Paste a new key to replace…"
                  : provider.keyHint || "Paste API key"
              }
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="provider-eye"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide key" : "Show key"}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        {provider.allowsCustomBaseUrl && (
          <label className="provider-field">
            <span>Base URL (optional)</span>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={provider.defaultBaseUrl}
            />
          </label>
        )}

        <label className="provider-field">
          <span>Label (optional)</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Personal, School pilot"
            maxLength={80}
          />
        </label>

        <div className="provider-actions">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={14} className="spin" /> : null}
            Save key
          </button>
          {!isPrimary && (
            <button
              type="button"
              className="btn-ghost"
              onClick={onMakePrimary}
              disabled={busy}
            >
              Make primary
            </button>
          )}
          {hasKey && (
            <button
              type="button"
              className="btn-ghost provider-remove"
              onClick={handleRemove}
              disabled={busy}
              title="Remove key from this device"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {message && <p className="provider-message">{message}</p>}
      </form>
    </article>
  );
}
