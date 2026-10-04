import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import { Noto_Sans_Arabic, Inter, Geist_Mono } from "next/font/google"
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"

import "../globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DirectionProvider } from "@/components/ui/direction"
import { TooltipProvider } from "@/components/ui/tooltip"
import { routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Metadata" })

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  setRequestLocale(locale)

  const cookieStore = await cookies()
  const themeCookie = cookieStore.get("theme")?.value
  const isDarkFromCookie = themeCookie === "dark"

  const messages = await getMessages()
  const dir = locale === "ar" ? "rtl" : "ltr"

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        isDarkFromCookie && "dark",
        notoSansArabic.variable,
        inter.variable,
        fontMono.variable,
        locale === "ar"
          ? "font-[family-name:var(--font-arabic)]"
          : "font-[family-name:var(--font-latin)]"
      )}
    >
      <body>
        <DirectionProvider direction={dir}>
          <ThemeProvider defaultTheme={(themeCookie as "light" | "dark" | "system") || "system"}>
            <TooltipProvider>
              <NextIntlClientProvider locale={locale} messages={messages}>
                {children}
              </NextIntlClientProvider>
            </TooltipProvider>
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  )
}
