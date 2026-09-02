import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/global.css";
// Registers the <am-lyrics> custom element (customElements.define(...) as a
// side effect of importing this file). Vendored locally under
// src/vendor/am-lyrics/ (see README.md there) instead of loading it from a
// CDN <script> tag, so its source can be edited directly.
import "./vendor/am-lyrics/am-lyrics.ts";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

