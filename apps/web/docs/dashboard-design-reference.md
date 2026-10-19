# Dashboard foundation — NASA V1

## Boundaries

This milestone implements the shared dashboard shell, not the individual feature pages. Existing page bodies and backend behavior are retained. Profile, authentication repairs, and other functional work follow in separate milestones.

The existing landing page is the source of truth for `/ar` and `/en`. Do not replace it with the Figma landing page or modify its components, assets, translations, root layout, global CSS, or shared UI primitives to implement dashboard styling.

## References

- [Figma design, node 90:373](https://www.figma.com/design/pBUveQll506ydWr33phJAh/NASA-V1?node-id=90-373)
- [Published interactive reference](https://cactus-mango-36876487.figma.site/#/profile)
- Reference reviewed on 17 October 2026. The Figma connector was unavailable; the supplied published prototype was inspected through its source, styles, and rendered desktop/mobile screenshots.
- Published source: `assets/index-V9IGpfVd.js`; stylesheet: `assets/index-DyAyJkc_.css`.
- Original asset provenance and SHA-256 hashes: `public/dashboard/manifest.json`. Files are copied without redrawing or recoloring. Font licenses are alongside the local font files.

## Visual contract

| Element | Reference |
| --- | --- |
| Header | 72px desktop, 64px at widths up to 760px |
| Sidebar | 224px wide, below the full-width header; horizontal scrollable navigation on mobile |
| Desktop content | 28px top, 40px inline; 24px inline up to 1050px |
| Mobile content | 20px top, 16px inline, 32px bottom |
| Background / sidebar | `#080d20` / `#070c1e` |
| Card / border | `#111b2d` / `#2a3950` |
| Main / muted text | `#e0e2ef` / `#a8b5ca` |
| Navigation accent | `#7df4ff` |
| Primary action | `#fb9746`, dark foreground |
| English fonts | Original Inter and Space Grotesk exports, locally served |
| Arabic font | Existing Noto Sans Arabic; logical spacing and mirrored navigation |

`dashboard-shell.module.css` owns dashboard tokens. The theme is attached to the shell and explicitly to portalled account/search surfaces. It never updates the saved theme cookie or the root theme class. A conditional `html:has(.shell)` rule gives dashboard routes a dark scrollbar without affecting the landing page after navigation.

The Figma font exports render in browsers but are not supported by Turbopack's automatic fallback-metrics parser. `adjustFontFallback: false` preserves the original fonts, with Next.js local-font loading and preloading intact.

## Navigation contract

All routes remain localized through `next-intl`.

| Prototype route | Existing application route |
| --- | --- |
| `mission` | `/dashboard/participant` |
| `challenges` | `/dashboard/participant/challenges` |
| `find-team` | `/dashboard/participant/find-team` |
| `team` | `/dashboard/participant/team` |
| `tasks` | `/dashboard/participant/tasks` |
| `community` | `/dashboard/participant/community` |
| `agenda` | `/dashboard/participant/schedule` |
| `mentors` | `/dashboard/participant/mentorship` |
| `submission` | `/dashboard/participant/submit` |
| `profile` | `/dashboard/participant/profile`, accessed from the account menu |

The profile screen does not highlight any sidebar items as it is accessed from the account menu. Route matching uses segment boundaries so `team-library` does not accidentally activate `team`. Organizer, judge, and mentor navigation retains the existing configuration. Secondary participant destinations remain available through keyboard search.

## Intentional adaptations

- Header branding returns to the existing landing page.
- The account control opens the existing accessible menu primitive, with profile, language, search, available role views, and logout. Keyboard search remains available through Ctrl/Cmd+K.
- Sample notifications, fake unread counts, demonstration disclaimers, and the static prototype timestamp are not presented as live application data.
- Dark-only dashboard styling does not change the landing page's theme behavior.
- No generated images. If an original asset cannot be extracted, request that specific file from the user.

## Agreed rules for later milestones

Keep the current framework/database stack. Teams have at most five members. Submissions remain editable until the configured deadline. Support Arabic and English, in-app team messaging, persistent-directory uploads, and configurable SMTP. Plan for roughly 1,000 participants and benchmark a simultaneous-use burst before making capacity claims.

## Verification

Run `pnpm --filter web test:browser` with local Chrome installed, or set `PLAYWRIGHT_CHANNEL=chromium` after installing the Playwright Chromium browser. These are browser UI tests with synthetic session fixtures, not authentication or backend tests.

The suite covers five widths (320, 390, 768, 1024, 1440), both languages, active navigation, original asset loading/geometry, portalled dark styling, language switching, keyboard search, existing role navigation, and client navigation back to the unchanged landing theme. Screenshots and failure traces are written to the ignored `.playwright/results/` directory.

Before/after landing screenshots and protected-file hashes from this implementation review are stored locally in `.playwright/shell-review/`. Future milestones should repeat this protection check before editing shared presentation code.

Milestone verification on 17 October 2026:

- Production build and TypeScript checks passed; ESLint passed for the changed TypeScript files.
- All 16 browser checks passed against the production server.
- All 67 protected landing/shared files retained their original hashes.
- English and Arabic landing comparisons at 1440px and 390px had identical element counts, geometry, and captured computed styles. Before/after screenshots were also visually reviewed; they are not pixel-identical captures across development and production.
- All 19 extracted image/icon/font files match their recorded source hashes.
- Concurrent-user capacity has not been load tested in this UI milestone; backend reliability and capacity testing remain future work.
