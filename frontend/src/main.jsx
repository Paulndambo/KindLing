import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/platform.css";
import "./styles/professional.css";
import App from "./App.jsx";

// Load the base, component, and design-system CSS in a fixed order before
// mounting. An async base import could override the design system on load.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
