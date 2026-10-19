import { getRequestConfig } from "next-intl/server"
import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale
  }

  // Load active translation files
  const [
    home,
    metadata,
    auth,
    roleGuard,
    dashboard,
    teams,
    teamWork,
    mentorship,
    challenges,
    judging,
    account,
    operations,
  ] = await Promise.all([
    import(`../messages/${locale}/home.json`),
    import(`../messages/${locale}/metadata.json`),
    import(`../messages/${locale}/auth.json`),
    import(`../messages/${locale}/role_guard.json`),
    import(`../messages/${locale}/dashboard.json`),
    import(`../messages/${locale}/teams.json`),
    import(`../messages/${locale}/team-work.json`),
    import(`../messages/${locale}/mentorship.json`),
    import(`../messages/${locale}/challenges.json`),
    import(`../messages/${locale}/judging.json`),
    import(`../messages/${locale}/account.json`),
    import(`../messages/${locale}/operations.json`),
  ])

  return {
    locale,
    messages: {
      ...home.default,
      ...metadata.default,
      ...auth.default,
      ...roleGuard.default,
      ...dashboard.default,
      ...teams.default,
      ...teamWork.default,
      ...mentorship.default,
      ...challenges.default,
      ...judging.default,
      ...account.default,
      ...operations.default,
    },
  }
})
