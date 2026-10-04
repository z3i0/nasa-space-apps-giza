"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export interface LogoProps extends React.ComponentProps<"div"> {
  imageClassName?: string
  showPing?: boolean
  size?: "sm" | "md" | "lg" | "xl"
}

export function Logo({
  className,
  imageClassName,
  showPing = true,
  size = "md",
  ...props
}: LogoProps) {
  const sizeClasses = {
    sm: "size-7",
    md: "size-9",
    lg: "size-11",
    xl: "size-14",
  }

  return (
    <div
      data-slot="logo"
      className={cn(
        "relative flex aspect-square items-center justify-center shrink-0",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <div className="size-full rounded-full overflow-hidden bg-white shadow-xs ring-1 ring-black/10 dark:ring-white/20 flex items-center justify-center">
        <Image
          src="/logo.jpg"
          alt="NASA Space Apps Giza"
          width={96}
          height={96}
          className={cn(
            "size-full object-contain p-0.5 select-none transition-transform duration-300 group-hover:scale-105",
            imageClassName
          )}
          priority
        />
      </div>
    </div>
  )
}
