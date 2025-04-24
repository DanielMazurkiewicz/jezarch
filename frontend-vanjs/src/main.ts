import van from "vanjs-core";
import App from "./App";
import { attachTheme, themeClass, lightTheme, darkTheme } from "./styles/theme.css"; // Import themes
import "./styles/global.css.ts"; // Import global styles (ensure .ts extension if needed)

// Attach the default theme (e.g., light) to the body or html
// You could check localStorage here to apply 'dark' if saved.
const preferredTheme = localStorage.getItem('theme') || 'light';
// Ensure the value passed to attachTheme is 'light' or 'dark'
const themeToAttach = (preferredTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
attachTheme(document.documentElement, themeToAttach); // Attach to html for global scope

const rootElement = document.getElementById("root");

if (rootElement) {
  // Clear potential static SSR content or loading indicators
  rootElement.innerHTML = '';
  // Add the main App component wrapped in the theme class
  // Applying the base themeClass enables CSS variable scoping.
  // Specific theme (light/dark) is applied via attachTheme.
  rootElement.className = themeClass; // Apply the base theme class
  van.add(rootElement, App());
} else {
  console.error("Fatal: Root element #root not found!");
}