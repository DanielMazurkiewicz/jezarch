import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40", // Removed dark:bg-destructive/60 as bg is forced white now
        outline:
          "border bg-white text-neutral-900 shadow-xs hover:bg-neutral-100 hover:text-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-neutral-300 dark:hover:bg-neutral-100", // Force white bg, neutral text/border
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80", // Secondary should work on white
        ghost:
          "text-neutral-900 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-900 dark:hover:bg-neutral-100", // Adjusted for white bg
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(
          buttonVariants({ variant, size }),
          // --- UPDATED FOCUS STYLES ---
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // -----------------------------
          className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }