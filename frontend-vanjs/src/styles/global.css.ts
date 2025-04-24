import { globalStyle, style, keyframes } from "@vanilla-extract/css";
import { themeVars } from "./theme.css";

// --- Base Styles ---
// Use the correct syntax for multiple selectors
globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

globalStyle("html, body", {
  minHeight: "100%", // Use minHeight instead of height for flexibility
});

globalStyle("body", {
  fontFamily: themeVars.font.body,
  backgroundColor: themeVars.color.background,
  color: themeVars.color.foreground,
  lineHeight: 1.5,
});

globalStyle("h1, h2, h3, h4, h5, h6", {
  fontFamily: themeVars.font.heading,
  fontWeight: 600, // Example: slightly bolder headings
});

globalStyle("a", {
  color: themeVars.color.primary,
  textDecoration: "none",
});
globalStyle("a:hover", {
  textDecoration: "underline",
});

globalStyle("button", {
    fontFamily: "inherit",
    cursor: "pointer",
    backgroundColor: 'transparent', // Default buttons to transparent bg
    border: 'none', // Remove default border
    padding: 0 // Remove default padding
});

globalStyle("input, button, textarea, select", {
    font: "inherit",
});

// Basic focus visibility style (can be customized)
// Applied via specific component styles for better control (e.g., Button, Input)
// globalStyle("*:focus-visible", {
//   outline: `2px solid ${themeVars.color.ring}`,
//   outlineOffset: "2px",
//   boxShadow: `0 0 0 3px ${themeVars.color.background}, 0 0 0 5px ${themeVars.color.ring}`,
// });

// --- Background Animation (from index.css) ---
// This requires the logo path to be correct relative to the final CSS output
// or handled via JS. Embedding is large. Keeping it commented.
/*
const slide = keyframes({
  from: { backgroundPosition: '0 0' },
  to: { backgroundPosition: '256px 224px' }
});

globalStyle("body::before", {
  content: "",
  position: "fixed",
  inset: 0,
  zIndex: -1,
  opacity: 0.05,
  background: `url('/logo.svg')`, // Assumes logo.svg is served at the root
  backgroundSize: "256px",
  transform: "rotate(-12deg) scale(1.35)",
  animation: `${slide} 30s linear infinite`,
  pointerEvents: "none",
});
*/

// --- Reduced Motion ---
// Use @media block correctly with globalStyle
globalStyle("@media (prefers-reduced-motion)", {
    "*, *::before, *::after": { // Target elements within the media query
        animationDuration: '0.01ms !important',
        animationIterationCount: '1 !important',
        transitionDuration: '0.01ms !important',
        scrollBehavior: 'auto !important',
    }
});