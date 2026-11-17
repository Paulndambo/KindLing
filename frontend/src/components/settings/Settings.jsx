import { useMemo, useState } from "react";
import {
  CreditCard,
  KeyRound,
  LifeBuoy,
  Loader2,
  Lock,
  RefreshCw,
  Settings2,
  Shield,
  Zap,
} from "lucide-react";
import { usePlatformSettings } from "../../hooks/usePlatformSettings";
import { PROVIDERS, getProvider, modelsForProvider } from "../../services/ai";
import { ROUTING_MODES } from "../../constants/subscription";
import ProviderKeyCard from "./ProviderKeyCard";
import SupportPanel from "./SupportPanel";
import RevenueCatSubscription from "./RevenueCatSubscription";

const TABS = [
  { id: "subscription", label: "Subscription", Icon: CreditCard },
  { id: "ai", label: "AI providers", Icon: KeyRound },
  { id: "support", label: "Help & feedback", Icon: LifeBuoy },
];

export default function Settings({ isLoggedIn, onOpenLogin, purchases, initialTab = "subscription" }) {
  const [tab, setTab] = useState(initialTab);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const {
    subscription,
    entitlements,
    preferences,
    keyStatuses,
    runtime,
    loading,
    error,
    setError,
    testResult,
    testing,
    updatePreferences,
    saveProviderKey,
    deleteProviderKey,
    runConnectionTest,
    reload,
  } = usePlatformSettings({ isLoggedIn });

  const routeLabel = useMemo(() => {
    if (!runtime?.chat) return "No AI route";
    const p = getProvider(runtime.chat.provider);
    return `${p?.name || runtime.chat.provider} · ${runtime.chat.model} (${runtime.chat.source})`;
  }, [runtime]);

  const multiProvider = Boolean(entitlements?.multiProvider || entitlements?.advancedRouting);
  const advancedRouting = Boolean(entitlements?.advancedRouting);

  const visibleProviders = useMemo(() => {
    if (multiProvider) return PROVIDERS;
    // Spark: Gemini + one other for testing high-level mode
    return PROVIDERS.filter((p) => p.id === "gemini" || p.id === "openai");
  }, [multiProvider]);

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Platform settings</h1>
          <p className="settings-hero-sub">
            Choose your Kindling plan and how lessons reach an LLM — platform
            Gemini by default, or your own keys from any supported provider.
          </p>
        </div>
        <div className="settings-runtime-chip" title="Active AI route">
          <Settings2 size={15} />
          <div>
            <strong>Live route</strong>
            <span>{routeLabel}</span>
          </div>
        </div>
      </header>

      {!isLoggedIn && (
        <div className="settings-guest-banner">
          <Lock size={16} />
          <div>
            <strong>Browsing as guest</strong>
            <p>
              AI provider keys save on this device.{" "}
              <button type="button" className="linkish" onClick={onOpenLogin}>
                Log in
              </button>{" "}
              to subscribe and sync routing preferences to your account.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="settings-error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="settings-tabs" role="tablist">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`settings-tab${tab === id ? " active" : ""}`}
            onClick={() => setTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        <button
          type="button"
          className="settings-tab-refresh"
          onClick={() => reload()}
          title="Reload"
          disabled={loading}
        >
          {loading ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
        </button>
      </div>

      {tab === "subscription" && <>
        <RevenueCatSubscription purchases={purchases} onOpenLogin={onOpenLogin} />
        {subscription?.platform_ai_daily_usage?.limit > 0 ? <p className="settings-muted">
          Platform AI today: {subscription.platform_ai_daily_usage.used} of {subscription.platform_ai_daily_usage.limit} requests used; resets at midnight UTC.
          {` Estimated tokens: ${subscription.platform_ai_daily_usage.estimatedTokensUsed.toLocaleString()} of ${subscription.platform_ai_daily_usage.estimatedTokenLimit.toLocaleString()}.`}
        </p> : null}
      </>}

      {tab === "ai" && (
        <section className="settings-section">
          <div className="settings-section-head">
            <div>
              <h2>AI providers & keys</h2>
              <p>
                Kindling defaults to <strong>platform Gemini</strong>. Enable
                high-level BYOK mode to bring keys from Gemini, OpenAI,
                Anthropic, Groq, or OpenRouter — and hot-switch mid product.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => runConnectionTest()}
              disabled={testing || !runtime?.available}
            >
              {testing ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Zap size={15} />
              )}
              Test connection
            </button>
          </div>

          {testResult && (
            <div
              className={`settings-test-result${testResult.ok ? " ok" : " bad"}`}
              role="status"
            >
              {testResult.ok ? (
                <>
                  Connected to <strong>{testResult.provider}</strong> /{" "}
                  {testResult.model} via {testResult.source} in{" "}
                  {testResult.latencyMs}ms.
                </>
              ) : (
                <>
                  Connection failed
                  {testResult.provider ? ` (${testResult.provider})` : ""}:{" "}
                  {testResult.error}
                </>
              )}
            </div>
          )}

          <div className="settings-mode-grid">
            {ROUTING_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`settings-mode-card${
                  preferences.routingMode === mode.id ? " active" : ""
                }`}
                onClick={() => updatePreferences({ routingMode: mode.id })}
              >
                <strong>{mode.label}</strong>
                <span>{mode.desc}</span>
              </button>
            ))}
          </div>

          <div className="panel" style={{ marginBottom: 18 }}>
            <div className="dash-panel-head">
              <h3>Primary model</h3>
              <span className="settings-muted" style={{ fontSize: 12.5 }}>
                Used for live lessons
              </span>
            </div>
            <div className="settings-primary-row">
              <label>
                <span>Provider</span>
                <select
                  value={preferences.primaryProvider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    const models = modelsForProvider(provider, {
                      capability: "chat",
                    });
                    updatePreferences({
                      primaryProvider: provider,
                      primaryModel:
                        models.find((m) => m.recommended)?.id ||
                        models[0]?.id ||
                        "",
                    });
                  }}
                >
                  {visibleProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Model</span>
                <select
                  value={preferences.primaryModel}
                  onChange={(e) =>
                    updatePreferences({ primaryModel: e.target.value })
                  }
                >
                  {modelsForProvider(preferences.primaryProvider, {
                    capability: "chat",
                  }).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                      {m.recommended ? " ★" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {advancedRouting && (
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="linkish"
                  onClick={() => setAdvancedOpen((o) => !o)}
                >
                  {advancedOpen ? "Hide" : "Show"} per-task routing (Premium)
                </button>
                {advancedOpen && (
                  <div className="settings-task-routes">
                    {["chat", "vision", "tts"].map((task) => {
                      const route = preferences.taskRoutes?.[task] || {};
                      const taskProvider =
                        route.provider || preferences.primaryProvider;
                      return (
                        <div key={task} className="settings-task-row">
                          <span className="settings-task-label">{task}</span>
                          <select
                            value={taskProvider}
                            onChange={(e) => {
                              const provider = e.target.value;
                              const models = modelsForProvider(provider, {
                                capability:
                                  task === "tts"
                                    ? "tts"
                                    : task === "vision"
                                      ? "vision"
                                      : "chat",
                              });
                              updatePreferences({
                                taskRoutes: {
                                  ...preferences.taskRoutes,
                                  [task]: {
                                    provider,
                                    model:
                                      models.find((m) => m.recommended)?.id ||
                                      models[0]?.id ||
                                      "",
                                  },
                                },
                              });
                            }}
                          >
                            {PROVIDERS.filter((p) =>
                              p.capabilities.includes(
                                task === "summary" ? "chat" : task
                              )
                            ).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={
                              route.model ||
                              modelsForProvider(taskProvider, {
                                capability:
                                  task === "tts"
                                    ? "tts"
                                    : task === "vision"
                                      ? "vision"
                                      : "chat",
                              })[0]?.id ||
                              ""
                            }
                            onChange={(e) =>
                              updatePreferences({
                                taskRoutes: {
                                  ...preferences.taskRoutes,
                                  [task]: {
                                    provider: taskProvider,
                                    model: e.target.value,
                                  },
                                },
                              })
                            }
                          >
                            {modelsForProvider(taskProvider, {
                              capability:
                                task === "tts"
                                  ? "tts"
                                  : task === "vision"
                                    ? "vision"
                                    : "chat",
                            }).map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="settings-privacy-note">
            <Shield size={16} />
            <p>
              API keys stay in this browser (obfuscated local vault). Kindling’s
              servers only store non-secret fingerprints and routing
              preferences — never your raw keys.
            </p>
          </div>

          <div className="provider-grid">
            {visibleProviders.map((provider) => {
              const status = keyStatuses.find(
                (k) => k.providerId === provider.id
              );
              return (
                <ProviderKeyCard
                  key={provider.id}
                  provider={provider}
                  status={status}
                  isPrimary={preferences.primaryProvider === provider.id}
                  platformGemini={
                    provider.id === "gemini" && runtime?.hasPlatform
                  }
                  onSave={saveProviderKey}
                  onRemove={deleteProviderKey}
                  onMakePrimary={() => {
                    const models = modelsForProvider(provider.id, {
                      capability: "chat",
                    });
                    updatePreferences({
                      primaryProvider: provider.id,
                      primaryModel:
                        models.find((m) => m.recommended)?.id ||
                        models[0]?.id ||
                        provider.defaultModel,
                      routingMode:
                        preferences.routingMode === "platform"
                          ? "auto"
                          : preferences.routingMode,
                    });
                  }}
                />
              );
            })}
          </div>

          {!multiProvider && (
            <p className="settings-muted" style={{ marginTop: 12 }}>
              Upgrade to <strong>Premium</strong> to unlock every provider and
              advanced per-task routing. Spark still lets you use BYOK with
              Gemini and OpenAI.
            </p>
          )}
        </section>
      )}

      {tab === "support" && <SupportPanel isLoggedIn={isLoggedIn} />}
    </div>
  );
}
