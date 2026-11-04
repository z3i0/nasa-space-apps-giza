"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import {
  ArrowLeft,
  ArrowRight,
  MessageSquarePlus,
  Loader2,
  Pin,
  Sparkles,
  Tag,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  createCommunityPost,
  uploadCommunityImages,
  type CommunityPost,
} from "@/lib/community"
import { useAuthUser } from "@/lib/auth"
import { CommunityImageUploader } from "./community-image-uploader"

interface CreatePostFormProps {
  basePath?: string
}

export function CreatePostForm({
  basePath = "/dashboard/participant/community",
}: CreatePostFormProps) {
  const t = useTranslations("Community")
  const locale = useLocale()
  const router = useRouter()
  const isRtl = locale === "ar"
  const currentUser = useAuthUser()

  const canPin = Boolean(
    currentUser &&
      (currentUser.role === "organizer" ||
        currentUser.role === "admin" ||
        currentUser.role === "competition" ||
        currentUser.roles?.includes("organizer") ||
        currentUser.roles?.includes("competition") ||
        currentUser.roles?.includes("admin"))
  )

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isPinned, setIsPinned] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  const quickTags = ["announcement", "team-progress", "ideas", "general", "earthdata"]

  const handleAddTag = (tag: string) => {
    const existing = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    if (!existing.includes(tag)) {
      setTagsInput([...existing, tag].join(", "))
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

      let uploadedImageUrls: string[] = []
      if (selectedFiles.length > 0) {
        uploadedImageUrls = await uploadCommunityImages(selectedFiles)
      }

      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)

      const created: CommunityPost = await createCommunityPost({
        title: title.trim(),
        content: content.trim(),
        tags: parsedTags,
        images: uploadedImageUrls,
        isPinned: canPin ? isPinned : false,
      })

      // Redirect to the newly created post
      router.push(`${basePath}/posts/${created.id}` as `/${string}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Top bar with back button */}
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(`${basePath}?tab=feed` as `/${string}`)}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <BackIcon className="h-4 w-4" />
          <span>{t("backToFeed")}</span>
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="p-5 sm:p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquarePlus className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold">
                {t("postModalTitle")}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                {t("postModalSubtitle")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs sm:text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-semibold">
                  {t("postFieldTitle")} <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">{title.length}/150</span>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("postFieldTitlePlaceholder")}
                required
                minLength={3}
                maxLength={150}
                className="h-11 text-sm font-medium"
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-semibold">
                  {t("postFieldContent")} <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">{content.length}/10000</span>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("postFieldContentPlaceholder")}
                required
                minLength={5}
                rows={7}
                className="resize-y text-sm leading-relaxed"
              />
            </div>

            {/* Image Uploader & Editor */}
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <CommunityImageUploader
                files={selectedFiles}
                onChange={setSelectedFiles}
                disabled={isSubmitting}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-primary" />
                <span>{t("postFieldTags")}</span>
              </label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder={t("postFieldTagsPlaceholder")}
                className="h-10 text-xs sm:text-sm"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground">{t("suggestedTags")}</span>
                {quickTags.map((qt) => (
                  <Badge
                    key={qt}
                    variant="secondary"
                    onClick={() => handleAddTag(qt)}
                    className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors text-[10px] px-2 py-0.5"
                  >
                    +{qt}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Pin option for privileged users */}
            {canPin && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
                <Checkbox
                  id="page-pin-post-checkbox"
                  checked={isPinned}
                  onCheckedChange={(checked) => setIsPinned(Boolean(checked))}
                />
                <label
                  htmlFor="page-pin-post-checkbox"
                  className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer"
                >
                  <Pin className="h-4 w-4 text-amber-500" />
                  <span>{t("pinPostCheckbox")}</span>
                </label>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`${basePath}?tab=feed` as `/${string}`)}
                disabled={isSubmitting}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || title.trim().length < 3 || content.trim().length < 5}
                className="gap-2 min-w-[130px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("publishing")}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{t("publishPost")}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
