import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/platform.css";
import "./styles/overview-rebuilt.css";
import "./styles/subjects.css";
import "./styles/dashboard.css";
import "./styles/dashboard-workspace.css";
import "./styles/assessments.css";
import "./styles/lesson.css";
import "./styles/lesson-polish.css";
import "./styles/tutor-content.css";
import "./components/settings/revenuecat-subscription.css";
import "./styles/professional.css";
import App from "./App.jsx";

// Load the base, component, and design-system CSS in a fixed order before
// mounting. An async base import could override the design system on load.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

