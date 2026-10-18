import { useState } from "react";
import {
  Edit3,
  ArrowRight,
  Sparkles,
  LogIn,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  LifeBuoy,
  Layers,
  Volume2,
  ChevronDown,
  ChevronUp,
  Flame,
  Award,
  Zap,
  Compass,
} from "lucide-react";
import {
  HERO_PATHS,
  CONTRAST_ITEMS,
  LADDER_STAGES,
  FLOW,
  MARKETING_SUBJECTS,
  PLATFORM_PILLARS,
  QUOTES,
  OVERVIEW_FAQS,
} from "../../constants/overview";
import { PLAN_CATALOG } from "../../constants/subscription";
import MasteryPathSvg from "../charts/MasteryPathSvg";
import "../../styles/overview.css";

function LadderVisualPreview({ visualType, caption }) {
  return (
    <div className="ladder-visual-box">
      <div className="ladder-visual-caption">
        <Layers size={14} aria-hidden />
        <span>{caption}</span>
      </div>
      {visualType === "fraction-bars" && (
        <div className="fraction-bar-demo" aria-label="Fraction bar comparison">
          <div className="fraction-bar-row">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="fraction-cell filled">
                1/4
              </div>
            ))}
            <div className="fraction-cell" />
            <div className="fraction-cell" />
          </div>
          <div className="fraction-bar-row">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="fraction-cell filled-gold">
                1/8
              </div>
            ))}
            <div className="fraction-cell">1/8</div>
            <div className="fraction-cell">1/8</div>
          </div>
        </div>
      )}
      {visualType === "hint-callout" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            fontSize: 12.5,
            color: "var(--pine)",
            background: "var(--pine-pale)",
            padding: "9px 12px",
            borderRadius: 10,
          }}
        >
          <span>
            <strong>1 whole</strong> = 6 sixths (<code>6/6</code>)
          </span>
          <span>→</span>
          <span>
            <strong>2/3 of a whole</strong> = <code>?</code> sixths
          </span>
        </div>
      )}
      {visualType === "worked-card" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            fontSize: 12,
          }}
        >
          <div
            style={{
              background: "var(--parchment)",
              padding: "8px 10px",
              borderRadius: 9,
            }}
          >
            <strong style={{ color: "var(--pine)", display: "block" }}>
              Meaning (Groups)
            </strong>
            <code>4/5 = 12/15 → 12 ÷ 2 = 6</code>
          </div>
          <div
            style={{
              background: "var(--teal-pale)",
              padding: "8px 10px",
              borderRadius: 9,
            }}
          >
            <strong style={{ color: "var(--pine)", display: "block" }}>
              Reciprocal Shortcut
            </strong>
            <code>4/5 × 15/2 = 60/10 = 6</code>
          </div>
        </div>
      )}
      {visualType === "multistep-check" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--pine)" }}>
            <CheckCircle2 size={14} color="var(--teal)" aria-hidden />
            <span>
              <code>Step 1:</code> Keep <strong>2/3</strong>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--pine)" }}>
            <CheckCircle2 size={14} color="var(--teal)" aria-hidden />
            <span>
              <code>Step 2:</code> Flip divisor <code>1/6 → 6/1</code>
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "var(--pine)",
              fontWeight: 600,
            }}
          >
            <Sparkles size={14} color="var(--marigold)" aria-hidden />
            <span>
              <code>Step 3:</code> Compute <code>(2 × 6) / 3 = 4</code>
            </span>
          </div>
        </div>
      )}
      {visualType === "spark-award" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            background: "rgba(228, 163, 42, 0.16)",
            padding: "9px 12px",
            borderRadius: 10,
            fontSize: 12.5,
            color: "var(--pine)",
            fontWeight: 600,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Award size={15} color="var(--pine)" aria-hidden />
            Solo Transfer Verified (No Scaffolds)
          </span>
          <span style={{ color: "var(--teal)", fontWeight: 700 }}>
            SM-2 Review Spark Scheduled ✓
          </span>
        </div>
      )}
    </div>
  );
}

