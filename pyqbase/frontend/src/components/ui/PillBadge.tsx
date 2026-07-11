import * as React from "react"

interface PillBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "exam"
}

export function PillBadge({ className = "", variant = "default", children, ...props }: PillBadgeProps) {
  let variantClasses = ""
  switch (variant) {
    case "success":
      variantClasses = "bg-success-bg text-success border-success/20"
      break
    case "warning":
      variantClasses = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500 border-yellow-200 dark:border-yellow-900/50"
      break
    case "danger":
      variantClasses = "bg-red-100 text-destructive dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/50"
      break
    case "exam":
      variantClasses = "bg-primary/10 text-primary border-primary/20"
      break
    default:
      variantClasses = "bg-muted text-muted-foreground border-border"
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
