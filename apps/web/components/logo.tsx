"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export interface LogoProps extends React.ComponentProps<"div"> {
  imageClassName?: string
  size?: "sm" | "md" | "lg" | "xl"
}

export function Logo({
  className,
  imageClassName,
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
        "relative flex aspect-square shrink-0 items-center justify-center",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-white shadow-xs ring-1 ring-black/10 dark:ring-white/20">
        <Image
          src="/logo.jpg"
          alt="NASA Space Apps Giza"
          width={96}
          height={96}
          className={cn(
            "size-full object-contain p-0.5 transition-transform duration-300 select-none group-hover:scale-105",
            imageClassName
          )}
          priority
        />
      </div>
    </div>
  )
}
