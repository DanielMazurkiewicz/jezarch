// frontend/tailwind.config.ts

import type { Config } from "tailwindcss"
import animatePlugin from "tailwindcss-animate" // Import the animate plugin

// Correct the type for darkMode and ensure the overall structure satisfies Config
const config = {
  darkMode: "class", // Use the string 'class', not an array ['class']
  content: [
    // Scan all relevant files within the 'src' directory
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // Scan Shadcn component files (adjust path if your ui components are elsewhere)
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    // Include the root HTML file
    "./src/index.html",
  ],
  prefix: "", // No prefix for utility classes (standard Shadcn setup)
  theme: {
    container: {
      center: true,
      padding: "2rem", // Default container padding
      screens: {
        "2xl": "1400px", // Max width for the container
      },
    },
    extend: {
      // Map CSS variables from globals.css to Tailwind theme values
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Add Sidebar specific colors from globals.css
        sidebar: {
           DEFAULT: "hsl(var(--sidebar))",
           foreground: "hsl(var(--sidebar-foreground))",
           border: "hsl(var(--sidebar-border))",
           accent: {
             DEFAULT: "hsl(var(--sidebar-accent))",
             foreground: "hsl(var(--sidebar-accent-foreground))",
           }
        },
        // Add chart colors if you plan to use them with Tailwind classes
        chart: {
          '1': "hsl(var(--chart-1))",
          '2': "hsl(var(--chart-2))",
          '3': "hsl(var(--chart-3))",
          '4': "hsl(var(--chart-4))",
          '5': "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)", // Use the radius variable
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        // Shadcn UI Accordion animations
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Add the 'slide' animation from index.css
        "slide": {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "256px 224px" }, // Adjust if needed
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide": "slide 30s linear infinite", // Make usable as animate-slide
      },
      boxShadow: {
         // Standard shadow levels
         sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
         DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
         md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
         lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
         xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
         '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
         inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
         none: 'none',
       },
    },
  },
  plugins: [
      animatePlugin // Register the tailwindcss-animate plugin
    ],
} satisfies Config // Use "satisfies Config" for type checking

export default config