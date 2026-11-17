import { LogIn, LogOut, Edit3, Sparkles } from "lucide-react";
import { AVATAR_OPTIONS } from "../../constants/onboarding";
import BrandLogo from "./BrandLogo";

export default function TopNav({
  isLoggedIn,
  student,
  onNavigate,
  onOpenLogin,
  onGetStarted,
  onLogout,
  onOpenOnboarding,
}) {
  const selectedAvatar =
    AVATAR_OPTIONS.find((a) => a.id === student?.avatar) || AVATAR_OPTIONS[0];
  const AvatarIcon = selectedAvatar.Icon;
  const displayName = student?.name?.trim() || "Student";
  const isOnboarded = Boolean(student?.isOnboarded);

  return (
    <header>
      <nav className="topnav" aria-label="Account and brand">
        <BrandLogo onClick={() => onNavigate("overview")} />

        <div className="topnav-actions">
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
      </nav>
    </header>
  );
}
