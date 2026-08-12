import { useMemo, useState } from "react";
import {
  X,
  ArrowRight,
  Check,
  CheckCircle,
  Building2,
  Loader2,
} from "lucide-react";
import {
  AVATAR_OPTIONS,
  GRADE_OPTIONS,
  COUNTRY_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  EMPTY_STUDENT_PROFILE,
  isHigherEducation,
  getSchoolTypeOptions,
  getCurriculumOptions,
  getTargetLevelOptions,
  getInterestOptions,
  getGoalOptions,
  getInstitutionLabel,
} from "../../constants/onboarding";

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
  const [goal, setGoal] = useState(seed.goal || "");
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

  const selectGrade = (nextGrade) => {
    const wasHigher = isHigherEducation(grade);
    const nextHigher = isHigherEducation(nextGrade);
    setGrade(nextGrade);

    // When crossing K-12 ↔ higher ed, clear level-specific choices that no longer apply
    if (wasHigher !== nextHigher) {
      setSchoolType("");
      setCurriculum("");
      setAcademicTarget("");
      setGoal("");
      setInterests([]);
    }
  };

  const toggleInterest = (item) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleFinish = async () => {
    setLocalError("");
    if (!name.trim()) {
      setLocalError("Please enter your name.");
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

  return (
    <div
      className="modal-overlay"
      onClick={isEditMode ? onClose : undefined}
    >
      <div className="wizard-card" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-top">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="eyebrow">Your learning profile</span>
            <span
              style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}
            >
              Step {step} of 5
            </span>
          </div>
          {isEditMode && (
            <button className="icon-x" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="wizard-progress">
          <div
            className="wizard-progress-fill"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <div>
            <h3>Who&apos;s learning?</h3>
            <p className="modal-sub">
              Tell us your name, level of study, and choose an avatar.
            </p>

            <div className="field-block">
              <span className="field-label">Your name</span>
              <input
                className="modal-input"
                placeholder="e.g. Alex, Sam, Jordan"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field-block">
              <span className="field-label">Grade / level of study</span>
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
                <p
                  style={{
                    marginTop: 10,
                    marginBottom: 0,
                    fontSize: 12,
                    color: "var(--ink-soft)",
                  }}
                >
                  Higher education selected — curriculum and interests will
                  adapt for university / college.
                </p>
              )}
            </div>

            <div className="field-block" style={{ marginBottom: 0 }}>
              <span className="field-label">Choose avatar</span>
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

            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={!name.trim()}
                onClick={() => setStep(2)}
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
            <h3>
              Location &amp; {higherEd ? "institution" : "school"}
            </h3>
            <p className="modal-sub">
              Help Kindling tailor terminology and context for your{" "}
              {institution}.
            </p>

            <div className="field-block">
              <span className="field-label">Country</span>
              <select
                className="modal-input"
                style={{ cursor: "pointer" }}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
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
              />
            </div>

            <div className="field-block" style={{ marginBottom: 0 }}>
              <span className="field-label">
                {higherEd ? "Institution type" : "School type"}
              </span>
              <div className="grade-grid">
                {schoolTypeOptions.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`grade-pill ${schoolType === st ? "selected" : ""}`}
                    onClick={() => setSchoolType(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn-primary" onClick={() => setStep(3)}>
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
            <h3>
              {higherEd ? "Programme & goals" : "Curriculum & goals"}
            </h3>
            <p className="modal-sub">
              {higherEd
                ? "Select the degree pathway and academic target that fit your studies."
                : "Select the curriculum standards and academic target that fit you."}
            </p>

            <div className="field-block">
              <span className="field-label">
                {higherEd
                  ? "Degree / programme track"
                  : "Educational curriculum"}
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxHeight: 180,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {curriculumOptions.map((cur) => (
                  <button
                    key={cur.id}
                    type="button"
                    className={`goal-card ${curriculum === cur.label ? "selected" : ""}`}
                    style={{ margin: 0 }}
                    onClick={() => setCurriculum(cur.label)}
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

            <div className="field-block">
              <span className="field-label">
                {higherEd ? "Academic ambition" : "Academic target level"}
              </span>
              <div className="style-grid">
                {targetOptions.map((tgt) => (
                  <button
                    key={tgt.id}
                    type="button"
                    className={`style-card ${academicTarget === tgt.label ? "selected" : ""}`}
                    onClick={() => setAcademicTarget(tgt.label)}
                  >
                    <h4>{tgt.label}</h4>
                    <p>{tgt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="field-block" style={{ marginBottom: 0 }}>
              <span className="field-label">Primary learning goal</span>
              <div className="grade-grid">
                {goalOptions.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`grade-pill ${goal === g ? "selected" : ""}`}
                    onClick={() => setGoal(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
                Back
              </button>
              <button type="button" className="btn-primary" onClick={() => setStep(4)}>
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
            <h3>Learning style &amp; interests</h3>
            <p className="modal-sub">
              {higherEd
                ? "Kindling will use your field interests and goals in tutoring examples."
                : "Kindling will weave your interests into AI tutoring examples."}
            </p>

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
                  ? "Fields & passions (select all that apply)"
                  : "Passions & interests (select all that apply)"}
              </span>
              <div className="interest-chips">
                {interestOptions.map((item) => {
                  const sel = interests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`interest-chip ${sel ? "selected" : ""}`}
                      onClick={() => toggleInterest(item)}
                    >
                      {item} {sel ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setStep(3)}>
                Back
              </button>
              <button type="button" className="btn-primary" onClick={() => setStep(5)}>
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
            <h3>You&apos;re ready!</h3>
            <p className="modal-sub">
              Your AI tutor is set up for {displayName}.
            </p>

            <div className="tutor-preview-card">
              <h4>🔥 Welcome{name.trim() ? `, ${name.trim()}` : ""}!</h4>
              <p>
                &quot;I&apos;m ready for our lessons
                {curriculum ? (
                  <>
                    {" "}
                    following <strong>{curriculum}</strong>
                    {higherEd ? "" : " standards"}
                  </>
                ) : null}
                {grade ? (
                  <>
                    {" "}
                    for <strong>{grade}</strong>
                  </>
                ) : null}
                {schoolName || country ? (
                  <>
                    {" "}
                    at{" "}
                    <strong>
                      {schoolName ||
                        (higherEd ? "your university" : "your school")}
                    </strong>
                    {country ? (
                      <>
                        {" "}
                        in <strong>
                          {country}
                          {countryObj?.flag ? ` ${countryObj.flag}` : ""}
                        </strong>
                      </>
                    ) : null}
                  </>
                ) : null}
                {interests.length > 0 ? (
                  <>
                    , using examples from{" "}
                    <strong>{interests.join(", ")}</strong>
                  </>
                ) : null}
                !&quot;
              </p>
            </div>

            <div className="academic-card" style={{ margin: "16px 0" }}>
              <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>
                <Building2 size={15} /> Your academic profile
              </h4>
              <div className="academic-grid">
                <div className="academic-item">
                  <b>Name &amp; level</b>
                  <span>
                    {name.trim() || "—"}
                    {grade ? ` (${grade})` : ""}
                  </span>
                </div>
                <div className="academic-item">
                  <b>
                    Location &amp; {higherEd ? "institution" : "school"}
                  </b>
                  <span>
                    {countryObj?.flag ? `${countryObj.flag} ` : ""}
                    {country || "—"}
                    {schoolName ? ` · ${schoolName}` : ""}
                    {schoolType ? ` (${schoolType})` : ""}
                  </span>
                </div>
                <div className="academic-item">
                  <b>{higherEd ? "Programme" : "Curriculum"}</b>
                  <span>{curriculum || "—"}</span>
                </div>
                <div className="academic-item">
                  <b>Target</b>
                  <span>{academicTarget || "—"}</span>
                </div>
              </div>
            </div>

            {displayError && (
              <div
                style={{
                  color: "var(--berry)",
                  fontSize: 12.5,
                  marginBottom: 12,
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
                onClick={() => setStep(4)}
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
                    {isEditMode ? "Save changes" : "Complete setup"}
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
