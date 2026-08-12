import { Edit3, ArrowRight, Sparkles, LogIn } from "lucide-react";
import { FLOW, MARKETING_SUBJECTS, QUOTES } from "../../constants/overview";
import MasteryPathSvg from "../charts/MasteryPathSvg";

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
  const possessive =
    studentName === "you" ? "your" : `${studentName}'s`;

  return (
    <section id="overview">
      <div className="hero">
        <div>
          <p className="eyebrow">Your AI tutor, endlessly attentive</p>
          <h1>
            Private-school teaching, <em>tuned</em> to {studentName}, every
            single minute.
          </h1>
          <p className="hero-sub">
            Kindling is an AI tutor that listens to how {studentName === "you" ? "you think" : `${studentName} thinks`}
            , notices where you stall or breeze through, and reshapes the lesson
            in real time
            {isOnboarded && student?.schoolName
              ? ` — calibrated to ${student.schoolName}${student.country ? ` (${student.country})` : ""}.`
              : " — calibrated to your school and curriculum."}
          </p>
          <div className="hero-actions">
            {isLoggedIn ? (
              <>
                <button className="btn-primary" onClick={onStartLesson}>
                  Start a free lesson
                </button>
                <button className="btn-ghost" onClick={onOpenOnboarding}>
                  <Edit3
                    size={15}
                    style={{ marginRight: 6, display: "inline" }}
                  />
                  {isOnboarded ? "Edit your profile" : "Complete your profile"}
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={onGetStarted}>
                  <Sparkles
                    size={15}
                    style={{ marginRight: 6, display: "inline" }}
                  />
                  Get started
                </button>
                <button className="btn-ghost" onClick={onOpenLogin}>
                  <LogIn
                    size={15}
                    style={{ marginRight: 6, display: "inline" }}
                  />
                  Log in
                </button>
              </>
            )}
          </div>
          <div className="hero-note">
            <span className="dot" /> Create your free student account, set up
            your profile, and start learning.
          </div>
        </div>
        <div className="path-card">
          <div className="path-head">
            <p className="eyebrow">Right now, in a lesson</p>
            <h3>
              {possessive.charAt(0).toUpperCase() + possessive.slice(1)} mastery
              path — Fractions
            </h3>
          </div>
          <MasteryPathSvg />
        </div>
      </div>

      <div className="stat-strip">
        <div>
          <p className="stat-title">Adjusts mid-sentence</p>
          <p className="stat-body">
            If you solve a problem instantly, Kindling raises the challenge
            before boredom sets in — no waiting for the next worksheet.
          </p>
        </div>
        <div>
          <p className="stat-title">Explains it a new way</p>
          <p className="stat-body">
            When an explanation doesn&apos;t land, the tutor tries a different
            angle: a picture, a story, a hands-on example — until it clicks.
          </p>
        </div>
        <div>
          <p className="stat-title">Remembers everything</p>
          <p className="stat-body">
            Every session builds on the last, so you never re-explain what you
            know, and never get rushed past what you don&apos;t.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <p className="eyebrow">How a lesson actually works</p>
          <h2>Not a script. A conversation that reshapes itself.</h2>
          <p>
            Most learning apps play back the same lesson to every student.
            Kindling watches, adjusts, and teaches — continuously, inside a
            single conversation.
          </p>
        </div>
        <div className="flow">
          {FLOW.map(({ Icon, title, body }) => (
            <div className="flow-step" key={title}>
              <div className="flow-num">
                <Icon size={26} color="#1F3A34" strokeWidth={1.6} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>

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
            <p className="eyebrow">Every core subject</p>
            <h2>One tutor, the whole curriculum.</h2>
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
          {MARKETING_SUBJECTS.map(({ Icon, bg, title, body }) => (
            <div className="subject-card" key={title}>
              <div className="subject-icon" style={{ background: bg }}>
                <Icon size={19} color="#1F3A34" strokeWidth={1.7} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="section" style={{ paddingTop: 0 }}>
        <div className="preview-banner">
          <div>
            <p className="eyebrow">Inside a lesson</p>
            <h2>This is what a live lesson looks like.</h2>
            <p>
              Every conversation, worked problem, and hint is visible in the
              open. Nothing happens off-screen.
            </p>
            <button
              className="btn-primary open-lesson-btn"
              style={{ marginTop: 22 }}
              onClick={onStartLesson}
            >
              {isLoggedIn ? "Open a live lesson" : "Get started free"}
            </button>
          </div>
          <div className="preview-frame">
            <div className="mini-topbar">
              <span />
              <span />
              <span />
            </div>
            <div
              style={{
                background: "var(--white)",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 12.5,
                marginBottom: 8,
                color: "var(--ink-soft)",
              }}
            >
              &quot;Wait, why do we flip the second fraction?&quot;
            </div>
            <div
              style={{
                background: "var(--pine)",
                color: "var(--parchment)",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 12.5,
              }}
            >
              Good question — let&apos;s see it with pizza slices instead of
              numbers first.
            </div>
          </div>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <p className="eyebrow">Students using Kindling</p>
          <h2>What changes when you learn with Kindling.</h2>
        </div>
        <div className="quote-grid">
          {QUOTES.map(({ q, attr }) => (
            <div className="quote-card" key={attr}>
              <p className="q">&quot;{q}&quot;</p>
              <p className="quote-attr">{attr}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="section" style={{ paddingTop: 0 }}>
        <div className="footer-cta">
          <p className="eyebrow" style={{ color: "var(--pine)", opacity: 0.7 }}>
            Start today
          </p>
          <h2>
            A tutor who never gets tired of explaining it again.
          </h2>
          <p>
            Free student account. Set up your profile, then start your first
            lesson.
          </p>
          <div className="hero-actions">
            {isLoggedIn ? (
              <button className="btn-primary" onClick={onStartLesson}>
                Start a free lesson
              </button>
            ) : (
              <>
                <button className="btn-primary" onClick={onGetStarted}>
                  Get started
                </button>
                <button className="btn-ghost" onClick={onOpenLogin}>
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="kdl-footer">
        <span>
          © 2026 Kindling. Every student, taught like the only one in the room.
        </span>
        <span>Privacy · For students · For schools</span>
      </footer>
    </section>
  );
}
