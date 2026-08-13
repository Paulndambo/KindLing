import { useMemo, useState } from "react";
import {
  X,
  ArrowRight,
  Check,
  CheckCircle,
  Building2,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  AVATAR_OPTIONS,
  GRADE_OPTIONS,
  COUNTRY_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  EMPTY_STUDENT_PROFILE,
  FOCUS_SUBJECT_OPTIONS,
  MAX_INTERESTS,
  MAX_FOCUS_SUBJECTS,
  ONBOARDING_STEPS,
  COUNTRY_CURRICULUM_HINTS,
  isHigherEducation,
  getSchoolTypeOptions,
  getCurriculumOptions,
  getTargetLevelOptions,
  getInterestOptions,
  getGoalOptions,
  getInstitutionLabel,
} from "../../constants/onboarding";

function WhyHint({ children }) {
  return <p className="onboard-why">{children}</p>;
}

export default function OnboardingModal({
  initialProfile,
  onSave,
  onClose,
  isEditMode = false,
  saving = false,
  error = "",
}) {
  const seed = initialProfile || EMPTY_STUDENT_PROFILE;

  const [step, setStep] = useState(1);
  const [name, setName] = useState(seed.name || "");
  const [grade, setGrade] = useState(seed.grade || "");
  const [avatar, setAvatar] = useState(seed.avatar || "sparkles");
  const [country, setCountry] = useState(seed.country || "");
  const [schoolName, setSchoolName] = useState(seed.schoolName || "");
  const [schoolType, setSchoolType] = useState(seed.schoolType || "");
  const [curriculum, setCurriculum] = useState(seed.curriculum || "");
  const [academicTarget, setAcademicTarget] = useState(
    seed.academicTarget || ""
  );
  const [learningStyle, setLearningStyle] = useState(
    seed.learningStyle || "visual"
  );
  const [interests, setInterests] = useState(
    Array.isArray(seed.interests) ? seed.interests : []
  );
  const [focusSubjects, setFocusSubjects] = useState(
    Array.isArray(seed.focusSubjects)
      ? seed.focusSubjects
      : Array.isArray(seed.focus_subjects)
        ? seed.focus_subjects
        : []
  );
  const [goal, setGoal] = useState(seed.goal || "");
  const [customInterest, setCustomInterest] = useState("");
  const [localError, setLocalError] = useState("");

  const higherEd = isHigherEducation(grade);
  const institution = getInstitutionLabel(grade);
  const schoolTypeOptions = useMemo(() => getSchoolTypeOptions(grade), [grade]);
  const curriculumOptions = useMemo(() => getCurriculumOptions(grade), [grade]);
  const targetOptions = useMemo(() => getTargetLevelOptions(grade), [grade]);
  const interestOptions = useMemo(() => getInterestOptions(grade), [grade]);
  const goalOptions = useMemo(() => getGoalOptions(grade), [grade]);

  const countryObj =
    COUNTRY_OPTIONS.find((c) => c.name === country) || null;

  const step1Ready = Boolean(name.trim() && grade);
  const canJumpTo = (n) => n < step || (n === step) || (isEditMode && n <= 5);

  const selectGrade = (nextGrade) => {
    const wasHigher = isHigherEducation(grade);
    const nextHigher = isHigherEducation(nextGrade);
    setGrade(nextGrade);

    if (wasHigher !== nextHigher) {
      setSchoolType("");
      setCurriculum("");
      setAcademicTarget("");
      setGoal("");
      setInterests([]);
    }
  };

  const selectCountry = (nextCountry) => {
    setCountry(nextCountry);
    // Soft-suggest curriculum once if they haven't picked one yet
    if (!curriculum && nextCountry && COUNTRY_CURRICULUM_HINTS[nextCountry]) {
      const hint = COUNTRY_CURRICULUM_HINTS[nextCountry];
      const match = curriculumOptions.find((c) => c.label === hint);
      if (match) setCurriculum(match.label);
    }
  };

  const toggleInterest = (item) => {
    setInterests((prev) => {
      if (prev.includes(item)) return prev.filter((i) => i !== item);
      if (prev.length >= MAX_INTERESTS) return prev;
      return [...prev, item];
    });
  };

  const addCustomInterest = () => {
    const v = customInterest.trim();
    if (!v) return;
    setInterests((prev) => {
      if (prev.includes(v) || prev.length >= MAX_INTERESTS) return prev;
      return [...prev, v];
    });
    setCustomInterest("");
  };

  const toggleFocusSubject = (item) => {
    setFocusSubjects((prev) => {
      if (prev.includes(item)) return prev.filter((i) => i !== item);
      if (prev.length >= MAX_FOCUS_SUBJECTS) return prev;
      return [...prev, item];
    });
  };

  const goNext = () => {
    setLocalError("");
    if (step === 1 && !step1Ready) {
      setLocalError(
        !name.trim()
          ? "Please enter your name."
          : "Please pick your grade or level of study."
      );
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const goBack = () => {
    setLocalError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const handleFinish = async () => {
    setLocalError("");
    if (!name.trim()) {
      setLocalError("Please enter your name.");
      setStep(1);
      return;
    }
    if (!grade) {
      setLocalError("Please pick your grade or level of study.");
      setStep(1);
      return;
    }
    try {
      await onSave({
        name: name.trim(),
        grade: grade || "",
        avatar,
        country: country || "",
        countryFlag: countryObj?.flag || "",
        schoolName: schoolName.trim(),
        schoolType: schoolType || "",
        curriculum: curriculum || "",
        academicTarget: academicTarget || "",
        learningStyle: learningStyle || "visual",
        interests,
        focusSubjects,
        goal: goal || "",
        isOnboarded: true,
      });
    } catch (err) {
      setLocalError(
        err?.message || "Could not save profile. Please try again."
      );
    }
  };

  const displayError = localError || error;
  const displayName = name.trim() || "you";
  const styleLabel =
    LEARNING_STYLE_OPTIONS.find((s) => s.id === learningStyle)?.label ||
    learningStyle;

  const onKeyContinue = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (step < 5) goNext();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={isEditMode ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboard-title"
    >
      <div className="wizard-card" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-top">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="eyebrow">
              {isEditMode ? "Edit profile" : "Welcome to Kindling"}
            </span>
            <span className="wizard-step-count">
              Step {step} of {ONBOARDING_STEPS.length}
            </span>
          </div>
          {isEditMode && (
            <button className="icon-x" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          )}
        </div>

        <div
          className="wizard-progress"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-label={`Onboarding step ${step} of 5`}
        >
          <div
            className="wizard-progress-fill"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        <div className="wizard-step-dots" aria-hidden="true">
          {ONBOARDING_STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`wizard-step-dot${step === s.id ? " active" : ""}${
                step > s.id ? " done" : ""
              }`}
              disabled={!canJumpTo(s.id) || step === s.id}
              onClick={() => canJumpTo(s.id) && setStep(s.id)}
              title={s.short}
            >
              <span className="wizard-step-dot-num">
                {step > s.id ? <Check size={12} /> : s.id}
              </span>
              <span className="wizard-step-dot-label">{s.label}</span>
            </button>
          ))}
        </div>

        {step === 1 && (
          <div>
            <h3 id="onboard-title">Who&apos;s learning?</h3>
            <p className="modal-sub">
              A few basics so Kindling can greet you properly and teach at the
              right level.
            </p>
            <WhyHint>
              Grade matters for age-appropriate language and safety. You can
              change anything later.
            </WhyHint>

            <div className="field-block">
              <span className="field-label">
                Your name <span className="req-star">*</span>
              </span>
              <input
                className="modal-input"
                placeholder="e.g. Alex, Sam, Jordan"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={onKeyContinue}
              />
            </div>

            <div className="field-block">
              <span className="field-label">
                Grade / level of study <span className="req-star">*</span>
              </span>
              <div className="grade-grid">
                {GRADE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`grade-pill ${grade === g ? "selected" : ""}`}
                    onClick={() => selectGrade(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {higherEd && (
                <p className="field-hint">
                  Higher education selected — curriculum and interests will
                  adapt for university / college.
                </p>
              )}
            </div>

            <div className="field-block" style={{ marginBottom: 0 }}>
              <span className="field-label">Choose an avatar</span>
              <div className="avatar-grid">
                {AVATAR_OPTIONS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`avatar-btn ${avatar === id ? "selected" : ""}`}
                    onClick={() => setAvatar(id)}
                  >
                    <Icon
                      size={20}
                      color={avatar === id ? "#3E8A8F" : "#1F3A34"}
                    />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {displayError && step === 1 ? (
              <p className="onboard-error">{displayError}</p>
            ) : null}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={!step1Ready}
                onClick={goNext}
              >
                Continue{" "}
                <ArrowRight
                  size={15}
                  style={{ marginLeft: 6, display: "inline" }}
                />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 id="onboard-title">
              Where do you learn?
            </h3>
            <p className="modal-sub">
              Optional — helps Kindling match spelling, examples, and{" "}
              {institution} context.
            </p>
            <WhyHint>
              Skip anything you&apos;re unsure about. Country is the most useful
              signal if you only pick one.
            </WhyHint>

            <div className="field-block">
              <span className="field-label">Country</span>
              <select
                className="modal-input"
                style={{ cursor: "pointer" }}
                value={country}
                onChange={(e) => selectCountry(e.target.value)}
              >
                <option value="">Select a country…</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <span className="field-label">
                {higherEd
                  ? "University / college name (optional)"
                  : "School name (optional)"}
              </span>
              <input
                className="modal-input"
                placeholder={
                  higherEd
                    ? "e.g. State University, Community College"
                    : "e.g. Lincoln Middle School, Homeschool"
                }
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                onKeyDown={onKeyContinue}
              />
            </div>

            <div className="field-block">
              <span className="field-label">
                {higherEd
                  ? "Degree / programme track (optional)"
                  : "Educational curriculum (optional)"}
              </span>
              {country && curriculum && COUNTRY_CURRICULUM_HINTS[country] === curriculum ? (
                <p className="field-hint" style={{ marginTop: 0 }}>
                  Suggested from your country — change anytime.
                </p>
              ) : null}
              <div className="onboard-scroll-list">
                {curriculumOptions.map((cur) => (
                  <button
                    key={cur.id}
                    type="button"
                    className={`goal-card ${curriculum === cur.label ? "selected" : ""}`}
                    style={{ margin: 0 }}
                    onClick={() =>
                      setCurriculum((prev) =>
                        prev === cur.label ? "" : cur.label
                      )
                    }
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                        {cur.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--ink-soft)",
                          fontWeight: 400,
                        }}
                      >
                        {cur.desc}
                      </div>
                    </div>
                    {curriculum === cur.label && (
                      <Check size={16} color="#3E8A8F" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-block" style={{ marginBottom: 0 }}>
              <span className="field-label">
                {higherEd ? "Institution type (optional)" : "School type (optional)"}
              </span>
              <div className="grade-grid">
                {schoolTypeOptions.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`grade-pill ${schoolType === st ? "selected" : ""}`}
                    onClick={() =>
                      setSchoolType((prev) => (prev === st ? "" : st))
                    }
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={goBack}>
                Back
              </button>
              <button type="button" className="btn-ghost" onClick={goNext}>
                Skip for now
              </button>
              <button type="button" className="btn-primary" onClick={goNext}>
                Continue{" "}
                <ArrowRight
                  size={15}
                  style={{ marginLeft: 6, display: "inline" }}
                />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 id="onboard-title">What should we focus on?</h3>
            <p className="modal-sub">
              Tell Kindling what success looks like and which subjects matter
              most right now.
            </p>
            <WhyHint>
              Focus subjects shape early lessons and suggestions. Pick any mix —
              Kindling is not limited to one subject.
            </WhyHint>

            <div className="field-block">
              <span className="field-label">
                Subjects you want help with{" "}
                <span className="field-label-meta">
                  up to {MAX_FOCUS_SUBJECTS}
                </span>
              </span>
              <div className="interest-chips">
                {FOCUS_SUBJECT_OPTIONS.map((item) => {
                  const sel = focusSubjects.includes(item);
                  const blocked =
                    !sel && focusSubjects.length >= MAX_FOCUS_SUBJECTS;
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`interest-chip focus-chip ${sel ? "selected" : ""}`}
                      disabled={blocked}
                      onClick={() => toggleFocusSubject(item)}
                    >
                      {item} {sel ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field-block">
              <span className="field-label">
                {higherEd ? "Academic ambition (optional)" : "Academic target (optional)"}
              </span>
              <div className="style-grid">
                {targetOptions.map((tgt) => (
                  <button
                    key={tgt.id}
                    type="button"
                    className={`style-card ${academicTarget === tgt.label ? "selected" : ""}`}
                    onClick={() =>
                      setAcademicTarget((prev) =>
                        prev === tgt.label ? "" : tgt.label
                      )
                    }
                  >
                    <h4>{tgt.label}</h4>
                    <p>{tgt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-block" style={{ marginBottom: 0 }}>
              <span className="field-label">Primary learning goal (optional)</span>
              <div className="grade-grid">
                {goalOptions.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`grade-pill ${goal === g ? "selected" : ""}`}
                    onClick={() => setGoal((prev) => (prev === g ? "" : g))}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={goBack}>
                Back
              </button>
              <button type="button" className="btn-ghost" onClick={goNext}>
                Skip for now
              </button>
              <button type="button" className="btn-primary" onClick={goNext}>
                Continue{" "}
                <ArrowRight
                  size={15}
                  style={{ marginLeft: 6, display: "inline" }}
                />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 id="onboard-title">How do you learn best?</h3>
            <p className="modal-sub">
              Kindling will weave your style and interests into examples — across
              every subject you study.
            </p>
            <WhyHint>
              Interests make explanations stick (e.g. sports analogies). You can
              pick up to {MAX_INTERESTS}.
            </WhyHint>

            <div className="field-block">
              <span className="field-label">Preferred learning style</span>
              <div className="style-grid">
                {LEARNING_STYLE_OPTIONS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className={`style-card ${learningStyle === st.id ? "selected" : ""}`}
                    onClick={() => setLearningStyle(st.id)}
                  >
                    <h4>{st.label}</h4>
                    <p>{st.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-block" style={{ marginBottom: 0 }}>
              <span className="field-label">
                {higherEd
                  ? "Fields & passions"
                  : "Passions & interests"}{" "}
                <span className="field-label-meta">
                  {interests.length}/{MAX_INTERESTS}
                </span>
              </span>
              <div className="interest-chips">
                {interestOptions.map((item) => {
                  const sel = interests.includes(item);
                  const blocked = !sel && interests.length >= MAX_INTERESTS;
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`interest-chip ${sel ? "selected" : ""}`}
                      disabled={blocked}
                      onClick={() => toggleInterest(item)}
                    >
                      {item} {sel ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
              <div className="custom-interest-row">
                <input
                  className="modal-input"
                  placeholder="Add your own interest…"
                  value={customInterest}
                  disabled={interests.length >= MAX_INTERESTS}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomInterest();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost custom-interest-add"
                  disabled={
                    !customInterest.trim() || interests.length >= MAX_INTERESTS
                  }
                  onClick={addCustomInterest}
                  aria-label="Add custom interest"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={goBack}>
                Back
              </button>
              <button type="button" className="btn-primary" onClick={goNext}>
                Review{" "}
                <ArrowRight
                  size={15}
                  style={{ marginLeft: 6, display: "inline" }}
                />
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 id="onboard-title">You&apos;re ready, {displayName}!</h3>
            <p className="modal-sub">
              Here&apos;s how Kindling will show up for you. Next up: add a
              subject and start a lesson.
            </p>

            <div className="tutor-preview-card">
              <h4>
                <Sparkles size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Your tutor intro
              </h4>
              <p>
                &quot;Hi{name.trim() ? ` ${name.trim()}` : ""} — I&apos;m
                Kindling. I&apos;ll teach at a{" "}
                <strong>{grade || "comfortable"}</strong> level
                {curriculum ? (
                  <>
                    {" "}
                    using <strong>{curriculum}</strong>
                  </>
                ) : null}
                {country ? (
                  <>
                    {" "}
                    in <strong>
                      {country}
                      {countryObj?.flag ? ` ${countryObj.flag}` : ""}
                    </strong>
                  </>
                ) : null}
                {focusSubjects.length > 0 ? (
                  <>
                    , with extra care for{" "}
                    <strong>{focusSubjects.join(", ")}</strong>
                  </>
                ) : null}
                {interests.length > 0 ? (
                  <>
                    , and examples from{" "}
                    <strong>{interests.slice(0, 3).join(", ")}</strong>
                  </>
                ) : null}
                . When you&apos;re stuck, I&apos;ll guide you — not just hand
                over the answer.&quot;
              </p>
            </div>

            <div className="academic-card" style={{ margin: "16px 0" }}>
              <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>
                <Building2 size={15} /> Your profile snapshot
              </h4>
              <div className="academic-grid">
                <div className="academic-item">
                  <b>Name &amp; level</b>
                  <span>
                    {name.trim() || "—"}
                    {grade ? ` · ${grade}` : ""}
                  </span>
                </div>
                <div className="academic-item">
                  <b>Focus subjects</b>
                  <span>
                    {focusSubjects.length
                      ? focusSubjects.join(", ")
                      : "Any subject you add"}
                  </span>
                </div>
                <div className="academic-item">
                  <b>
                    {higherEd ? "Programme" : "Curriculum"} &amp; target
                  </b>
                  <span>
                    {curriculum || "Not set"}
                    {academicTarget ? ` · ${academicTarget}` : ""}
                  </span>
                </div>
                <div className="academic-item">
                  <b>Style &amp; goal</b>
                  <span>
                    {styleLabel}
                    {goal ? ` · ${goal}` : ""}
                  </span>
                </div>
                <div className="academic-item">
                  <b>Location</b>
                  <span>
                    {countryObj?.flag ? `${countryObj.flag} ` : ""}
                    {country || "—"}
                    {schoolName ? ` · ${schoolName}` : ""}
                  </span>
                </div>
                <div className="academic-item">
                  <b>Interests</b>
                  <span>
                    {interests.length ? interests.join(", ") : "—"}
                  </span>
                </div>
              </div>
            </div>

            {displayError && (
              <p className="onboard-error">{displayError}</p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={goBack}
                disabled={saving}
              >
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      style={{
                        marginRight: 6,
                        display: "inline",
                        verticalAlign: "middle",
                      }}
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle
                      size={16}
                      style={{ marginRight: 6, display: "inline" }}
                    />{" "}
                    {isEditMode ? "Save changes" : "Start learning"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}