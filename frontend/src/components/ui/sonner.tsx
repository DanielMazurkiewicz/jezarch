"use client"

// Removed next-themes dependency
// import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import type React from 'react'; // Import React types if needed

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  // Simplified theme detection - checks for dark class on html or prefers-color-scheme
  // Note: This won't dynamically update if the theme changes without a page reload
  // unless more complex logic is added (e.g., MutationObserver or context).
  const getTheme = () => {
    if (typeof window === 'undefined') return 'light'; // Default for SSR/build
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return document.documentElement.classList.contains('dark') ? 'dark' : prefersDark ? 'dark' : 'light';
  }

  const currentTheme = getTheme();

  return (
    <Sonner
      theme={currentTheme as ToasterProps["theme"]} // Pass detected theme
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive",
          success: "group-[.toaster]:bg-green-600 group-[.toaster]:text-primary-foreground group-[.toaster]:border-green-700", // Example success style
          warning: "group-[.toaster]:bg-yellow-500 group-[.toaster]:text-primary-foreground group-[.toaster]:border-yellow-600", // Example warning style
          info: "group-[.toaster]:bg-blue-600 group-[.toaster]:text-primary-foreground group-[.toaster]:border-blue-700", // Example info style
        },
      }}
      {...props}
    />
  )
}

export { Toaster }