import { useState, useEffect } from "react";
import { Lock, Sparkles, X, Loader2 } from "lucide-react";
import { TAB_LABELS } from "../../constants/navigation";

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

  const isRegister = mode === "register";

  useEffect(() => {
    if (!isOpen) return;
    setLocalError("");
    onClearError?.();
  }, [isOpen, mode, onClearError]);

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
      } catch {
        // Error surfaced via parent authError
      }
      return;
    }

    try {
      await onLogin(email.trim(), password);
    } catch {
      // Error surfaced via parent authError
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
              style={{
                color: "var(--berry)",
                fontSize: 12.5,
                marginBottom: 14,
                fontWeight: 600,
              }}
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
