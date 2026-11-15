import {
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  BookMarked,
  GraduationCap,
  Settings2,
  TrendingUp,
  CalendarDays,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";

const items = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard, page: true },
  { id: "progress", label: "Learning progress", Icon: BookMarked, page: true },
  {
    id: "insights",
    label: "Strengths & activity",
    Icon: TrendingUp,
    page: true,
  },
  { id: "plan", label: "Plan & family", Icon: CalendarDays, page: true },
  { id: "assessments", label: "Assessments", Icon: ClipboardCheck, page: true },
  { id: "subjects", label: "My subjects", Icon: BookMarked },
  { id: "lesson", label: "Learning space", Icon: GraduationCap },
  { id: "settings", label: "Settings", Icon: Settings2 },
];

export default function WorkspaceSidebar({
  collapsed,
  onToggle,
  screen,
  dashboardPage,
  onDashboardPageChange,
  onNavigate,
}) {
  return (
    <aside className="dash-sidebar" aria-label="Workspace navigation">
      <div className="dash-sidebar-section">Workspace</div>
      <nav className="dash-sidebar-nav" aria-label="Learning workspace">
        {items.map(({ id, label, Icon, page }) => {
          const active = page
            ? screen === "dashboard" && dashboardPage === id
            : screen === id;
          return (
            <button
              key={id}
              type="button"
              className={`dash-sidebar-link${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
              title={label}
              aria-label={label}
              onClick={() =>
                page
                  ? screen !== "dashboard"
                    ? onNavigate("dashboard", id)
                    : onDashboardPageChange(id)
                  : onNavigate(id)
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              {active && <i aria-hidden="true" />}
            </button>
          );
        })}
      </nav>
      <div className="dash-sidebar-bottom">
        <div className="dash-sidebar-note">
          <Sparkles size={16} />
          <span>
            Small steps add up.
            <br />
            <strong>Keep your spark going.</strong>
          </span>
        </div>
        <button
          type="button"
          className="dash-sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
          <span>{collapsed ? "Expand" : "Collapse sidebar"}</span>
        </button>
      </div>
    </aside>
  );
}
