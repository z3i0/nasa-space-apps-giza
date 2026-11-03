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
  createCommunityQuestion,
  uploadCommunityImages,
  type CommunityQuestion,
} from "@/lib/community"
import { Loader2, HelpCircle } from "lucide-react"
import { CommunityImageUploader } from "./community-image-uploader"

interface AskQuestionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuestionCreated: (newQuestion: CommunityQuestion) => void
}

export function AskQuestionModal({
  open,
  onOpenChange,
  onQuestionCreated,
}: AskQuestionModalProps) {
  const t = useTranslations("Community")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [category, setCategory] = useState<
    "technical" | "platform" | "challenge" | "general"
  >("general")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 5 || content.trim().length < 10) {
      setError(t("validationError"))
      return
    }

    try {
      setIsSubmitting(true)
      setError("")

      let uploadedImageUrls: string[] = []
      if (selectedFiles.length > 0) {
        uploadedImageUrls = await uploadCommunityImages(selectedFiles)
      }

      const created = await createCommunityQuestion({
        title: title.trim(),
        content: content.trim(),
        category,
        images: uploadedImageUrls,
      })
      setTitle("")
      setContent("")
      setSelectedFiles([])
      setCategory("general")
      onOpenChange(false)
      onQuestionCreated(created)
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
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {t("modalTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t("modalSubtitle")}
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
              maxLength={5000}
              required
            />
            <div className="flex justify-end text-[11px] text-muted-foreground">
              {content.length}/5000
            </div>
          </div>

          {/* Image Uploader */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <CommunityImageUploader
              files={selectedFiles}
              onChange={setSelectedFiles}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || title.length < 5 || content.length < 10}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("publishing")}
                </>
              ) : (
                t("publishQuestion")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
