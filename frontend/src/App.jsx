import { useState, useCallback, lazy, Suspense } from "react";
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

function ScreenFallback() {
  return (
    <div
      style={{
        padding: "80px 40px",
        textAlign: "center",
        color: "var(--ink-soft)",
        fontSize: 14,
      }}
    >
      Loading…
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("overview");
  const [activeLesson, setActiveLesson] = useState(null);

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
    (subjectName, topicName) => {
      if (!isLoggedIn) {
        requireAuth("lesson", "register");
        return;
      }
      if (student && !student.isOnboarded) {
        setOnboardingOpen(true);
        return;
      }
      setActiveLesson({ subject: subjectName, topic: topicName });
      setScreen("lesson");
    },
    [isLoggedIn, requireAuth, student, setOnboardingOpen]
  );

  return (
    <div className="kdl">
      <TopNav
        screen={screen}
        isLoggedIn={isLoggedIn}
        student={student}
        onNavigate={handleNavigate}
        onOpenLogin={handleOpenLogin}
        onGetStarted={handleGetStarted}
        onLogout={handleLogout}
        onOpenOnboarding={handleOpenOnboarding}
      />

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
            key={`${activeLesson?.subject ?? "general"}-${activeLesson?.topic ?? "default"}`}
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
          />
        )}
      </Suspense>

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
        onClearError={() => setAuthError("")}
      />

      {onboardingOpen && isLoggedIn && (
        <OnboardingModal
          initialProfile={student}
          onSave={saveProfile}
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
