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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  updateCommunityQuestion,
  uploadCommunityImages,
  type CommunityQuestion,
} from "@/lib/community"
import { Edit3, Loader2 } from "lucide-react"
import { CommunityImageUploader } from "./community-image-uploader"

interface EditQuestionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: CommunityQuestion
  onQuestionUpdated: (updated: CommunityQuestion) => void
}

export function EditQuestionModal({
  open,
  onOpenChange,
  question,
  onQuestionUpdated,
}: EditQuestionModalProps) {
  const t = useTranslations("Community")
  const [title, setTitle] = useState(question.title)
  const [content, setContent] = useState(question.content)
  const [category, setCategory] = useState<
    "technical" | "platform" | "challenge" | "general"
  >(question.category)
  const [existingUrls, setExistingUrls] = useState<string[]>(question.images || [])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setTitle(question.title)
      setContent(question.content)
      setCategory(question.category)
      setExistingUrls(question.images || [])
      setSelectedFiles([])
      setError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 5 || content.trim().length < 10) {
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

      const updated = await updateCommunityQuestion(question.id, {
        title: title.trim(),
        content: content.trim(),
        category,
        images: finalImages,
      })
      onOpenChange(false)
      onQuestionUpdated(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const categoryOptions = [
    { id: "technical", label: t("technical") },
    { id: "platform", label: t("platform") },
    { id: "challenge", label: t("challenge") },
    { id: "general", label: t("general") },
  ] as const

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
                {t("editQuestionModalTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("editQuestionModalSubtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t("fieldTitle")} <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("fieldTitlePlaceholder")}
              maxLength={200}
              required
            />
            <div className="flex justify-end text-[11px] text-muted-foreground">
              {title.length}/200
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t("fieldCategory")}
            </label>
            <Select
              value={category}
              onValueChange={(val) => {
                if (val) {
                  setCategory(
                    val as "technical" | "platform" | "challenge" | "general"
                  )
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(val) =>
                    categoryOptions.find((cat) => cat.id === val)?.label ?? val
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t("fieldContent")} <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("fieldContentPlaceholder")}
              rows={5}
              required
              minLength={10}
              maxLength={5000}
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
