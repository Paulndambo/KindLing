import { useState } from "react";
import { Lock, LogIn, LogOut, Edit3, Menu, X, Sparkles } from "lucide-react";
import { NAV } from "../../constants/navigation";
import { AVATAR_OPTIONS } from "../../constants/onboarding";
import BrandLogo from "./BrandLogo";

export default function TopNav({
  screen,
  isLoggedIn,
  student,
  onNavigate,
  onOpenLogin,
  onGetStarted,
  onLogout,
  onOpenOnboarding,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedAvatar =
    AVATAR_OPTIONS.find((a) => a.id === student?.avatar) || AVATAR_OPTIONS[0];
  const AvatarIcon = selectedAvatar.Icon;
  const displayName = student?.name?.trim() || "Student";
  const isOnboarded = Boolean(student?.isOnboarded);

  const handleNav = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <>
      <nav className="topnav">
        <BrandLogo />

        {/* Desktop tabs */}
        <div className="navtabs navtabs-desktop">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={screen === item.id ? "active" : ""}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
              {item.protected && !isLoggedIn && (
                <Lock size={11} className="lock-icon" />
              )}
            </button>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="topnav-actions topnav-actions-desktop">
          {isLoggedIn ? (
            <>
              <button
                className="student-badge"
                onClick={onOpenOnboarding}
                title={
                  isOnboarded
                    ? `Edit profile (${student?.schoolName || "School"})`
                    : "Complete your profile"
                }
              >
                <div className="avatar-icon">
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
                <Edit3 size={13} style={{ marginLeft: 2, opacity: 0.7 }} />
              </button>
              <button
                className="btn-ghost"
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
                onClick={onLogout}
                title="Log out"
              >
                <LogOut size={15} /> Log out
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-ghost"
                style={{
                  padding: "9px 18px",
                  fontSize: 13.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={onOpenLogin}
              >
                <LogIn size={15} /> Log in
              </button>
              <button
                className="btn-primary"
                style={{
                  padding: "9px 16px",
                  fontSize: 13.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={onGetStarted}
              >
                <Sparkles size={15} /> Get started
              </button>
            </>
          )}
          {isLoggedIn && (
            <button className="cta-btn" onClick={() => onNavigate("lesson")}>
              Start a lesson
            </button>
          )}
        </div>

        {/* Mobile right side */}
        <div className="topnav-mobile-right">
          {isLoggedIn && (
            <button
              className="student-badge student-badge-compact"
              onClick={onOpenOnboarding}
              title={isOnboarded ? "Edit profile" : "Complete your profile"}
            >
              <div className="avatar-icon">
                <AvatarIcon size={14} />
              </div>
              <span className="badge-name" style={{ fontSize: 13 }}>
                {displayName}
              </span>
            </button>
          )}
          <button
            className="mobile-menu-btn"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`mobile-drawer${mobileOpen ? " open" : ""}`}>
        <div className="mobile-drawer-inner">
          <div className="mobile-nav-section">
            {NAV.map((item) => (
              <button
                key={item.id}
                className={`mobile-nav-item${screen === item.id ? " active" : ""}`}
                onClick={() => handleNav(item.id)}
              >
                {item.label}
                {item.protected && !isLoggedIn && (
                  <Lock size={12} className="lock-icon" />
                )}
              </button>
            ))}
          </div>

          <div className="mobile-drawer-actions">
            {isLoggedIn ? (
              <>
                <button
                  className="cta-btn mobile-cta"
                  onClick={() => handleNav("lesson")}
                >
                  Start a lesson
                </button>
                <button
                  className="btn-ghost mobile-logout"
                  onClick={() => {
                    onLogout();
                    setMobileOpen(false);
                  }}
                >
                  <LogOut size={15} /> Log out
                </button>
              </>
            ) : (
              <>
                <button
                  className="cta-btn mobile-cta"
                  onClick={() => {
                    onGetStarted();
                    setMobileOpen(false);
                  }}
                >
                  <Sparkles size={15} /> Get started
                </button>
                <button
                  className="btn-ghost mobile-login"
                  onClick={() => {
                    onOpenLogin();
                    setMobileOpen(false);
                  }}
                >
                  <LogIn size={15} /> Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
