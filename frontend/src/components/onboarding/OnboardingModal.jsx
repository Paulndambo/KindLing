import { useMemo, useState } from "react";
import {
  X,
  ArrowRight,
  Check,
  CheckCircle,
  Loader2,
  Plus,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import {
  AVATAR_OPTIONS,
  GRADE_OPTIONS,
  COUNTRY_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  EMPTY_STUDENT_PROFILE,
  MAX_INTERESTS,
  ONBOARDING_STEPS,
  COUNTRY_CURRICULUM_HINTS,
  isHigherEducation,
  getCurriculumOptions,
  getInterestOptions,
  getGoalOptions,
  normalizeProgrammeTrack,
} from "../../constants/onboarding";
import { ageFromDateOfBirth, localDateValue } from "../../utils/learner-age";

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
  const [grade, setGrade] = useState(seed.grade === "Graduate / Master's" ? "Masters" : seed.grade || "");
  const [dateOfBirth, setDateOfBirth] = useState(seed.dateOfBirth || "");
  const age = ageFromDateOfBirth(dateOfBirth);
  const [avatar, setAvatar] = useState(seed.avatar || "sparkles");
  const [country, setCountry] = useState(seed.country || "");
  const [preferredLanguage, setPreferredLanguage] = useState(
    seed.preferredLanguage || ""
  );
  const [schoolName, setSchoolName] = useState(seed.schoolName || "");
  const [curriculum, setCurriculum] = useState(normalizeProgrammeTrack(seed.curriculum || ""));
  const [learningStyle, setLearningStyle] = useState(
    seed.learningStyle || "visual"
  );
  const [interests, setInterests] = useState(
    Array.isArray(seed.interests) ? seed.interests : []
  );
  const [goal, setGoal] = useState(seed.goal || "");
  const [customInterest, setCustomInterest] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(
    Boolean(seed.country || seed.curriculum || seed.preferredLanguage || seed.schoolName)
  );
  const [localError, setLocalError] = useState("");

  // Preserve any existing legacy fields so editing a profile never wipes them
  const preservedSchoolType = seed.schoolType || "";
  const preservedAcademicTarget = seed.academicTarget || "";
  const preservedFocusSubjects = Array.isArray(seed.focusSubjects)
    ? seed.focusSubjects
    : Array.isArray(seed.focus_subjects)
      ? seed.focus_subjects
      : [];

  const totalSteps = ONBOARDING_STEPS.length;
  const higherEd = isHigherEducation(grade);
  const curriculumOptions = useMemo(() => {
    const options = getCurriculumOptions(grade);
    return curriculum && !options.some((item) => item.label === curriculum)
      ? [...options, { id: 'previous', label: curriculum, desc: 'Your previous selection' }] : options;
  }, [grade, curriculum]);
  const interestOptions = useMemo(() => getInterestOptions(grade), [grade]);
  const goalOptions = useMemo(() => {
    const options = getGoalOptions(grade);
    return goal && !options.includes(goal) ? [...options, goal] : options;
  }, [grade, goal]);

  const countryObj =
    COUNTRY_OPTIONS.find((c) => c.name === country) || null;

  const step1Ready = Boolean(name.trim() && grade && (!dateOfBirth || age !== null));
  const canJumpTo = (n) => n < step || n === step || (isEditMode && n <= totalSteps);

  const selectGrade = (nextGrade) => {
    const wasHigher = isHigherEducation(grade);
    const nextHigher = isHigherEducation(nextGrade);
    setGrade(nextGrade);

    if (wasHigher !== nextHigher) {
      setCurriculum("");
      setGoal("");
      setInterests([]);
    }
  };

  const selectCountry = (nextCountry) => {
    setCountry(nextCountry);
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

  const goNext = () => {
    setLocalError("");
    if (step === 1 && !step1Ready) {
      setLocalError(
        !name.trim()
          ? "Please enter your name."
          : !grade ? "Please pick your grade or level of study." : "Enter a valid date of birth."
      );
      return;
    }
    setStep((s) => Math.min(totalSteps, s + 1));
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
    if (dateOfBirth && age === null) {
      setLocalError("Enter a valid date of birth within the past 120 years.");
      setStep(1);
      return;
    }
    try {
      await onSave({
        name: name.trim(),
        dateOfBirth: dateOfBirth || null,
        grade: grade || "",
        avatar,
        country: country || "",
        countryFlag: countryObj?.flag || "",
        preferredLanguage: preferredLanguage.trim(),
        schoolName: schoolName.trim(),
        schoolType: preservedSchoolType,
        curriculum: curriculum || "",
        academicTarget: preservedAcademicTarget,
        learningStyle: learningStyle || "visual",
        interests,
        focusSubjects: preservedFocusSubjects,
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

  const onKeyContinue = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (step < totalSteps) goNext();
      else handleFinish();
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
      <div
        className="wizard-card wizard-card--lean"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wizard-top">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="eyebrow">
              {isEditMode ? "Edit profile" : "Quick setup"}
            </span>
            <span className="wizard-step-count">
              Step {step} of {totalSteps}
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
          aria-valuemax={totalSteps}
          aria-label={`Onboarding step ${step} of ${totalSteps}`}
        >
          <div
            className="wizard-progress-fill"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="wizard-step-dots wizard-step-dots--lean" aria-hidden="true">
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
              Your name, study level, and optional date of birth help Kindling pitch explanations right.
            </p>

            <div className="field-block">
              <label className="field-label" htmlFor="onboard-name-input">
                Your name <span className="req-star">*</span>
              </label>
              <input
                id="onboard-name-input"
                className="modal-input"
                placeholder="e.g. Alex"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={onKeyContinue}
              />
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="onboard-birth-date">Date of birth <span className="field-label-meta">optional</span></label>
              <input id="onboard-birth-date" className="modal-input" type="date" value={dateOfBirth} max={localDateValue()} onChange={(event) => setDateOfBirth(event.target.value)} />
              <p className="modal-sub">{age !== null ? `Age ${age} · ` : ''}Used for relatable examples and age-appropriate explanations.</p>
              {dateOfBirth && age === null ? <p className="onboard-error" role="alert">Enter a valid date of birth within the past 120 years.</p> : null}
            </div>

            <div className="field-block">
              <span className="field-label">
                Grade or study level <span className="req-star">*</span>
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
            </div>

            <div className="field-block" style={{ marginBottom: 0 }}>
              <span className="field-label">Pick an avatar</span>
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
              {isEditMode && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleFinish}
                  disabled={!step1Ready || saving}
                >
                  {saving ? "Saving…" : "Save now"}
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                disabled={!step1Ready}
                onClick={goNext}
              >
                Next: Personalize{" "}
                <ArrowRight
                  size={15}
                  style={{ marginLeft: 4, display: "inline" }}
                />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 id="onboard-title">How should Kindling teach {displayName}?</h3>
            <p className="modal-sub">
              All optional — pick what fits and jump straight into your first
              lesson.
            </p>

            <div className="field-block">
              <span className="field-label">Explanation style</span>
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

            <div className="field-block">
              <span className="field-label">
                Interests for examples{" "}
                <span className="field-label-meta">
                  optional · {interests.length}/{MAX_INTERESTS}
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
                  placeholder="Or type your own interest…"
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

            <div className="field-block">
              <span className="field-label">Main goal (optional)</span>
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

            <div className="onboard-more-wrap">
              <button
                type="button"
                className="onboard-more-toggle"
                aria-expanded={showMoreOptions}
                onClick={() => setShowMoreOptions((o) => !o)}
              >
                <SlidersHorizontal size={14} aria-hidden />
                <span>
                  {showMoreOptions ? "Hide" : "More"} options (country,
                  curriculum, language, school)
                </span>
              </button>

              {showMoreOptions && (
                <div className="onboard-more-body">
                  <div className="onboard-more-grid">
                    <div className="field-block">
                      <label className="field-label" htmlFor="onboard-country">
                        Country
                      </label>
                      <select
                        id="onboard-country"
                        className="modal-input"
                        value={country}
                        onChange={(e) => selectCountry(e.target.value)}
                      >
                        <option value="">Select country…</option>
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-block">
                      <label
                        className="field-label"
                        htmlFor="onboard-curriculum"
                      >
                        {higherEd ? "Programme track" : "Curriculum"}
                      </label>
                      <select
                        id="onboard-curriculum"
                        className="modal-input"
                        value={curriculum}
                        onChange={(e) => setCurriculum(e.target.value)}
                      >
                        <option value="">Standard / not sure</option>
                        {curriculumOptions.map((cur) => (
                          <option key={cur.id} value={cur.label}>
                            {cur.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-block">
                      <label className="field-label" htmlFor="onboard-language">
                        Tutoring language
                      </label>
                      <input
                        id="onboard-language"
                        className="modal-input"
                        placeholder="e.g. English, Español"
                        value={preferredLanguage}
                        maxLength={80}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                      />
                    </div>

                    <div className="field-block">
                      <label className="field-label" htmlFor="onboard-school">
                        {higherEd ? "University / college" : "School name"}
                      </label>
                      <input
                        id="onboard-school"
                        className="modal-input"
                        placeholder="Optional"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
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
                    <Loader2 size={16} className="spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    {isEditMode ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Sparkles size={16} />
                    )}
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
