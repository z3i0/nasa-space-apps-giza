"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  updateCommunityPost,
  uploadCommunityImages,
  type CommunityPost,
} from "@/lib/community"
import { Edit3, Loader2, Pin } from "lucide-react"
import { CommunityImageUploader } from "./community-image-uploader"

interface EditPostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: CommunityPost
  onPostUpdated: (updated: CommunityPost) => void
  canPin?: boolean
}

export function EditPostModal({
  open,
  onOpenChange,
  post,
  onPostUpdated,
  canPin = false,
}: EditPostModalProps) {
  const t = useTranslations("Community")
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)
  const [tagsInput, setTagsInput] = useState((post.tags || []).join(", "))
  const [existingUrls, setExistingUrls] = useState<string[]>(post.images || [])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isPinned, setIsPinned] = useState(Boolean(post.isPinned))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setTitle(post.title)
      setContent(post.content)
      setTagsInput((post.tags || []).join(", "))
      setExistingUrls(post.images || [])
      setSelectedFiles([])
      setIsPinned(Boolean(post.isPinned))
      setError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 3 || content.trim().length < 5) {
      setError(t("validationError"))
      return
    }

    try {
      setIsSubmitting(true)
      setError("")

      let newUploadedUrls: string[] = []
      if (selectedFiles.length > 0) {
        newUploadedUrls = await uploadCommunityImages(selectedFiles)
      }

      const finalImages = [...existingUrls, ...newUploadedUrls]

      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)

      const updated = await updateCommunityPost(post.id, {
        title: title.trim(),
        content: content.trim(),
        tags: parsedTags,
        images: finalImages,
        isPinned: canPin ? isPinned : undefined,
      })
      onOpenChange(false)
      onPostUpdated(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {t("editPostModalTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("editPostModalSubtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">
              {t("postFieldTitle")} <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("postFieldTitlePlaceholder")}
              required
              minLength={3}
              maxLength={150}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">
              {t("postFieldContent")} <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("postFieldContentPlaceholder")}
              required
              minLength={5}
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">
              {t("postFieldTags")}
            </label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t("postFieldTagsPlaceholder")}
              className="text-xs"
            />
          </div>

          {/* Image Uploader & Editor */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <CommunityImageUploader
              files={selectedFiles}
              onChange={setSelectedFiles}
              existingUrls={existingUrls}
              onExistingUrlsChange={setExistingUrls}
              disabled={isSubmitting}
            />
          </div>

          {canPin && (
            <div className="flex items-center gap-2 pt-1 rounded-lg border p-3">
              <Checkbox
                id="pin-post-edit-checkbox"
                checked={isPinned}
                onCheckedChange={(checked) => setIsPinned(Boolean(checked))}
              />
              <label
                htmlFor="pin-post-edit-checkbox"
                className="flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              >
                <Pin className="h-3.5 w-3.5 text-amber-500" />
                <span>{t("pinPostCheckbox")}</span>
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-3 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>{t("savingChanges")}</span>
                </>
              ) : (
                t("saveChanges")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
