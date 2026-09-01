import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { NAV } from "./constants/navigation";
import { useAuth } from "./hooks/useAuth";
import { useStudentProfile } from "./hooks/useStudentProfile";
import { useSubjects } from "./hooks/useSubjects";
import TopNav from "./components/layout/TopNav";
import AuthModal from "./components/auth/AuthModal";
import OnboardingModal from "./components/onboarding/OnboardingModal";

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
    deleteSubject,
    deleteTopic,
  } = useSubjects({
    isLoggedIn,
    // Subjects are owned by the student profile (created during onboarding)
    hasStudentProfile: Boolean(student?.id || student?.isOnboarded),
    studentId: student?.id ?? null,
  });

  const afterAuthNavigate = useCallback(() => {
    if (pendingTab) {
      setScreen(pendingTab);
      clearPendingTab();
    }
  }, [pendingTab, clearPendingTab]);

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
    openAuth("register", "lesson");
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
        requireAuth(tabId, "login");
        return;
      }
      setScreen(tabId);
    },
    [isLoggedIn, requireAuth]
  );

  const startLesson = useCallback(
    (subjectName, topicName, opts = null) => {
      if (!isLoggedIn) {
        requireAuth("lesson", "register");
        return;
      }
      if (student && !student.isOnboarded) {
        setOnboardingOpen(true);
        return;
      }
      // opts: reviewMode (C1), challengeMode (G1), skill labels, etc.
      const extra =
        opts && typeof opts === "object" && !Array.isArray(opts) ? opts : {};
      setActiveLesson({
        subject: subjectName,
        topic: topicName,
        ...extra,
      });
      setScreen("lesson");
    },
    [isLoggedIn, requireAuth, student, setOnboardingOpen]
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
                // Prefer subjects so learners pick a topic rather than a blank lesson
                if (subjects?.length) {
                  setScreen("subjects");
                  return;
                }
                setScreen("lesson");
              }}
            />
          )}
          {screen === "subjects" && (
            <MySubjects
              subjects={subjects}
              loading={subjectsLoading}
              error={subjectsError}
              onCreateSubject={createSubject}
              onAddTopic={addTopic}
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
          {screen === "lesson" && (
            <Lesson
              key={`${activeLesson?.subject ?? "general"}-${activeLesson?.topic ?? "default"}-${activeLesson?.reviewSkill ?? activeLesson?.challengeSkill ?? "open"}`}
              activeLesson={activeLesson}
              student={student}
              subjects={subjects}
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
              isLoggedIn={isLoggedIn}
              onOpenLogin={handleOpenLogin}
            />
          )}
        </Suspense>
      </main>

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
