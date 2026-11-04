"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import {
  ImagePlus,
  X,
  AlertCircle,
  RotateCw,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface CommunityImageUploaderProps {
  files: File[]
  onChange: (files: File[]) => void
  existingUrls?: string[]
  onExistingUrlsChange?: (urls: string[]) => void
  maxFiles?: number
  maxSizeMB?: number
  disabled?: boolean
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

/**
 * Rotates an image File by 90 degrees clockwise using HTML5 Canvas.
 */
async function rotateImageFile(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(file)
        return
      }

      // Rotate 90 degrees: swap width and height
      canvas.width = img.height
      canvas.height = img.width

      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((90 * Math.PI) / 180)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)

      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg"
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const rotated = new File([blob], file.name, {
            type: outputType,
            lastModified: Date.now(),
          })
          resolve(rotated)
        },
        outputType,
        0.92
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }
    img.src = objectUrl
  })
}

export function CommunityImageUploader({
  files,
  onChange,
  existingUrls = [],
  onExistingUrlsChange,
  maxFiles = 4,
  maxSizeMB = 5,
  disabled = false,
}: CommunityImageUploaderProps) {
  const t = useTranslations("Community")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [replacingFileIndex, setReplacingFileIndex] = useState<number | null>(null)
  const [rotatingIndex, setRotatingIndex] = useState<number | null>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Generate preview URLs for newly selected files
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [files])

  const totalCount = existingUrls.length + files.length

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null)
    const incoming = Array.from(e.target.files || [])
    if (incoming.length === 0) return

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    if (totalCount + incoming.length > maxFiles) {
      setErrorMessage(t("errorMaxImages"))
      return
    }

    const validated: File[] = []
    const maxSizeBytes = maxSizeMB * 1024 * 1024

    for (const file of incoming) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        setErrorMessage(t("errorInvalidFormat"))
        return
      }

      if (file.size > maxSizeBytes) {
        setErrorMessage(t("errorImageTooLarge"))
        return
      }

      validated.push(file)
    }

    onChange([...files, ...validated])
  }

  // Handle single file replacement
  const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null)
    const incoming = e.target.files?.[0]
    if (!incoming || replacingFileIndex === null) return

    if (replaceInputRef.current) {
      replaceInputRef.current.value = ""
    }

    if (!ALLOWED_MIME_TYPES.has(incoming.type)) {
      setErrorMessage(t("errorInvalidFormat"))
      return
    }

    if (incoming.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(t("errorImageTooLarge"))
      return
    }

    const updated = [...files]
    updated[replacingFileIndex] = incoming
    onChange(updated)
    setReplacingFileIndex(null)
  }

  // Rotate a file by 90 degrees
  const handleRotate = async (idx: number) => {
    const targetFile = files[idx]
    if (!targetFile || rotatingIndex !== null || disabled) return

    try {
      setRotatingIndex(idx)
      const rotated = await rotateImageFile(targetFile)
      const updated = [...files]
      updated[idx] = rotated
      onChange(updated)
    } catch {
      // ignore
    } finally {
      setRotatingIndex(null)
    }
  }

  // Move a new file left/right
  const handleMoveFile = (idx: number, direction: "left" | "right") => {
    const targetIdx = direction === "left" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= files.length) return

    const updated = [...files]
    const temp = updated[idx]
    updated[idx] = updated[targetIdx]
    updated[targetIdx] = temp
    onChange(updated)
  }

  // Remove a new file
  const handleRemoveFile = (index: number) => {
    setErrorMessage(null)
    onChange(files.filter((_, i) => i !== index))
  }

  // Remove an existing url
  const handleRemoveExistingUrl = (index: number) => {
    setErrorMessage(null)
    onExistingUrlsChange?.(existingUrls.filter((_, i) => i !== index))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-foreground/90 flex items-center gap-1.5">
          <ImagePlus className="h-4 w-4 text-primary" />
          <span>{t("attachImages")}</span>
        </label>
        <span className="text-[11px] font-medium text-muted-foreground">
          {t("imagesCount", { count: totalCount })}
        </span>
      </div>

      {/* Hidden file input for batch adding */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || totalCount >= maxFiles}
        onChange={handleSelectFiles}
      />

      {/* Hidden file input for single image replacement */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled}
        onChange={handleReplaceFileChange}
      />

      {/* Error alert if validation fails */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Thumbnails grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Existing Published Images (if in edit mode) */}
        {existingUrls.map((url, idx) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted/40 shadow-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`existing ${idx + 1}`}
              className="h-full w-full object-cover"
            />
            {idx === 0 && (
              <div className="absolute top-1.5 start-1.5 flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground backdrop-blur-xs">
                <Star className="h-2.5 w-2.5 fill-current" />
                <span>{t("coverImage")}</span>
              </div>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveExistingUrl(idx)}
                className="absolute top-1.5 end-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white transition-colors hover:bg-destructive"
                aria-label={t("removeImage")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {/* 2. Newly Added Files */}
        {previews.map((url, idx) => {
          const isRotating = rotatingIndex === idx
          const isCover = existingUrls.length === 0 && idx === 0

          return (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted/40 shadow-xs transition-all hover:border-primary/50"
            >
              {/* Image Preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`preview ${idx + 1}`}
                className="h-full w-full object-cover transition-transform duration-200"
              />

              {/* Cover Badge */}
              {isCover && (
                <div className="absolute top-1.5 start-1.5 flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground backdrop-blur-xs shadow-xs">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  <span>{t("coverImage")}</span>
                </div>
              )}

              {/* File size badge */}
              <div className="absolute bottom-1.5 start-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                {formatSize(files[idx]?.size || 0)}
              </div>

              {/* Action Toolbar on Hover / Mobile */}
              {!disabled && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                  <div className="flex items-center justify-between">
                    {/* Rotate button */}
                    <button
                      type="button"
                      disabled={isRotating}
                      onClick={() => handleRotate(idx)}
                      title={t("rotateImage")}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-primary transition-colors"
                    >
                      {isRotating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3" />
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      title={t("removeImage")}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Bottom tools: Reorder & Replace */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveFile(idx, "left")}
                          title={t("moveLeft")}
                          className="flex h-5 w-5 items-center justify-center rounded-md bg-black/70 text-white hover:bg-black"
                        >
                          <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                        </button>
                      )}
                      {idx < files.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveFile(idx, "right")}
                          title={t("moveRight")}
                          className="flex h-5 w-5 items-center justify-center rounded-md bg-black/70 text-white hover:bg-black"
                        >
                          <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setReplacingFileIndex(idx)
                        replaceInputRef.current?.click()
                      }}
                      title={t("changeImage")}
                      className="flex h-5 items-center gap-1 rounded-md bg-black/70 px-1.5 text-[9px] text-white hover:bg-primary"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      <span>{t("changeImage")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* 3. Add More Button */}
        {totalCount < maxFiles && (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border-dashed border-2 border-border/80 p-0 text-muted-foreground transition-all hover:border-primary/60 hover:bg-primary/5 hover:text-primary cursor-pointer"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] font-medium">+ {t("attachImages")}</span>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground">
        <span>{t("imagesHint")}</span>
        {files.length > 0 && (
          <span className="text-[10px] text-primary font-medium">
            {t("imageEditorTip")}
          </span>
        )}
      </div>
    </div>
  )
}
