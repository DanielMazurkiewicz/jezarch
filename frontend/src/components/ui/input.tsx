import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Use neutral colors for placeholder, file text, border
        "file:text-neutral-900 placeholder:text-neutral-500 border-neutral-300",
        // Selection colors can remain theme-based or forced
        "selection:bg-primary selection:text-primary-foreground",
        // Force white background and dark text
        "bg-white dark:bg-white text-neutral-900 dark:text-neutral-900",
        // Standard layout, focus, invalid styles
        "flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // --- UPDATED FOCUS STYLES ---
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // -----------------------------
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }