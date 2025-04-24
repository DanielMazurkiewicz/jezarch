import {
  createThemeContract,
  createTheme,
  assignVars,
  style,
} from "@vanilla-extract/css";

// --- Theme Contract ---
// Defines the shape of our theme variables.
export const themeVars = createThemeContract({
  color: {
    background: null,
    foreground: null,
    card: null,
    cardForeground: null,
    popover: null,
    popoverForeground: null,
    primary: null,
    primaryForeground: null,
    secondary: null,
    secondaryForeground: null,
    muted: null,
    mutedForeground: null,
    accent: null,
    accentForeground: null,
    destructive: null,
    destructiveForeground: null,
    border: null,
    input: null,
    ring: null,
    // Sidebar specific colors
    sidebar: null,
    sidebarForeground: null,
    sidebarBorder: null,
    sidebarAccent: null,
    sidebarAccentForeground: null,
  },
  spacing: {
    xs: null, // 4px
    sm: null, // 8px
    md: null, // 16px
    lg: null, // 24px
    xl: null, // 32px
  },
  radius: {
    sm: null,
    md: null,
    lg: null,
  },
  font: {
    body: null,
    heading: null,
    mono: null,
  },
  zIndex: {
    dialog: null,
    popover: null,
    header: null,
  }
});

// --- Light Theme ---
// Define the actual theme variables for the light theme
// Using assignVars inside a :root selector associated with a class
const lightThemeValues = {
  color: {
    background: "hsl(0 0% 100%)",
    foreground: "hsl(240 10% 3.9%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(240 10% 3.9%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(240 10% 3.9%)",
    primary: "hsl(240 5.9% 10%)",
    primaryForeground: "hsl(0 0% 98%)",
    secondary: "hsl(240 4.8% 95.9%)",
    secondaryForeground: "hsl(240 5.9% 10%)",
    muted: "hsl(240 4.8% 95.9%)",
    mutedForeground: "hsl(240 3.8% 46.1%)",
    accent: "hsl(240 4.8% 95.9%)",
    accentForeground: "hsl(240 5.9% 10%)",
    destructive: "hsl(0 84.2% 60.2%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(240 5.9% 90%)",
    input: "hsl(240 5.9% 90%)",
    ring: "hsl(240 10% 3.9%)",
    // Sidebar
    sidebar: "hsl(0 0% 100%)",
    sidebarForeground: "hsl(240 5.3% 26.1%)",
    sidebarBorder: "hsl(240 5.9% 90%)",
    sidebarAccent: "hsl(240 4.8% 95.9%)",
    sidebarAccentForeground: "hsl(240 5.9% 10%)",
  },
  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem",  // 8px
    md: "1rem",    // 16px
    lg: "1.5rem",  // 24px
    xl: "2rem",    // 32px
  },
  radius: {
    sm: "0.25rem", // 4px
    md: "0.375rem", // 6px
    lg: "0.5rem", // 8px (Tailwind lg)
  },
  font: {
    body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    heading: "inherit", // Inherit from body by default
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  zIndex: {
      dialog: "50",
      popover: "50",
      header: "30",
  }
};

// --- Dark Theme ---
// Define the actual theme variables for the dark theme
const darkThemeValues = {
  color: {
    background: "hsl(240 6% 10%)",
    foreground: "hsl(0 0% 98%)",
    card: "hsl(240 6% 10%)",
    cardForeground: "hsl(0 0% 98%)",
    popover: "hsl(240 6% 10%)",
    popoverForeground: "hsl(0 0% 98%)",
    primary: "hsl(0 0% 98%)",
    primaryForeground: "hsl(240 5.9% 10%)",
    secondary: "hsl(240 3.7% 15.9%)",
    secondaryForeground: "hsl(0 0% 98%)",
    muted: "hsl(240 3.7% 15.9%)",
    mutedForeground: "hsl(240 5% 64.9%)",
    accent: "hsl(240 3.7% 15.9%)",
    accentForeground: "hsl(0 0% 98%)",
    destructive: "hsl(0 72% 51%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(240 3.7% 15.9%)",
    input: "hsl(240 3.7% 15.9%)",
    ring: "hsl(240 4.9% 83.9%)",
    // Sidebar
    sidebar: "hsl(240 5% 14%)",
    sidebarForeground: "hsl(240 5% 85%)",
    sidebarBorder: "hsl(240 3.7% 15.9%)",
    sidebarAccent: "hsl(240 3.7% 19.9%)",
    sidebarAccentForeground: "hsl(0 0% 98%)",
  },
  spacing: lightThemeValues.spacing, // Use same spacing
  radius: lightThemeValues.radius,   // Use same radius
  font: lightThemeValues.font,       // Use same fonts
  zIndex: lightThemeValues.zIndex,     // Use same z-index
};

// --- Create Theme Classes ---
// Create actual CSS theme classes using createTheme
export const lightTheme = style({}); // Empty style just to get a class name
export const darkTheme = style({});  // Empty style just to get a class name

// Assign variables to the :root selector associated with these classes
// NOTE: assignVars needs to be called *outside* any style rule, typically at the top level.
// We need a way to associate the vars with the classes. The intended way is
// createTheme(contract, values) which returns the class name.
// Let's recreate the themes using createTheme directly.

// Recreate themes using createTheme
const lightThemeClassName = createTheme(themeVars, lightThemeValues);
const darkThemeClassName = createTheme(themeVars, darkThemeValues);

// --- Theme Class Helper ---
// This style rule applies the theme variables. Assign this class to a top-level element.
// This is now less necessary as createTheme returns the class name directly.
// export const themeClass = style({}); // Keep for potential global overrides if needed

// Function to apply theme class dynamically
export const attachTheme = (element: Element, themeName: 'light' | 'dark') => {
  // Remove potentially existing theme classes before adding the new one
  element.classList.remove(lightThemeClassName, darkThemeClassName);
  element.classList.add(themeName === 'dark' ? darkThemeClassName : lightThemeClassName);
};

// Export the generated class names if needed elsewhere (e.g., testing)
export const themes = {
    light: lightThemeClassName,
    dark: darkThemeClassName
};