export default function Overview({
  goTo,
  student,
  isLoggedIn = false,
  onOpenOnboarding,
  onGetStarted,
  onOpenLogin,
  onStartLesson,
}) {
  const isOnboarded = Boolean(student?.isOnboarded);
  const studentName = isOnboarded && student?.name ? student.name : "you";
  const possessive = studentName === "you" ? "your" : `${studentName}'s`;

  const [heroPathId, setHeroPathId] = useState(HERO_PATHS[0].id);
  const [activeLadderId, setActiveLadderId] = useState(LADDER_STAGES[0].id);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const currentHeroPath =
    HERO_PATHS.find((p) => p.id === heroPathId) || HERO_PATHS[0];
  const currentLadder =
    LADDER_STAGES.find((s) => s.id === activeLadderId) || LADDER_STAGES[0];
  const currentLadderIdx = LADDER_STAGES.findIndex(
    (s) => s.id === currentLadder.id
  );

  const scrollToLadderDemo = () => {
    const el = document.getElementById("live-ladder-demo");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section id="overview">
      {/* ── 1. HERO SECTION ── */}
      <div className="hero">
        <div>
          <div className="hero-pill">
            <span className="hero-pill-dot" aria-hidden />
            <span className="hero-pill-text">
              Adaptive 1-on-1 AI Tutor
              <span className="hero-pill-sep"> · </span>
              <span className="hero-pill-accent">Learning Intelligence</span>
            </span>
          </div>

          <h1>
            The tutor that stays when learning gets hard —{" "}
            <em>tuned</em> to {studentName}.
          </h1>

          <p className="hero-sub">
            Generic AI dumps the final answer. Kindling listens to how{" "}
            {studentName === "you" ? "you think" : `${studentName} thinks`},
            notices where you hesitate or breeze through, and steps onto a{" "}
            <strong>4-rung help ladder</strong> in real time
            {isOnboarded && student?.schoolName
              ? ` — calibrated to ${student.schoolName}${
                  student.country ? ` (${student.country})` : ""
                }.`
              : " — calibrated to your grade, school, and curriculum."}
          </p>

          <div className="hero-actions">
            {isLoggedIn ? (
              <>
                <button className="btn-primary" onClick={onStartLesson}>
                  <Sparkles size={15} aria-hidden />
                  {isOnboarded ? "Continue learning" : "Complete setup"}
                </button>
                <button className="btn-ghost" onClick={onOpenOnboarding}>
                  <Edit3 size={15} aria-hidden />
                  {isOnboarded ? "Edit your profile" : "Complete your profile"}
                </button>
                {isOnboarded && (
                  <button
                    className="btn-ghost"
                    onClick={() => goTo?.("dashboard")}
                  >
                    View dashboard
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={onGetStarted}>
                  <Sparkles size={15} aria-hidden />
                  Start 30-day free trial
                </button>
                <button className="btn-ghost" onClick={scrollToLadderDemo}>
                  See how a lesson works
                </button>
                <button className="btn-ghost" onClick={onOpenLogin}>
                  <LogIn size={15} aria-hidden />
                  Log in
                </button>
              </>
            )}
          </div>

          <div className="hero-note">
            <span className="dot" aria-hidden />
            {isLoggedIn
              ? isOnboarded
                ? "Pick a subject or resume a lesson — Kindling adapts every turn."
                : "Finish your profile so lessons match your grade and curriculum."
              : "Free 30-day Spark trial · One account = one learner · No credit card required to start."}
          </div>

          <div className="hero-trust-grid" aria-label="Core platform capabilities">
            <div className="hero-trust-item">
              <CheckCircle2 size={15} aria-hidden />
              <span>
                <strong>Socratic by default</strong> — guides reasoning, never spoils answers
              </span>
            </div>
            <div className="hero-trust-item">
              <LifeBuoy size={15} aria-hidden />
              <span>
                <strong>4-rung help ladder</strong> — micro-hint to step-by-step guide
              </span>
            </div>
            <div className="hero-trust-item">
              <Compass size={15} aria-hidden />
              <span>
                <strong>Any subject + photo help</strong> — Math, CS, Science & custom topics
              </span>
            </div>
            <div className="hero-trust-item">
              <Volume2 size={15} aria-hidden />
              <span>
                <strong>Voice & manipulatives</strong> — Read-aloud TTS, LaTeX & visual bars
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Right Studio Card */}
        <div className="path-card">
          <div className="path-card-top">
            <div className="path-head">
              <p className="eyebrow">Live learning pulse · Interactive preview</p>
              <h2>
                {possessive.charAt(0).toUpperCase() + possessive.slice(1)} mastery
                path — {currentHeroPath.topicTitle}
              </h2>
            </div>
            <span className="path-live-badge">
              <span aria-hidden /> L1–L4 Active
            </span>
          </div>

          <div
            className="path-subject-tabs"
            role="tablist"
            aria-label="Preview subject path"
          >
            {HERO_PATHS.map((path) => (
              <button
                key={path.id}
                type="button"
                role="tab"
                aria-selected={currentHeroPath.id === path.id}
                className={`path-subject-tab${
                  currentHeroPath.id === path.id ? " active" : ""
                }`}
                onClick={() => setHeroPathId(path.id)}
              >
                {path.label}
              </button>
            ))}
          </div>

          <div className="path-svg-wrap">
            <MasteryPathSvg nodes={currentHeroPath.nodes} />
          </div>

          <div className="path-pulse-strip" aria-label="Live learner state metrics">
            <div className="path-pulse-pill">
              <span className="path-pulse-label">Skill Mastery</span>
              <span className="path-pulse-val">{currentHeroPath.pulse.mastery}</span>
            </div>
            <div className="path-pulse-pill">
              <span className="path-pulse-label">Learner Pulse</span>
              <span className="path-pulse-val">{currentHeroPath.pulse.confidence}</span>
            </div>
            <div className="path-pulse-pill">
              <span className="path-pulse-label">Independence (ADI)</span>
              <span className="path-pulse-val">{currentHeroPath.pulse.adi}</span>
            </div>
          </div>

          <div className="path-mini-turn">
            <div className="path-mini-student">
              <strong>Student:</strong> &ldquo;{currentHeroPath.studentTurn}&rdquo;
            </div>
            <div className="path-mini-tutor">
              <strong>Kindling:</strong> {currentHeroPath.tutorTurn}
            </div>
            <div className="path-mini-chips">
              {currentHeroPath.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="path-mini-chip"
                  onClick={onStartLesson}
                  title="Try this in a live lesson"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. VALUE STRIP ── */}
      <div className="stat-strip">
        <div>
          <div className="stat-strip-icon" aria-hidden>
            <Zap size={18} />
          </div>
          <p className="stat-title">Adjusts mid-sentence</p>
          <p className="stat-body">
            Solve a problem quickly and Kindling raises the challenge before
            boredom sets in. Hesitate, and it slows down to check the
            prerequisite step.
          </p>
        </div>
        <div>
          <div className="stat-strip-icon" aria-hidden>
            <Layers size={18} />
          </div>
          <p className="stat-title">Explains it a new way</p>
          <p className="stat-body">
            When an abstract rule doesn&apos;t land, the tutor pivots to a
            visual fraction bar, a real-world story, or a hands-on code trace —
            until it clicks.
          </p>
        </div>
        <div>
          <div className="stat-strip-icon" aria-hidden>
            <BrainCircuit size={18} />
          </div>
          <p className="stat-title">Remembers everything</p>
          <p className="stat-body">
            A persistent learner model tracks mastery, misconceptions, and
            independence across sessions — so you never re-explain what you
            already know.
          </p>
        </div>
      </div>

      {/* ── 3. THE 9:40 PM HOMEWORK MOMENT (CONTRAST SECTION) ── */}
      <div className="section">
        <div className="section-head">
          <p className="eyebrow">Why generic AI falls short</p>
          <h2>Giving the answer is cheap. Teaching through the stuck moment is everything.</h2>
          <p>
            It&apos;s 9:40 PM and a learner is stuck on a tough problem. Here is
            the difference between an answer engine, a static drill app, and a
            Learning Intelligence Platform.
          </p>
        </div>

        <div className="contrast-grid">
          {CONTRAST_ITEMS.map((item) => {
            const isFeatured = item.tone === "featured";
            return (
              <div
                key={item.tag}
                className={`contrast-card${isFeatured ? " featured" : ""}`}
              >
                <div>
                  <span className="contrast-tag">{item.tag}</span>
                  <h3>{item.title}</h3>
                  <p className="contrast-verdict">{item.verdict}</p>
                </div>
                <ul className="contrast-list">
                  {item.points.map((pt) => (
                    <li key={pt}>
                      {isFeatured ? (
                        <CheckCircle2
                          size={16}
                          color="#F3C868"
                          aria-hidden
                        />
                      ) : (
                        <XCircle
                          size={16}
                          color="var(--berry)"
                          aria-hidden
                        />
                      )}
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. INTERACTIVE 4-RUNG HELP LADDER WALKTHROUGH ── */}
      <div className="section" id="live-ladder-demo" style={{ paddingTop: 0 }}>
        <div className="ladder-showcase">
          <div className="ladder-showcase-head">
            <div>
              <p className="eyebrow">Interactive Lesson Walkthrough · L1–L4 Engine</p>
              <h2>When you get stuck, Kindling has a 4-rung rescue plan.</h2>
              <p>
                Click through each rung below to see how Kindling shifts from
                Socratic discovery to graduated scaffolding — and how it proves
                solo mastery before moving on.
              </p>
            </div>
            <button
              type="button"
              className="btn-marigold"
              onClick={onStartLesson}
            >
              {isLoggedIn ? "Open a live lesson" : "Try it live free"}
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>

          <div
            className="ladder-tabs"
            role="tablist"
            aria-label="Graduated help ladder stages"
          >
            {LADDER_STAGES.map((stage) => {
              const active = stage.id === currentLadder.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`ladder-tab${active ? " active" : ""}`}
                  onClick={() => setActiveLadderId(stage.id)}
                >
                  <span className="ladder-tab-rung">{stage.rung}</span>
                  <span className="ladder-tab-badge">{stage.badge}</span>
                </button>
              );
            })}
          </div>

          <div className="ladder-stage-body">
            {/* Left: Simulated Live Lesson Window */}
            <div className="ladder-chat-window">
              <div>
                <div className="ladder-window-bar">
                  <div className="mini-topbar" style={{ marginBottom: 0 }}>
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="ladder-window-status">
                    {currentLadder.rung} · {currentLadder.badge}
                  </span>
                </div>

                <div className="ladder-bubble-student">
                  <strong style={{ color: "var(--pine)", display: "block", fontSize: 11, marginBottom: 3 }}>
                    Student
                  </strong>
                  &ldquo;{currentLadder.studentMsg}&rdquo;
                </div>

                <div className="ladder-bubble-tutor">
                  <strong style={{ color: "var(--marigold-light)", display: "block", fontSize: 11, marginBottom: 4 }}>
                    Kindling Tutor
                  </strong>
                  {currentLadder.tutorMsg}
                </div>

                <LadderVisualPreview
                  visualType={currentLadder.visualType}
                  caption={currentLadder.visualCaption}
                />
              </div>

              <div className="path-mini-chips" style={{ marginTop: 14 }}>
                {currentLadder.chips.map((chip, idx) => (
                  <button
                    key={chip}
                    type="button"
                    className="path-mini-chip"
                    onClick={() => {
                      if (idx === 0 && currentLadderIdx < LADDER_STAGES.length - 1) {
                        setActiveLadderId(LADDER_STAGES[currentLadderIdx + 1].id);
                      } else {
                        onStartLesson();
                      }
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Under-the-Hood Learning Intelligence Inspector */}
            <div className="ladder-inspector">
              <div>
                <p className="eyebrow" style={{ color: "var(--marigold-light)" }}>
                  Under the hood · Learning Intelligence
                </p>
                <h3>{currentLadder.title}</h3>
                <p>{currentLadder.desc}</p>
              </div>

              <div className="telemetry-stack" aria-label="Engine telemetry for this turn">
                <div className="telemetry-row">
                  <span className="telemetry-label">L1 · LearnerState Snapshot</span>
                  <span className="telemetry-val">{currentLadder.telemetry.state}</span>
                </div>
                <div className="telemetry-row">
                  <span className="telemetry-label">Misconception Diagnosis</span>
                  <span className="telemetry-val">
                    {currentLadder.telemetry.misconception}
                  </span>
                </div>
                <div className="telemetry-row">
                  <span className="telemetry-label">L2 · Pedagogical Policy Decision</span>
                  <span className="telemetry-val">{currentLadder.telemetry.policy}</span>
                </div>
                <div className="telemetry-row">
                  <span className="telemetry-label">L3–L4 · Independence & Transfer</span>
                  <span className="telemetry-val">{currentLadder.telemetry.adi}</span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 12, color: "rgba(246,242,233,0.68)" }}>
                  Stage {currentLadderIdx + 1} of {LADDER_STAGES.length} · Learner can exit help anytime
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{
                    padding: "8px 14px",
                    fontSize: 12.5,
                    color: "#F6F2E9",
                    borderColor: "rgba(246,242,233,0.35)",
                  }}
                  onClick={() => {
                    const nextIdx = (currentLadderIdx + 1) % LADDER_STAGES.length;
                    setActiveLadderId(LADDER_STAGES[nextIdx].id);
                  }}
                >
                  Next stage <ArrowRight size={14} aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. HOW THE CLOSED LEARNING LOOP WORKS (4 STEPS) ── */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <p className="eyebrow">A closed learning system</p>
          <h2>Not a script. A conversation backed by learning science.</h2>
          <p>
            Every turn runs through a four-part intelligence loop — estimating
            what you know, selecting the best pedagogical move, adapting live,
            and verifying long-term retention.
          </p>
        </div>

        <div className="flow">
          {FLOW.map(({ Icon, badge, title, body }) => (
            <div className="flow-step" key={title}>
              <div className="flow-step-top">
                <div className="flow-num" style={{ marginBottom: 0 }}>
                  <Icon size={24} color="#1F3A34" strokeWidth={1.7} />
                </div>
                {badge && <span className="flow-badge">{badge}</span>}
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. SUBJECTS & CUSTOM CURRICULUM ── */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div
          className="section-head"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 20,
            flexWrap: "wrap",
            maxWidth: "none",
          }}
        >
          <div>
            <p className="eyebrow">Every core subject + your own</p>
            <h2>One tutor for the whole curriculum.</h2>
            <p style={{ maxWidth: 620 }}>
              Start with our seeded Computer Science pilot, dive into Math,
              Science, Writing, or Languages, or build your own custom subject
              in seconds.
            </p>
          </div>
          <button
            className="btn-ghost"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
            onClick={() => goTo("subjects")}
          >
            Build your own subjects <ArrowRight size={15} />
          </button>
        </div>

        <div className="subject-grid">
          {MARKETING_SUBJECTS.map(({ Icon, bg, tag, title, body, highlights }) => (
            <div className="subject-card" key={title}>
              <div>
                <div className="subject-card-top">
                  <div className="subject-icon" style={{ background: bg }}>
                    <Icon size={20} color="#1F3A34" strokeWidth={1.75} />
                  </div>
                  {tag && <span className="subject-tag">{tag}</span>}
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              {Array.isArray(highlights) && highlights.length > 0 && (
                <ul className="subject-highlights">
                  {highlights.map((h) => (
                    <li key={h}>
                      <CheckCircle2 size={13} aria-hidden />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="custom-subject-callout">
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>
              Studying something specific tonight?
            </p>
            <h3>Bring any syllabus, unit topic, or homework photo.</h3>
            <p>
              Set your familiarity level (&ldquo;Brand new&rdquo; to &ldquo;Exam
              review&rdquo;) and learning goal — Kindling shapes the path on the
              spot.
            </p>
          </div>
          <button className="btn-primary" onClick={() => goTo("subjects")}>
            Explore My Subjects <ArrowRight size={15} aria-hidden />
          </button>
        </div>
      </div>

      {/* ── 7. PLATFORM PILLARS (HOMEWORK PHOTO, VOICE, FAMILY DIGEST, SAFETY) ── */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <p className="eyebrow">Built for real study nights</p>
          <h2>Everything a learner needs. Everything a family trusts.</h2>
          <p>
            From multimodal voice and visual manipulatives to opt-in parent
            digests and age-aware safety guardrails.
          </p>
        </div>

        <div className="pillars-grid">
          {PLATFORM_PILLARS.map(({ Icon, eyebrow, title, body }) => (
            <div className="pillar-card" key={title}>
              <div className="pillar-icon" aria-hidden>
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <div>
                <p className="eyebrow">{eyebrow}</p>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 8. TRANSPARENT PLANS PREVIEW (SPARK · FORGE · EMBER) ── */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="landing-plans-head">
          <div>
            <p className="eyebrow">Simple, honest seat pricing</p>
            <h2>Rent the teaching engine. Bring your keys or use ours.</h2>
            <p style={{ color: "var(--ink-soft)", marginTop: 10, maxWidth: 620, fontSize: 15.5, lineHeight: 1.6 }}>
              Every seat is for one individual learner. Start with a 30-day
              free Spark trial, then pick BYOK (<strong>Forge</strong>) or
              all-inclusive platform AI (<strong>Ember</strong> — about the cost
              of a single hour with a private tutor).
            </p>
          </div>

          <div
            className="billing-toggle"
            role="group"
            aria-label="Billing interval"
          >
            <button
              type="button"
              className={billingCycle === "monthly" ? "active" : ""}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billingCycle === "yearly" ? "active" : ""}
              onClick={() => setBillingCycle("yearly")}
            >
              Yearly (2 months free)
            </button>
          </div>
        </div>

        <div className="plan-grid">
          {PLAN_CATALOG.map((plan) => {
            const isYearly = billingCycle === "yearly";
            const priceDisplay =
              plan.priceMonthly === 0
                ? "$0"
                : isYearly
                ? `$${plan.priceYearly}`
                : `$${plan.priceMonthly}`;
            const priceSub =
              plan.priceMonthly === 0
                ? `${plan.trialDays}-day full trial · no card required`
                : isYearly
                ? `per year ($${(plan.priceYearly / 12).toFixed(
                    plan.priceYearly % 12 === 0 ? 0 : 2
                  )}/mo effective)`
                : "per learner seat / month";

            return (
              <div
                key={plan.id}
                className={`plan-card${plan.highlight ? " highlight" : ""}`}
              >
                {plan.highlight && (
                  <span className="plan-badge">Most popular</span>
                )}
                <div className="plan-card-top">
                  <div className="plan-icon" aria-hidden>
                    <Flame size={18} />
                  </div>
                  <div>
                    <h3>{plan.name}</h3>
                    <p className="plan-tagline">{plan.tagline}</p>
                  </div>
                </div>

                <div className="plan-price">
                  <span className="plan-price-main">{priceDisplay}</span>
                  <span className="plan-price-sub">{priceSub}</span>
                </div>

                <ul className="plan-features">
                  {plan.features.map((feat) => (
                    <li key={feat}>
                      <CheckCircle2 size={15} aria-hidden />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={
                    plan.highlight
                      ? "btn-primary plan-cta"
                      : "btn-ghost plan-cta"
                  }
                  onClick={() => {
                    if (isLoggedIn) {
                      goTo?.("settings");
                    } else {
                      onGetStarted?.();
                    }
                  }}
                >
                  {plan.priceMonthly === 0
                    ? isLoggedIn
                      ? "Manage trial in Settings"
                      : "Start 30-day free trial"
                    : isLoggedIn
                    ? `Choose ${plan.name}`
                    : `Start with ${plan.name}`}
                  <ArrowRight size={14} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 9. STUDENT & PARENT VOICES ── */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <p className="eyebrow">Students & families using Kindling</p>
          <h2>What changes when the tutor doesn&apos;t give up on you.</h2>
        </div>
        <div className="quote-grid">
          {QUOTES.map(({ q, attr, tag, metric }) => (
            <div className="quote-card" key={attr}>
              <div>
                {tag && (
                  <p
                    className="eyebrow"
                    style={{ marginBottom: 10, fontSize: 11 }}
                  >
                    {tag}
                  </p>
                )}
                <p className="q">&ldquo;{q}&rdquo;</p>
              </div>
              <div className="quote-card-meta">
                <p className="quote-attr" style={{ marginTop: 0 }}>
                  {attr}
                </p>
                {metric && <span className="quote-metric">{metric}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 10. FAQ ACCORDION ── */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <p className="eyebrow">Questions & answers</p>
          <h2>Everything you might wonder before your first lesson.</h2>
        </div>

        <div className="faq-list">
          {OVERVIEW_FAQS.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div className="faq-item" key={item.q}>
                <button
                  type="button"
                  className="faq-trigger"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp size={18} aria-hidden />
                  ) : (
                    <ChevronDown size={18} aria-hidden />
                  )}
                </button>
                {isOpen && <div className="faq-answer">{item.a}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 11. FINAL CTA BANNER ── */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="footer-cta">
          <p className="eyebrow" style={{ color: "var(--pine)", opacity: 0.78 }}>
            Start tonight
          </p>
          <h2>A patient 1-on-1 tutor who never gets tired of explaining it a new way.</h2>
          <p>
            Create your student account in 60 seconds, calibrate your grade and
            curriculum, and open your first adaptive lesson.
          </p>
          <div className="hero-actions">
            {isLoggedIn ? (
              <>
                <button className="btn-primary" onClick={onStartLesson}>
                  <Sparkles size={15} aria-hidden />
                  {isOnboarded ? "Open a live lesson" : "Complete profile setup"}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => goTo?.("subjects")}
                >
                  Browse My Subjects
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={onGetStarted}>
                  <Sparkles size={15} aria-hidden />
                  Start 30-day free trial
                </button>
                <button className="btn-ghost" onClick={onOpenLogin}>
                  <LogIn size={15} aria-hidden />
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
