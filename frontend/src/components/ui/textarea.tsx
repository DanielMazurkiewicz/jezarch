import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Use neutral border, placeholder text
        "border-neutral-300 placeholder:text-neutral-500",
        // Standard focus/invalid styles
        "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Force white background and dark text
        "bg-white dark:bg-white text-neutral-900 dark:text-neutral-900",
        "flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // --- UPDATED FOCUS STYLES ---
         "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // -----------------------------
        className
      )}
      {...props}
    />
  )
}

export { Textarea }