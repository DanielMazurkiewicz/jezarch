import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 aria-invalid:border-destructive/60 dark:aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:outline-destructive/60 dark:aria-invalid:outline-destructive aria-invalid:focus-visible:ring-[3px] flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 dark:aria-invalid:focus-visible:ring-4",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }