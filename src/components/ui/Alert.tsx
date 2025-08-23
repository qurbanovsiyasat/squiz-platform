import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle, XCircle, Info } from "lucide-react"

type AlertVariant = "default" | "destructive" | "success" | "warning"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
}

const alertVariants = {
  default: {
    container: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
    icon: Info
  },
  destructive: {
    container: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
    icon: XCircle
  },
  success: {
    container: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
    icon: CheckCircle
  },
  warning: {
    container: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
    icon: AlertCircle
  }
}

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  const variantStyle = alertVariants[variant]
  const IconComponent = variantStyle.icon

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm flex items-start gap-3",
        variantStyle.container,
        className
      )}
      {...props}
    >
      <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        {props.children}
      </div>
    </div>
  )
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn("text-sm leading-relaxed", className)}
      {...props}
    />
  )
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  )
}
