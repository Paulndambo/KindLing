import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { NAV } from "./constants/navigation";
import { useAuth } from "./hooks/useAuth";
import { useStudentProfile } from "./hooks/useStudentProfile";
import { useSubjects } from "./hooks/useSubjects";
import TopNav from "./components/layout/TopNav";
import AuthModal from "./components/auth/AuthModal";
import OnboardingModal from "./components/onboarding/OnboardingModal";
import LegalPage from "./components/legal/LegalPage";
import "./styles/platform.css";

const Overview = lazy(() => import("./components/overview/Overview"));
const MySubjects = lazy(() => import("./components/subjects/MySubjects"));
const Lesson = lazy(() => import("./components/lesson/Lesson"));
const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));
const Settings = lazy(() => import("./components/settings/Settings"));

function ScreenFallback() {
  return (
    <div className="screen-fallback" role="status" aria-live="polite">
      <div className="screen-fallback-spinner" aria-hidden />
      <p>Loading…</p>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("overview");
  const [activeLesson, setActiveLesson] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Scroll to top + close mobile nav when the primary screen changes
  useEffect(() => {
    setMobileNavOpen(false);
    window.scrollTo(0, 0);
    // Move focus into main content for keyboard / screen-reader continuity
    const main = document.getElementById("main-content");
    if (main) {
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      // Avoid stealing focus while typing in inputs
      const active = document.activeElement;
      const tag = active?.tagName?.toLowerCase();
      if (!active || tag === "body" || active === document.body || active.closest?.("nav")) {
        try {
          main.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }
    }
  }, [screen]);

  const {
    isLoggedIn,
    userSession,
    authOpen,
    setAuthOpen,
    authMode,
    setAuthMode,
    openAuth,
    pendingTab,
    login,
    register,
    logout,
    requireAuth,
    clearPendingTab,
    authLoading,
    authError,
    setAuthError,
  } = useAuth();

  const {
    student,
    onboardingOpen,
    setOnboardingOpen,
    saveProfile,
    profileSaving,
    profileError,
    clearLocalProfile,
    applyProfileUpdate,
  } = useStudentProfile({
    isLoggedIn,
    accountName: userSession?.name || "",
  });

  const {
    subjects,
    loading: subjectsLoading,
    error: subjectsError,
    createSubject,
    addTopic,
    addSubtopic,
    deleteSubject,
    deleteTopic,
  } = useSubjects({
    isLoggedIn,
    // Subjects are owned by the student profile (created during onboarding)
    hasStudentProfile: Boolean(student?.id || student?.isOnboarded),
    studentId: student?.id ?? null,
  });

  const hasSubjects = Boolean(subjects?.length);

  // Never stay on the Lesson screen if the user has no recorded subjects
  useEffect(() => {
    if (screen === "lesson" && isLoggedIn && !subjectsLoading && !hasSubjects) {
      setScreen("subjects");
    }
  }, [screen, isLoggedIn, subjectsLoading, hasSubjects]);

  const afterAuthNavigate = useCallback(() => {
    if (pendingTab) {
      if (pendingTab === "lesson" && !subjects?.length) {
        setScreen("subjects");
      } else {
        setScreen(pendingTab);
      }
      clearPendingTab();
    }
  }, [pendingTab, subjects, clearPendingTab]);

  const handleLogin = useCallback(
    async (email, password) => {
      await login(email, password);
      afterAuthNavigate();
      // Onboarding opens automatically via useStudentProfile if needed
    },
    [login, afterAuthNavigate]
  );

  const handleRegister = useCallback(
    async ({ email, password, passwordConfirm, name }) => {
      await register({ email, password, passwordConfirm, name });
      afterAuthNavigate();
      // New accounts have no profile — useStudentProfile opens onboarding
    },
    [register, afterAuthNavigate]
  );

  const handleLogout = useCallback(() => {
    logout();
    clearLocalProfile();
    setScreen("overview");
  }, [logout, clearLocalProfile]);

  /** Open onboarding only when logged in; otherwise start Get Started. */
  const handleOpenOnboarding = useCallback(() => {
    if (!isLoggedIn) {
      openAuth("register", null);
      return;
    }
    setOnboardingOpen(true);
  }, [isLoggedIn, openAuth, setOnboardingOpen]);

  const handleGetStarted = useCallback(() => {
    openAuth("register", "subjects");
  }, [openAuth]);

  const handleOpenLogin = useCallback(() => {
    openAuth("login", null);
  }, [openAuth]);

  const handleClearAuthError = useCallback(() => {
    setAuthError("");
  }, [setAuthError]);

  const handleNavigate = useCallback(
    (tabId) => {
      const navItem = NAV.find((n) => n.id === tabId);
      if (navItem?.protected && !isLoggedIn) {
        requireAuth(tabId === "lesson" ? "subjects" : tabId, "login");
        return;
      }
      if (tabId === "lesson") {
        if (student && !student.isOnboarded) {
          setOnboardingOpen(true);
          return;
        }
        if (!hasSubjects) {
          setScreen("subjects");
          return;
        }
        if (
          !activeLesson?.subject ||
          !subjects.some((s) => s.name === activeLesson.subject)
        ) {
          const firstSubject = subjects[0];
          const firstUnit = firstSubject?.topics?.[0];
          const firstLeaf =
            firstUnit?.subtopics?.[0]?.name || firstUnit?.name || "";
          setActiveLesson({
            subject: firstSubject.name,
            topic: firstLeaf,
            unit: firstUnit?.name || "",
          });
        }
      }
      setScreen(tabId);
    },
    [
      isLoggedIn,
      requireAuth,
      student,
      setOnboardingOpen,
      hasSubjects,
      activeLesson,
      subjects,
    ]
  );

  const startLesson = useCallback(
    (subjectName, topicName, opts = null) => {
      if (!isLoggedIn) {
        requireAuth("subjects", "register");
        return;
      }
      if (student && !student.isOnboarded) {
        setOnboardingOpen(true);
        return;
      }
      if (!hasSubjects) {
        setScreen("subjects");
        return;
      }
      const matchedSubject =
        subjects.find((s) => s.name === subjectName) || subjects[0];
      const firstUnit = matchedSubject?.topics?.[0];
      const resolvedTopic =
        topicName ||
        firstUnit?.subtopics?.[0]?.name ||
        firstUnit?.name ||
        "";
      // opts: reviewMode (C1), challengeMode (G1), skill labels, etc.
      const extra =
        opts && typeof opts === "object" && !Array.isArray(opts) ? opts : {};
      setActiveLesson({
        subject: matchedSubject.name,
        topic: resolvedTopic,
        ...extra,
      });
      setScreen("lesson");
    },
    [
      isLoggedIn,
      requireAuth,
      student,
      setOnboardingOpen,
      hasSubjects,
      subjects,
    ]
  );

  return (
    <div className="kdl">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <TopNav
        screen={screen}
        isLoggedIn={isLoggedIn}
        student={student}
        hasSubjects={hasSubjects}
        onNavigate={handleNavigate}
        onOpenLogin={handleOpenLogin}
        onGetStarted={handleGetStarted}
        onLogout={handleLogout}
        onOpenOnboarding={handleOpenOnboarding}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
      />

      <main id="main-content" className="app-main" tabIndex={-1}>
        <Suspense fallback={<ScreenFallback />}>
          {(screen === "privacy" || screen === "terms") && (
            <LegalPage
              kind={screen}
              onBack={() => setScreen("overview")}
              onSupport={() => setScreen("support")}
            />
          )}
          {screen === "support" && (
            <Settings
              key={screen}
              initialTab="support"
              isLoggedIn={isLoggedIn}
              onOpenLogin={handleOpenLogin}
            />
          )}
          {screen === "overview" && (
            <Overview
              goTo={handleNavigate}
              student={student}
              isLoggedIn={isLoggedIn}
              onOpenOnboarding={handleOpenOnboarding}
              onGetStarted={handleGetStarted}
              onOpenLogin={handleOpenLogin}
              onStartLesson={() => {
                if (!isLoggedIn) {
                  handleGetStarted();
                  return;
                }
                if (student && !student.isOnboarded) {
                  setOnboardingOpen(true);
                  return;
                }
                // Always direct to My Subjects if no subject is recorded or to pick a topic
                setScreen("subjects");
              }}
            />
          )}
          {(screen === "subjects" ||
            (screen === "lesson" && !subjectsLoading && !hasSubjects)) && (
            <MySubjects
              subjects={subjects}
              loading={subjectsLoading}
              error={subjectsError}
              onCreateSubject={createSubject}
              onAddTopic={addTopic}
              onAddSubtopic={addSubtopic}
              selectedSubjectId={selectedSubjectId}
              onSelectSubject={setSelectedSubjectId}
              onDeleteSubject={deleteSubject}
              onDeleteTopic={deleteTopic}
              onStartLesson={startLesson}
              student={student}
              isLoggedIn={isLoggedIn}
              onGetStarted={handleGetStarted}
              onOpenLogin={handleOpenLogin}
              onOpenOnboarding={handleOpenOnboarding}
            />
          )}
          {screen === "lesson" && subjectsLoading && !hasSubjects && (
            <ScreenFallback />
          )}
          {screen === "lesson" && hasSubjects && (
            <Lesson
              key={`${activeLesson?.subject ?? subjects[0]?.name ?? "general"}-${activeLesson?.topic ?? "default"}-${activeLesson?.reviewSkill ?? activeLesson?.challengeSkill ?? "open"}`}
              activeLesson={activeLesson}
              student={student}
              subjects={subjects}
              onNavigate={handleNavigate}
            />
          )}
          {screen === "dashboard" && (
            <Dashboard
              key={student?.id || student?.name || "dashboard"}
              student={student}
              subjects={subjects}
              onStartLesson={startLesson}
              onStudentUpdate={applyProfileUpdate}
            />
          )}
          {screen === "settings" && (
            <Settings
              key={screen}
              initialTab="subscription"
              isLoggedIn={isLoggedIn}
              onOpenLogin={handleOpenLogin}
            />
          )}
        </Suspense>
      </main>

      <footer className="app-legal-footer">
        <span>© 2026 Kindling · Every student, taught like the only one in the room.</span>
        <nav aria-label="Legal and support links">
          <button type="button" onClick={() => setScreen("support")}>Help & feedback</button>
          <button type="button" onClick={() => setScreen("privacy")}>Privacy</button>
          <button type="button" onClick={() => setScreen("terms")}>Terms</button>
        </nav>
      </footer>

      <AuthModal
        isOpen={authOpen}
        onClose={() => {
          if (!authLoading) setAuthOpen(false);
        }}
        onLogin={handleLogin}
        onRegister={handleRegister}
        mode={authMode}
        onModeChange={setAuthMode}
        redirectTab={pendingTab}
        loading={authLoading}
        error={authError}
        onClearError={handleClearAuthError}
      />

      {onboardingOpen && isLoggedIn && (
        <OnboardingModal
          initialProfile={student}
          onSave={async (profile) => {
            const wasNew = !student?.isOnboarded;
            await saveProfile(profile);
            // First-time finish → land on My Subjects to create what they care about
            if (wasNew) setScreen("subjects");
          }}
          onClose={() => {
            // Allow closing only once onboarded (edit mode)
            if (student?.isOnboarded) setOnboardingOpen(false);
          }}
          isEditMode={Boolean(student?.isOnboarded)}
          saving={profileSaving}
          error={profileError}
        />
      )}
    </div>
  );
}
