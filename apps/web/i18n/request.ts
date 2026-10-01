import { getRequestConfig } from "next-intl/server"
import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale
  }

  // Load active translation files
  const [home, metadata, auth, roleGuard, dashboard] = await Promise.all([
    import(`../messages/${locale}/home.json`),
    import(`../messages/${locale}/metadata.json`),
    import(`../messages/${locale}/auth.json`),
    import(`../messages/${locale}/role_guard.json`),
    import(`../messages/${locale}/dashboard.json`),
  ])

  return {
    locale,
    messages: {
      ...home.default,
      ...metadata.default,
      ...auth.default,
      ...roleGuard.default,
      ...dashboard.default,
    },
  }
})
