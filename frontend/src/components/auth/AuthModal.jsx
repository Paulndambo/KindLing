import { useState, useEffect, useRef } from "react";
import { Lock, Sparkles, X, Loader2 } from "lucide-react";
import { TAB_LABELS } from "../../constants/navigation";

function messageFromAuthError(err, fallback) {
  if (!err) return fallback;
  const data = err.data;
  if (data && typeof data === "object") {
    if (typeof data.detail === "string" && data.detail.trim()) return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]) return String(data.detail[0]);
    if (typeof data.error === "string" && data.error.trim()) return data.error;
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    const firstField = Object.values(data).flat?.()?.[0];
    if (typeof firstField === "string" && firstField.trim()) return firstField;
  }
  if (typeof err.message === "string" && err.message.trim()) {
    // fetch() network failures often look like "Failed to fetch"
    if (/failed to fetch|networkerror|load failed/i.test(err.message)) {
      return "Unable to reach Kindling. Check that the server is running and try again.";
    }
    return err.message;
  }
  return fallback;
}

/**
 * Student auth: Log in (existing account) or Get Started (register).
 * After Get Started, the app opens profile onboarding automatically.
 */
export default function AuthModal({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  mode = "login",
  onModeChange,
  redirectTab,
  loading = false,
  error = "",
  onClearError,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState("");
  const errorRef = useRef(null);

  const isRegister = mode === "register";

  // Clear form errors only when the modal opens or the mode switches —
  // not when parent re-renders (inline onClearError used to wipe failures instantly).
  useEffect(() => {
    if (!isOpen) return;
    setLocalError("");
    onClearError?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only isOpen/mode
  }, [isOpen, mode]);

  useEffect(() => {
    if (!(localError || error)) return;
    errorRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [localError, error]);

  if (!isOpen) return null;

  const displayError = localError || error;

  const switchMode = (next) => {
    setLocalError("");
    onClearError?.();
    onModeChange?.(next);
  };

  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    setLocalError("");
    onClearError?.();

    if (!email.trim() || !password.trim()) {
      setLocalError("Please enter both email and password.");
      return;
    }

    if (isRegister) {
      if (password.length < 8) {
        setLocalError("Password must be at least 8 characters.");
        return;
      }
      if (password !== passwordConfirm) {
        setLocalError("Passwords do not match.");
        return;
      }
      try {
        await onRegister({
          email: email.trim(),
          password,
          passwordConfirm,
          name: name.trim(),
        });
      } catch (err) {
        setLocalError(
          messageFromAuthError(err, "Unable to create account. Please try again.")
        );
      }
      return;
    }

    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setLocalError(
        messageFromAuthError(
          err,
          "Unable to log in. Check your email and password, then try again."
        )
      );
    }
  };

  const targetName = TAB_LABELS[redirectTab] || "personalized learning";

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--teal-pale)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isRegister ? (
                <Sparkles size={16} color="var(--teal)" />
              ) : (
                <Lock size={16} color="var(--teal)" />
              )}
            </div>
            <h3>{isRegister ? "Get started with Kindling" : "Log in to Kindling"}</h3>
          </div>
          <button
            className="icon-x"
            onClick={onClose}
            aria-label="Close"
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>

        <p className="modal-sub">
          {isRegister
            ? "Create your student account, then set up your learning profile."
            : (
              <>
                Log in to access <strong>{targetName}</strong> and your learning
                path.
              </>
            )}
        </p>

        {/* Mode toggle */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            background: "rgba(31,58,52,0.06)",
            borderRadius: 12,
            padding: 4,
            marginBottom: 18,
          }}
        >
          <button
            type="button"
            className={!isRegister ? "btn-primary" : "btn-ghost"}
            style={{
              padding: "10px 12px",
              fontSize: 13,
              borderRadius: 10,
              border: "none",
              background: !isRegister ? undefined : "transparent",
            }}
            onClick={() => switchMode("login")}
            disabled={loading}
          >
            Log in
          </button>
          <button
            type="button"
            className={isRegister ? "btn-primary" : "btn-ghost"}
            style={{
              padding: "10px 12px",
              fontSize: 13,
              borderRadius: 10,
              border: "none",
              background: isRegister ? undefined : "transparent",
            }}
            onClick={() => switchMode("register")}
            disabled={loading}
          >
            Get started
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          {isRegister && (
            <div className="field-block">
              <span className="field-label">Your name</span>
              <input
                type="text"
                className="modal-input"
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                autoFocus
              />
            </div>
          )}
          <div className="field-block">
            <span className="field-label">Email address</span>
            <input
              type="email"
              className="modal-input"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              autoFocus={!isRegister}
            />
          </div>
          <div className="field-block">
            <span className="field-label">Password</span>
            <input
              type="password"
              className="modal-input"
              placeholder={isRegister ? "At least 8 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </div>
          {isRegister && (
            <div className="field-block">
              <span className="field-label">Confirm password</span>
              <input
                type="password"
                className="modal-input"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          )}

          {displayError && (
            <div
              ref={errorRef}
              className="auth-error"
              role="alert"
              aria-live="assertive"
            >
              {displayError}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader2
                    size={15}
                    style={{
                      marginRight: 6,
                      display: "inline",
                      verticalAlign: "middle",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  {isRegister ? "Creating account…" : "Signing in…"}
                </>
              ) : isRegister ? (
                "Create account"
              ) : (
                "Log in"
              )}
            </button>
          </div>
        </form>

        <p
          style={{
            marginTop: 16,
            marginBottom: 0,
            fontSize: 12.5,
            color: "var(--ink-soft)",
            textAlign: "center",
          }}
        >
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--teal)",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "inherit",
                }}
              >
                Log in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--teal)",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "inherit",
                }}
              >
                Get started
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
