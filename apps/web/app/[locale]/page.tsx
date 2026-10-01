import { getTranslations, setRequestLocale } from "next-intl/server"
import { buttonVariants } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogIn, Info } from "lucide-react"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const tHome = await getTranslations("Home")

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      {/* Top Header with Language Switcher & Theme Toggle */}
      <header className="relative z-50 w-full flex justify-end items-center p-4 sm:p-6 gap-3 pointer-events-auto">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      {/* Centered Main Content without negative margins */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-3xl w-full text-center flex flex-col items-center gap-8 -translate-y-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            {tHome("welcome")}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "h-12 px-8 text-base font-semibold shadow-md gap-2"
              )}
            >
              <LogIn className="h-5 w-5" />
              <span>{tHome("enter")}</span>
            </Link>

            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 px-8 text-base font-medium gap-2"
              )}
            >
              <Info className="h-5 w-5" />
              <span>{tHome("more")}</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
