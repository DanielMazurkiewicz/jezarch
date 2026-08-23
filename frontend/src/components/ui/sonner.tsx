import { Toaster as Sonner, ToasterProps } from "sonner"

// The app is light-theme only; the original shadcn wrapper depended on the
// `next-themes` package, which was never installed (phantom dependency that
// broke clean installs). A fixed theme keeps the same visuals without it.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
