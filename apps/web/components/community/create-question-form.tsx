"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Loader2,
  Sparkles,
  Code2,
  Globe2,
  Compass,
  FileQuestion,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { CommunityImageUploader } from "./community-image-uploader"

interface CreateQuestionFormProps {
  basePath?: string
}

export function CreateQuestionForm({
  basePath = "/dashboard/participant/community",
}: CreateQuestionFormProps) {
  const t = useTranslations("Community")
  const locale = useLocale()
  const router = useRouter()
  const isRtl = locale === "ar"

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState<
    "technical" | "platform" | "challenge" | "general"
  >("general")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  const categoryOptions = [
    {
      id: "technical",
      label: t("technical"),
      icon: Code2,
      desc: t("categoryTechnicalDesc"),
    },
    {
      id: "challenge",
      label: t("challenge"),
      icon: Compass,
      desc: t("categoryChallengeDesc"),
    },
    {
      id: "platform",
      label: t("platform"),
      icon: Globe2,
      desc: t("categoryPlatformDesc"),
    },
    {
      id: "general",
      label: t("general"),
      icon: FileQuestion,
      desc: t("categoryGeneralDesc"),
    },
  ] as const

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

      const created: CommunityQuestion = await createCommunityQuestion({
        title: title.trim(),
        content: content.trim(),
        category,
        images: uploadedImageUrls,
      })

      // Redirect to the newly created question
      router.push(`${basePath}/${created.id}` as `/${string}`)
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
          onClick={() => router.push(`${basePath}?tab=qa` as `/${string}`)}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <BackIcon className="h-4 w-4" />
          <span>{t("backToQuestions")}</span>
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="p-5 sm:p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold">
                {t("modalTitle")}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                {t("modalSubtitle")}
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

            {/* Category Selector Cards */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold">
                {t("fieldCategory")} <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categoryOptions.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = category === cat.id
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                          : "border-border/70 hover:border-primary/40 bg-muted/20"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          {cat.label}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {cat.desc}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Question Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-semibold">
                  {t("fieldTitle")} <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">{title.length}/200</span>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("fieldTitlePlaceholder")}
                required
                minLength={5}
                maxLength={200}
                className="h-11 text-sm font-medium"
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-semibold">
                  {t("fieldContent")} <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground">{content.length}/5000</span>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("fieldContentPlaceholder")}
                required
                minLength={10}
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

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`${basePath}?tab=qa` as `/${string}`)}
                disabled={isSubmitting}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || title.trim().length < 5 || content.trim().length < 10}
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
                    <span>{t("publishQuestion")}</span>
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
