import { useState } from "react";
import { apiRequest } from "../../services/api/client";

const CATEGORIES = [
  ["technical", "A lesson or feature is not working"],
  ["account", "Account access"],
  ["billing", "Billing or invoice"],
  ["accessibility", "Accessibility"],
  ["other", "Other feedback"],
];

export default function SupportPanel({ isLoggedIn }) {
  const [category, setCategory] = useState("technical");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError("");
    setResult(null);
    try {
      const response = await apiRequest("/api/support/requests/", {
        method: "POST",
        auth: isLoggedIn,
        json: {
          category,
          subject,
          message,
          ...(!isLoggedIn ? { contact_email: contactEmail } : {}),
        },
      });
      setResult(response);
      setSubject("");
      setMessage("");
      setContactEmail("");
    } catch (err) {
      setError(err?.message || "Your note could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (result) {
    return (
      <div className="panel support-result" role="status">
        <h3>Thanks for letting us know.</h3>
        <p>Reference: <strong>{result.reference}</strong></p>
        {result.notification_sent ? (
          <p>The support team has been notified. This form is not monitored for emergencies.</p>
        ) : (
          <p>Your note is saved, but the support inbox is not connected yet. Please contact the person who invited you if you need a reply. This form is not an emergency channel.</p>
        )}
        <button type="button" className="btn-ghost" onClick={() => setResult(null)}>
          Send another note
        </button>
      </div>
    );
  }

  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <div>
          <h2>Help & feedback</h2>
          <p>Tell the Kindling team what happened. We’ll keep your note in a staff-only support queue.</p>
        </div>
      </div>
      <div className="panel support-form-panel">
        <p className="settings-muted">
          Please don’t include passwords, payment-card details, or sensitive personal information. This form is not monitored for emergencies or crisis support; contact a trusted adult or local emergency service for urgent help.
        </p>
        <form onSubmit={submit}>
          <label className="support-field">
            <span>What can we help with?</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="support-field">
            <span>Short subject</span>
            <input value={subject} maxLength={120} onChange={(event) => setSubject(event.target.value)} required />
          </label>
          <label className="support-field">
            <span>What happened?</span>
            <textarea value={message} maxLength={3000} rows={6} onChange={(event) => setMessage(event.target.value)} required />
          </label>
          {!isLoggedIn && (
            <label className="support-field">
              <span>Email for a reply (optional)</span>
              <input type="email" autoComplete="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
            </label>
          )}
          {error && <p className="settings-error" role="alert">{error}</p>}
          <button className="btn-primary" type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send to Kindling support"}
          </button>
        </form>
      </div>
    </section>
  );
}
