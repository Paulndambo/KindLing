import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  FlaskConical,
  GraduationCap,
  Layers3,
  Lightbulb,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { PLAN_CATALOG } from "../../constants/subscription";
import "../../styles/overview-rebuilt.css";

const DEMOS = [
  {
    id: "math",
    label: "Mathematics",
    Icon: Plus,
    topic: "Making sense of fractions",
    unit: "Fractions & proportions",
    question: "Why is ⅓ bigger than ¼ if 4 is the bigger number?",
    reply:
      "A bigger denominator means more pieces, but each piece is smaller. Let’s look at the same whole, shared two different ways.",
    hint: "Imagine sharing one pizza between 3 friends, then between 4. Which group gets a larger slice?",
    takeaway: "More pieces. Smaller shares.",
  },
  {
    id: "science",
    label: "Science",
    Icon: FlaskConical,
    topic: "Understanding motion",
    unit: "Forces & motion",
    question: "Does a puck need a force to keep sliding on ice?",
    reply:
      "A force changes motion. Without friction, a moving puck keeps its speed and direction. Let’s separate motion from a change in motion.",
    hint: "Once the stick stops touching the puck, what is still pushing it? Think about what would make it slow down.",
    takeaway: "A force changes motion.",
  },
  {
    id: "code",
    label: "Computer science",
    Icon: Code2,
    topic: "Thinking through a loop",
    unit: "Python fundamentals",
    question: "Why does my while loop keep running forever?",
    reply:
      "Let’s trace the value of count. The loop checks the same condition each time, so count needs to change inside the loop.",
    hint: "What is the value of count after the first pass? If it is still 1, will count < 4 ever become false?",
    takeaway: "Small changes. Clearer logic.",
  },
];
const FAQS = [
  [
    "What can I study with Kindling?",
    "Start with mathematics, science, computing, writing, or a subject of your own. Add your topics and learning goals so the tutor can work at your level.",
  ],
  [
    "What happens when I get stuck?",
    "Ask for a hint, explore a worked example, or break the problem into smaller steps. Kindling adjusts its support so you can work toward solving a similar problem independently.",
  ],
  [
    "Can I bring my own homework?",
    "Yes. You can upload a photo or PDF of a problem and work through it with the tutor. The focus is on understanding the steps and the ideas behind them.",
  ],
  [
    "What is included in the free Spark plan?",
    "Spark is free and includes the adaptive tutor with platform AI, subject to daily usage limits. Premium adds a larger AI allowance, every provider, advanced routing, homework photo help, and guardian digests. Each account is for one learner.",
  ],
];

