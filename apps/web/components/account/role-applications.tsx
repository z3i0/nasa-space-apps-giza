"use client"
import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { useTranslations } from "next-intl"
import { Check, X, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { accountApi, type RoleApplication } from "@/lib/account"
import { cn } from "@/lib/utils"
export function RoleApplications({
  role,
  embedded = false,
}: {
  role?: "mentor" | "judge"
  embedded?: boolean
}) {
  const t = useTranslations("Account")
  const { mutate: globalMutate } = useSWRConfig()

  const {
    data: items,
    error: swrError,
    mutate,
  } = useSWR<RoleApplication[]>("/role-applications", {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  })

  const [reviewError, setReviewError] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [reasons, setReasons] = useState<Record<string, string>>({})

  const error = reviewError || (swrError ? swrError.message : "")

  async function review(id: string, decision: string) {
    if (busy) return
    setBusy(true)
    setReviewError("")
    setNotice("")
    try {
      await accountApi(`/role-applications/${id}/review`, {
        decision,
        reason: reasons[id] ?? items?.find((a) => a.id === id)?.reason ?? "",
        expectedStatus: items?.find((a) => a.id === id)?.status,
      })
      await mutate()
      void globalMutate("/organizer-summary")
      setNotice(t("reviewed"))
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : t("error"))
    } finally {
      setBusy(false)
    }
  }
  const panel = "rounded-2xl border border-border bg-card p-6"
  const visibleItems = items
    ?.filter((item) => !role || item.role === role)
    .sort(
      (a, b) => Number(b.status === "pending") - Number(a.status === "pending")
    )
  const Heading = embedded ? "h2" : "h1"

  const renderStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <Badge variant="default" className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30">
          <Check className="size-3 me-1" />
          {t(`label_${status}`)}
        </Badge>
      )
    }
    if (status === "rejected") {
      return (
        <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/30">
          <X className="size-3 me-1" />
          {t(`label_${status}`)}
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
        <Clock className="size-3 me-1" />
        {t(`label_${status}`)}
      </Badge>
    )
  }

  return (
    <div className={cn("mx-auto grid gap-6", !embedded && "max-w-6xl")}>
      {!embedded && (
        <Card className="border-border/60">
          <CardHeader className="p-6">
            <Heading className="text-2xl font-bold tracking-tight text-foreground">
              {role
                ? t("roleApprovalsTitle", { role: t(role) })
                : t("applicationsTitle")}
            </Heading>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("applicationsHelp")}
            </p>
          </CardHeader>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setReviewError("")
              void mutate()
            }}
          >
            {t("retry")}
          </Button>
        </Card>
      )}

      {notice && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          {notice}
        </Card>
      )}

      {!items ? (
        <p role="status" className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : !visibleItems?.length ? (
        <Card className="p-12 text-center border-dashed border-border/80">
          <Clock className="mx-auto size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t("noApplications")}</p>
        </Card>
      ) : (
        visibleItems.map((a) => (
          <Card className="border-border/60 hover:border-border transition-all" key={a.id}>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-foreground">{a.user?.name}</h3>
                  <p className="text-xs break-all text-muted-foreground">
                    {a.user?.email}
                  </p>
                  <p className="text-xs font-medium text-foreground/80 pt-1">
                    {t("requestedRole", { role: t(a.role) })}
                  </p>
                </div>
                {renderStatusBadge(a.status)}
              </div>

              <div className="mt-4 flex flex-col gap-3 pt-3 border-t border-border/40">
                <label className="text-xs font-medium text-muted-foreground block">
                  {t("reviewReason")}
                  <Textarea
                    maxLength={1000}
                    disabled={busy}
                    value={reasons[a.id] ?? a.reason}
                    onChange={(e) =>
                      setReasons((old) => ({ ...old, [a.id]: e.target.value }))
                    }
                    placeholder={t("reviewReasonPlaceholder")}
                    className="mt-1.5 min-h-[70px] text-xs resize-none"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy || a.status === "approved"}
                    onClick={() => void review(a.id, "approved")}
                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check className="size-3.5" />
                    <span>{t("approve")}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || a.status === "rejected"}
                    onClick={() => void review(a.id, "rejected")}
                    className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <X className="size-3.5" />
                    <span>{t("reject")}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
