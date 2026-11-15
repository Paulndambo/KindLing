import { useCallback, useEffect } from "react";
import { Lock, LogIn, LogOut, Edit3, Menu, X, Sparkles } from "lucide-react";
import { NAV } from "../../constants/navigation";
import { AVATAR_OPTIONS } from "../../constants/onboarding";
import BrandLogo from "./BrandLogo";

export default function TopNav({
  screen,
  isLoggedIn,
  student,
  hasSubjects = false,
  onNavigate,
  onOpenLogin,
  onGetStarted,
  onLogout,
  onOpenOnboarding,
  mobileOpen = false,
  onMobileOpenChange,
}) {
  const selectedAvatar =
    AVATAR_OPTIONS.find((a) => a.id === student?.avatar) || AVATAR_OPTIONS[0];
  const AvatarIcon = selectedAvatar.Icon;
  const displayName = student?.name?.trim() || "Student";
  const isOnboarded = Boolean(student?.isOnboarded);
  const isPublicHome = !isLoggedIn && screen === "overview";
  const publicLinks = [
    { href: "#learning-method", label: "Why Kindling" },
    { href: "#explore-subjects", label: "Subjects" },
    { href: "#learning-plans", label: "Pricing" },
  ];

  const setMobileOpen = useCallback(
    (next) => {
      if (typeof onMobileOpenChange === "function") {
        onMobileOpenChange(
          typeof next === "function" ? next(mobileOpen) : next,
        );
      }
    },
    [onMobileOpenChange, mobileOpen],
  );

  const handleNav = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  // Escape closes mobile drawer
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  // Lock body scroll while drawer open
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <>
      <header>
        <nav
          className={`topnav${isPublicHome ? " topnav-marketing" : ""}`}
          aria-label="Primary"
        >
          <BrandLogo onClick={() => handleNav("overview")} />

          {/* Desktop tabs */}
          <div className="navtabs navtabs-desktop" aria-label="Main sections">
            {isPublicHome
              ? publicLinks.map((link) => (
                  <a key={link.href} href={link.href}>
                    {link.label}
                  </a>
                ))
              : NAV.map((item) => {
                  const active = screen === item.id;
                  const lessonMissingSubject =
                    item.id === "lesson" && isLoggedIn && !hasSubjects;
                  const showLock =
                    (item.protected && !isLoggedIn) || lessonMissingSubject;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      className={`${active ? "active" : ""}${
                        lessonMissingSubject ? " is-locked" : ""
                      }`.trim()}
                      disabled={lessonMissingSubject}
                      title={
                        lessonMissingSubject
                          ? "Add a subject in My Subjects before starting a lesson"
                          : undefined
                      }
                      onClick={() => onNavigate(item.id)}
                    >
                      {item.label}
                      {showLock && (
                        <Lock size={11} className="lock-icon" aria-hidden />
                      )}
                    </button>
                  );
                })}
          </div>

          {/* Desktop actions */}
          <div className="topnav-actions topnav-actions-desktop">
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  className="student-badge"
                  onClick={onOpenOnboarding}
                  title={
                    isOnboarded
                      ? `Edit profile (${student?.schoolName || "School"})`
                      : "Complete your profile"
                  }
                >
                  <div className="avatar-icon" aria-hidden>
                    <AvatarIcon size={14} />
                  </div>
                  <div className="badge-details">
                    <span className="badge-name">
                      {student?.countryFlag ? `${student.countryFlag} ` : ""}
                      {displayName}
                    </span>
                    <span className="badge-grade">
                      {isOnboarded
                        ? student?.grade || "Student"
                        : "Finish setup"}
                    </span>
                  </div>
                  <Edit3
                    size={13}
                    style={{ marginLeft: 2, opacity: 0.7 }}
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  className="btn-ghost topnav-logout"
                  onClick={onLogout}
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut size={15} aria-hidden />
                  <span className="topnav-logout-label">Log out</span>
                </button>
                <button
                  type="button"
                  className="cta-btn"
                  disabled={!hasSubjects}
                  title={
                    !hasSubjects
                      ? "Add a subject in My Subjects before starting a lesson"
                      : undefined
                  }
                  onClick={() => onNavigate("lesson")}
                >
                  Start a lesson
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-ghost topnav-auth-btn"
                  onClick={onOpenLogin}
                >
                  <LogIn size={15} aria-hidden /> Log in
                </button>
                <button
                  type="button"
                  className="btn-primary topnav-auth-btn"
                  onClick={onGetStarted}
                >
                  <Sparkles size={15} aria-hidden /> Get started
                </button>
              </>
            )}
          </div>

          {/* Mobile right side */}
          <div className="topnav-mobile-right">
            {isLoggedIn && (
              <button
                type="button"
                className="student-badge student-badge-compact"
                onClick={onOpenOnboarding}
                title={isOnboarded ? "Edit profile" : "Complete your profile"}
              >
                <div className="avatar-icon" aria-hidden>
                  <AvatarIcon size={14} />
                </div>
                <span className="badge-name" style={{ fontSize: 13 }}>
                  {displayName}
                </span>
              </button>
            )}
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? (
                <X size={22} aria-hidden />
              ) : (
                <Menu size={22} aria-hidden />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile drawer */}
      <div
        id="mobile-nav-drawer"
        className={`mobile-drawer${mobileOpen ? " open" : ""}`}
        role="dialog"
        aria-modal={mobileOpen ? "true" : undefined}
        aria-hidden={mobileOpen ? undefined : "true"}
        inert={!mobileOpen}
        aria-label="Navigation menu"
      >
        <div className="mobile-drawer-inner">
          <div className="mobile-drawer-head">
            <p className="eyebrow">Navigate</p>
            <button
              type="button"
              className="mobile-drawer-close"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="mobile-nav-section">
            {isPublicHome
              ? publicLinks.map((link) => (
                  <a
                    className="mobile-nav-item"
                    href={link.href}
                    key={link.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                ))
              : NAV.map((item) => {
                  const active = screen === item.id;
                  const lessonMissingSubject =
                    item.id === "lesson" && isLoggedIn && !hasSubjects;
                  const showLock =
                    (item.protected && !isLoggedIn) || lessonMissingSubject;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`mobile-nav-item${active ? " active" : ""}${
                        lessonMissingSubject ? " is-locked" : ""
                      }`}
                      aria-current={active ? "page" : undefined}
                      disabled={lessonMissingSubject}
                      title={
                        lessonMissingSubject
                          ? "Add a subject in My Subjects before starting a lesson"
                          : undefined
                      }
                      onClick={() => handleNav(item.id)}
                    >
                      {item.label}
                      {showLock && (
                        <Lock size={12} className="lock-icon" aria-hidden />
                      )}
                    </button>
                  );
                })}
          </div>

          <div className="mobile-drawer-actions">
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  className="cta-btn mobile-cta"
                  disabled={!hasSubjects}
                  title={
                    !hasSubjects
                      ? "Add a subject in My Subjects before starting a lesson"
                      : undefined
                  }
                  onClick={() => handleNav("lesson")}
                >
                  Start a lesson
                </button>
                <button
                  type="button"
                  className="btn-ghost mobile-logout"
                  onClick={() => {
                    onLogout();
                    setMobileOpen(false);
                  }}
                >
                  <LogOut size={15} aria-hidden /> Log out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="cta-btn mobile-cta"
                  onClick={() => {
                    onGetStarted();
                    setMobileOpen(false);
                  }}
                >
                  <Sparkles size={15} aria-hidden /> Get started
                </button>
                <button
                  type="button"
                  className="btn-ghost mobile-login"
                  onClick={() => {
                    onOpenLogin();
                    setMobileOpen(false);
                  }}
                >
                  <LogIn size={15} aria-hidden /> Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