function LessonPreview({ onStartLesson }) {
  const [selected, setSelected] = useState("math");
  const [hint, setHint] = useState(false);
  const demo = DEMOS.find((item) => item.id === selected);
  return (
    <div className="rl-preview-stage">
      <div className="rl-preview-caption">
        <span className="rl-status-dot" /> A little clarity, in real time{" "}
        <span>PRODUCT PREVIEW</span>
      </div>
      <div className="rl-workspace">
        <div className="rl-window-bar">
          <div className="rl-window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>kindling / learning space</span>
          <ShieldCheck size={13} />
        </div>
        <div className="rl-preview-body">
          <aside className="rl-preview-rail" aria-label="Preview subjects">
            <div className="rl-rail-label">YOUR SUBJECTS</div>
            {DEMOS.map(({ id, label, Icon }) => (
              <button
                type="button"
                key={id}
                aria-pressed={selected === id}
                className={selected === id ? "selected" : ""}
                onClick={() => {
                  setSelected(id);
                  setHint(false);
                }}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
            <div className="rl-rail-bottom">
              <span className="rl-small-avatar">A</span>
              <span>
                Your learning space<small>One step at a time</small>
              </span>
            </div>
          </aside>
          <div className="rl-preview-lesson" aria-live="polite">
            <div className="rl-lesson-breadcrumb">
              {demo.label}
              <span>/</span>Guided practice
            </div>
            <div className="rl-lesson-title">
              <h3>{demo.topic}</h3>
              <span>
                <i /> In progress
              </span>
            </div>
            <div className="rl-student-message">{demo.question}</div>
            <div className="rl-tutor-identity">
              <span>
                <Sparkles size={13} />
              </span>
              Kindling <small>Your personal tutor</small>
            </div>
            <p className="rl-tutor-reply">{hint ? demo.hint : demo.reply}</p>
            <div className="rl-concept-visual">
              {selected === "math" ? (
                <>
                  <div className="rl-fraction-row">
                    <span>⅓</span>
                    <div>
                      {[0, 1, 2].map((n) => (
                        <i className={n === 0 ? "filled" : ""} key={n} />
                      ))}
                    </div>
                  </div>
                  <div className="rl-fraction-row">
                    <span>¼</span>
                    <div>
                      {[0, 1, 2, 3].map((n) => (
                        <i className={n === 0 ? "filled" : ""} key={n} />
                      ))}
                    </div>
                  </div>
                </>
              ) : selected === "code" ? (
                <pre>
                  <code>
                    <span>count = 1</span>
                    {"\n"}while count &lt; 4:{"\n"} print(count){"\n"}
                    <b> count += 1</b>
                  </code>
                </pre>
              ) : (
                <div className="rl-force-visual">
                  <span className="rl-puck" />
                  <span className="rl-motion-line" />
                  <ArrowRight size={30} />
                  <span>
                    Constant velocity
                    <br />
                    <strong>Net force = 0</strong>
                  </span>
                </div>
              )}
              <p>
                <Lightbulb size={13} />
                {demo.takeaway}
              </p>
            </div>
            <div className="rl-demo-actions">
              <button type="button" onClick={() => setHint(!hint)}>
                <Lightbulb size={13} />
                {hint ? "Back to explanation" : "Give me a hint"}
              </button>
              <button type="button" onClick={onStartLesson}>
                Let me try <ArrowUpRight size={13} />
              </button>
            </div>
            <button
              type="button"
              className="rl-preview-composer"
              onClick={onStartLesson}
            >
              <span>Ask a question, explore an idea…</span>
              <span>
                <Send size={14} />
              </span>
            </button>
          </div>
        </div>
      </div>
      <div className="rl-preview-footnote">
        <CheckCircle2 size={14} /> Built for the moment it starts to click.
        <span>Illustrative lesson</span>
      </div>
    </div>
  );
}

export default function Overview({
  goTo,
  student,
  isLoggedIn = false,
  onOpenOnboarding,
  onGetStarted,
  onStartLesson,
}) {
  const [annual, setAnnual] = useState(false);
  const start = isLoggedIn ? onStartLesson : onGetStarted;
  return (
    <section id="overview" className="rl-landing">
      <div className="rl-hero rl-container">
        <div className="rl-hero-copy">
          <div className="rl-kicker">
            <span /> A more thoughtful way to learn
          </div>
          <h1>
            Big ideas.
            <br />
            Small steps.
            <br />
            <span>Real understanding.</span>
          </h1>
          <p>
            A personal AI tutor that meets you where you are. Work through the
            hard parts, connect the dots, and build the confidence to do it
            yourself.
          </p>
          <div className="rl-hero-actions">
            <button
              type="button"
              className="rl-button rl-button-dark"
              onClick={start}
            >
              {isLoggedIn
                ? `Keep learning${student?.name ? `, ${student.name}` : ""}`
                : "Start learning free"}
              <ArrowRight size={17} />
            </button>
            <a className="rl-text-link" href="#learning-method">
              Explore how it works <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="rl-trial-note">
            <Check size={14} />
            Free plan<span>·</span>No credit card needed
          </div>
          {isLoggedIn && (
            <div className="rl-account-links">
              <button type="button" onClick={() => goTo("dashboard")}>
                Open dashboard <ArrowRight size={13} />
              </button>
              <button type="button" onClick={onOpenOnboarding}>
                Your learning profile
              </button>
            </div>
          )}
        </div>
        <LessonPreview onStartLesson={onStartLesson} />
      </div>

      <div className="rl-subject-band">
        <div className="rl-container">
          <span>ROOM FOR EVERY KIND OF CURIOSITY</span>
          <div>
            <span>
              <Plus size={17} /> Mathematics
            </span>
            <span>
              <FlaskConical size={17} /> Science
            </span>
            <span>
              <Code2 size={17} /> Computing
            </span>
            <span>
              <BookOpen size={17} /> Writing
            </span>
            <span>
              <Sparkles size={17} /> Your next big interest
            </span>
          </div>
        </div>
      </div>

      <div className="rl-container rl-section" id="learning-method">
        <div className="rl-section-heading">
          <div>
            <p className="rl-overline">BUILT FOR THE WAY YOU THINK</p>
            <h2>
              Less “here’s the answer.”
              <br />
              More “now I get it.”
            </h2>
          </div>
          <p>
            Good learning isn’t a straight line. Kindling gives you structure,
            room to ask questions, and support that changes with you.
          </p>
        </div>
        <div className="rl-bento">
          <article className="rl-feature rl-feature-dark">
            <div className="rl-feature-top">
              <span className="rl-icon-box">
                <Layers3 size={20} />
              </span>
              <span>01 / ADAPTIVE SUPPORT</span>
            </div>
            <h3>
              The right nudge.
              <br />
              At the right moment.
            </h3>
            <p>
              A hint when you’re close. A new explanation when you’re stuck. A
              step back when you need a stronger foundation.
            </p>
            <div className="rl-support-ladder">
              {[
                "A focused hint",
                "A worked example",
                "A step-by-step guide",
              ].map((label, i) => (
                <div key={label}>
                  <span>0{i + 1}</span>
                  {label}
                  <Check size={14} />
                </div>
              ))}
            </div>
          </article>
          <article className="rl-feature rl-feature-progress">
            <div className="rl-feature-top">
              <span className="rl-icon-box">
                <TrendingUp size={20} />
              </span>
              <span>02 / MEANINGFUL PROGRESS</span>
            </div>
            <h3>See the bigger picture.</h3>
            <p>
              Your subjects, sessions, and growing understanding. A clear view
              of where you are and what comes next.
            </p>
            <div
              className="rl-progress-art"
              aria-label="Illustration of a learning path"
            >
              <div>
                <Check size={14} />
                <span>Explore</span>
              </div>
              <i />
              <div>
                <Check size={14} />
                <span>Practice</span>
              </div>
              <i />
              <div className="current">
                <Target size={16} />
                <span>Understand</span>
              </div>
            </div>
            <span className="rl-art-caption">
              Every small step has a place.
            </span>
          </article>
          <article className="rl-feature rl-feature-question">
            <div className="rl-feature-top">
              <span className="rl-icon-box">
                <MessageSquare size={20} />
              </span>
              <span>03 / SPACE TO ASK</span>
            </div>
            <h3>Every question belongs here.</h3>
            <p>
              Bring your homework, an unfinished thought, or the question you
              didn’t ask in class. Start there.
            </p>
            <div className="rl-question-art">
              <span>“Can you explain that another way?”</span>
              <span>
                <Sparkles size={14} /> Of course. Let’s try something visual.
              </span>
            </div>
          </article>
        </div>
      </div>

      <div className="rl-method-section">
        <div className="rl-container rl-method-grid">
          <div>
            <p className="rl-overline">FROM CURIOUS TO CONFIDENT</p>
            <h2>
              Your next breakthrough
              <br />
              starts with one question.
            </h2>
            <p className="rl-method-intro">
              No perfect starting point required. Just something you want to
              understand.
            </p>
            <button type="button" className="rl-text-link" onClick={start}>
              Find your starting point <ArrowRight size={17} />
            </button>
          </div>
          <ol className="rl-steps">
            {[
              [
                "Make it yours",
                "Choose a subject, add a topic, or bring a homework problem. Set your level and tell Kindling what you’re working toward.",
              ],
              [
                "Think it through together",
                "Ask questions, try an approach, and explore explanations. Your tutor adjusts the pace and support as you go.",
              ],
              [
                "Take the next step",
                "Put the idea into practice. Revisit what needs work and follow your progress in your learning dashboard.",
              ],
            ].map(([title, body], i) => (
              <li key={title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="rl-container rl-section" id="explore-subjects">
        <div className="rl-section-heading">
          <div>
            <p className="rl-overline">FOLLOW YOUR CURIOSITY</p>
            <h2>
              One learning space.
              <br />A world of possibilities.
            </h2>
          </div>
          <button
            type="button"
            className="rl-text-link"
            onClick={() => goTo("subjects")}
          >
            Explore your subjects <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="rl-subject-grid">
          {[
            [
              Plus,
              "01",
              "Mathematics",
              "Find the logic behind the numbers.",
              "Fractions · Algebra · Geometry",
            ],
            [
              FlaskConical,
              "02",
              "Science",
              "Make sense of how the world works.",
              "Physics · Chemistry · Biology",
            ],
            [
              Code2,
              "03",
              "Computer science",
              "Build the thinking behind the code.",
              "Programming · Logic · Algorithms",
            ],
            [
              BookOpen,
              "04",
              "Writing & more",
              "Find your voice. Explore a new idea.",
              "Writing · Languages · Custom topics",
            ],
          ].map(([Icon, num, title, body, topics]) => (
            <button
              type="button"
              key={title}
              className="rl-subject-tile"
              onClick={() => goTo("subjects")}
            >
              <div>
                <Icon size={26} strokeWidth={1.5} />
                <span>{num}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
              <footer>
                <span>{topics}</span>
                <ArrowUpRight size={18} />
              </footer>
            </button>
          ))}
        </div>
      </div>

      <div className="rl-pricing-section" id="learning-plans">
        <div className="rl-container rl-section">
          <div className="rl-section-heading">
            <div>
              <p className="rl-overline">INVEST IN YOUR UNDERSTANDING</p>
              <h2>
                A small start.
                <br />
                Room to grow.
              </h2>
            </div>
            <div>
              <p>
                Start free and find your rhythm.
                <br />
                Then choose the setup that works for you.
              </p>
              <div className="rl-billing" aria-label="Billing period">
                <button
                  type="button"
                  aria-pressed={!annual}
                  onClick={() => setAnnual(false)}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  aria-pressed={annual}
                  onClick={() => setAnnual(true)}
                >
                  Yearly <span>Save 2 months</span>
                </button>
              </div>
            </div>
          </div>
          <div className="rl-plan-grid">
            {PLAN_CATALOG.map((plan) => (
              <article
                key={plan.id}
                className={`rl-plan${plan.highlight ? " rl-plan-featured" : ""}`}
              >
                <div className="rl-plan-title">
                  <h3>{plan.name}</h3>
                  {plan.highlight && <span>AI included</span>}
                </div>
                <p className="rl-plan-description">
                  {plan.id === "spark"
                    ? "Your first step toward something clicking."
                    : "A complete learning space with more AI and advanced tools."}
                </p>
                <div className="rl-price">
                  {plan.priceMonthly === 0
                    ? "Free"
                    : "$" + (annual ? plan.priceYearly : plan.priceMonthly)}
                  <span>
                    {plan.id === "spark" ? "" : annual ? "/ year" : "/ month"}
                  </span>
                </div>
                <button
                  type="button"
                  className={`rl-button ${plan.highlight ? "rl-button-dark" : "rl-button-outline"}`}
                  onClick={isLoggedIn ? () => goTo("settings") : onGetStarted}
                >
                  {plan.id === "spark"
                    ? "Start for free"
                    : `Explore ${plan.name}`}
                  <ArrowRight size={15} />
                </button>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={14} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="rl-pricing-note">
            <ShieldCheck size={14} />
            One account per learner. Platform AI is subject to daily usage
            limits.
          </p>
        </div>
      </div>

      <div className="rl-container rl-section rl-faq-section">
        <div>
          <p className="rl-overline">A LITTLE MORE CLARITY</p>
          <h2>
            Good questions.
            <br />
            Straight answers.
          </h2>
          <p>Getting started should feel simple.</p>
        </div>
        <div className="rl-faq-list">
          {FAQS.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <ChevronDown size={17} />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
      <div className="rl-container">
        <div className="rl-final-cta">
          <div>
            <span className="rl-cta-icon">
              <GraduationCap size={27} strokeWidth={1.5} />
            </span>
            <p className="rl-overline">THERE’S A NEXT STEP FOR EVERY LEARNER</p>
            <h2>Let’s make it click.</h2>
            <p>Your questions. Your pace. Your next breakthrough.</p>
          </div>
          <button
            type="button"
            className="rl-button rl-button-light"
            onClick={start}
          >
            {isLoggedIn ? "Continue learning" : "Start learning free"}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
