"use client"

import * as React from "react"
import { cn } from "cn"

interface ProgressProps extends React.ComponentProps<"div"> {
  value?: number
  max?: number
  indicatorClassName?: string
}

function Progress({
  className,
  value = 0,
  max = 100,
  indicatorClassName,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, ((value ?? 0) / (max || 100)) * 100))

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted/60",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          "h-full bg-primary transition-all duration-500 ease-out rounded-full",
          indicatorClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export { Progress }
