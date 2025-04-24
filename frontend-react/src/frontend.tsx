import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import App from "./App";
import "./index.css"; // Keep main CSS import - Tailwind setup done here
// import "tailwindcss/preflight.css";
// import "tailwindcss/index.css";
import { Toaster } from "@/components/ui/sonner"; // Import Toaster

const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/* Render Toaster globally - richColors applies preset styles */}
      <Toaster richColors position="top-right" duration={6000} />
    </BrowserRouter>
  </React.StrictMode>
);