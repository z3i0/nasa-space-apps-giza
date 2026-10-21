"use client"

import * as React from "react"
import { useLocale } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfirmActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  icon?: LucideIcon
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  icon: Icon = AlertTriangle,
  loading = false,
  onConfirm,
}: ConfirmActionDialogProps) {
  const locale = useLocale()

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent
        className="max-w-md gap-5 rounded-2xl p-6 sm:p-7"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                variant === "destructive"
                  ? "bg-destructive/10 text-destructive ring-destructive/20"
                  : "bg-primary/10 text-primary ring-primary/20"
              )}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold sm:text-lg">
                {title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 pt-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-9 cursor-pointer rounded-xl text-xs sm:text-sm"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            disabled={loading}
            onClick={onConfirm}
            className="h-9 cursor-pointer gap-1.5 rounded-xl text-xs font-semibold shadow-xs sm:text-sm"
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
