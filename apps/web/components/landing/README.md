# Giza landing page

Implemented from Figma **Desktop - 4**, file `XaxQZFezfTY1aNYhuRYf2m`, node `31:80`, plus the supplied project brief.

The localized home route and briefing content are Server Components. `SpaceScene` and `MissionDeck` handle browser interaction. Existing locale navigation, language switcher, button variants, and Lucide icons are reused. The hero uses the supplied Pinnacle Extra Bold (WOFF2) and Space Rabbit Regular (OTF) through `next/font/local`, scoped to the landing route. Font files live in `public/fonts`. Inter and Noto Sans Arabic remain the body fonts; the English hero title keeps its design fonts in both locales.

## Motion

Each illustration has separate wrappers for scroll displacement, entry animation, and floating. Entries ease out at different durations/delays, followed by visible horizontal/vertical drift and gentle rotation over 4.5–8 seconds. Hero text enters in sequence. Scroll displacement uses independent depth multipliers: Earth 0.12, Saturn 0.18, Jupiter 0.30, Neptune 0.46, meteor 0.76. The meteor also rotates with scroll. Mobile displacement is scaled to 70% and bounded to keep the scene composed. Fine pointers add subtle depth movement; touch users see automatic floating without needing to hover.

Passive scroll and pointer listeners schedule animation frames only until transforms settle, without React renders or a continuous JavaScript loop. An intersection observer and page visibility listener suspend motion off-screen or in a hidden tab. The pause button freezes floating, entrances, the scroll cue, and parallax; reduced-motion preferences remove motion entirely. Mobile uses an automatic-height hero with dedicated space above and below the copy, keeping the planets visible inside the screen and the cockpit below the call to action.

## Local illustrations

Shipped illustrations are local assets in `public/space`, with alpha preserved. Saturn uses the supplied original PNG; other planets use WebP. No temporary Figma URLs are used by the page.

| Asset          | Source                                                    | Position               |
| -------------- | --------------------------------------------------------- | ---------------------- |
| nebula.webp    | Figma `31:114`                                            | Hero background        |
| saturn.png     | User-supplied Colorful Cartoon Planet Collection.png      | Cropped upper left     |
| earth.webp     | Figma `31:108`                                            | Upper right            |
| jupiter.webp   | Figma `31:106`                                            | Lower left             |
| neptune.webp   | Figma `31:105`                                            | Lower right            |
| meteor.webp    | Transparent source of Figma `31:85`, cropped to its layer | Upper center-right     |
| cockpit.webp   | Figma `47:146`                                            | Hero foreground        |
| spaceship.webp | User-provided spaceship.png                               | Registration companion |

Figma's planet source images are pre-stretched; their displayed aspect ratios deliberately follow the Figma layer dimensions. Saturn uses the original 759 x 459 PNG at its natural aspect ratio, served without another lossy compression pass. Meteor retains its transparent source and Figma crop ratio. Next Image supplies responsive sizes for the other assets.

## Content and registration

English and Arabic copy lives in `messages/{locale}/home.json`. The hero and mission CTAs scroll to the registration section. The portal link uses the existing `/login` route and is explicitly for existing accounts. No registration endpoint, confirmed edition number, or date was supplied; replace the registration status with confirmed event details and the official registration link when available. The Figma placeholder countdown is intentionally omitted.

## Checks

### Mission timeline

`MissionTimeline` presents four event checkpoints after the challenge deck: the bootcamp, team registration opening, registration deadline, and hackathon. English and Arabic content lives under `Home.timeline`.

Checkpoint tabs, Previous/Next, arrow keys, Home/End, and horizontal touch swipes share one active phase. Vertical gestures retain native page scrolling. Completed dotted connectors draw into SVG waves, the existing spacecraft travels between checkpoints, and the planetary system rotates once per navigation while counter-rotating its planets. All transitions stop under reduced-motion preferences; there are no continuous animation loops or new dependencies. The mobile track keeps four numbered, accessible checkpoints and places the planetary decoration below the briefing.

Run `node scripts/verify-timeline.mjs` with the Playwright environment options below. It checks every phase at 320/390/768/1440 pixels in both languages, navigation boundaries, keyboard focus, real touch input, asset loading, planet/text separation, page overflow, reduced motion, and intermediate ship/orbit/trail animation states.

### Mission deck

`mission-data.ts` holds the briefing entry followed by the 14 supplied 2026 challenges. Official titles, summaries, difficulty levels, subject lists, and destination URLs are preserved. The supplied double-slash URLs and `?tab=teams` query strings are intentional. Challenge copy stays in its supplied English; controls and briefing use the existing English/Arabic messages.

The briefing uses a compact two-column layout on laptops, with benefits expanded alongside the introduction. On phones, benefits collapse into accessible tap-to-expand rows. Card spacing, repeated labels, and minimum heights are reduced so the whole card fits typical phone and laptop screens.

The cards use theme-specific accent colors and mission-file typography without pictures or generated imagery. Native horizontal scrolling and CSS snap points support touch and trackpads without a carousel dependency. Buttons, progress markers, arrow keys, Home, and End navigate the deck. Inactive cards are inert, focus is retained in the carousel when leaving a card, and the counter is announced. Reduced motion skips smooth scrolling. A ResizeObserver fits the viewport to the active card so shorter challenges do not inherit the mobile briefing's height.

Run `node scripts/verify-mission-deck.mjs` with Playwright available. Optional environment variables: `PLAYWRIGHT_MODULE` (existing package path), `CHROME_PATH` (browser executable), `MISSION_BASE_URL`, `MISSION_TEST_ROUTE` (defaults to `/{locale}`), and `MISSION_SCREENSHOTS` (output folder). This checks every slide at 320, 390, 768, and 1440 pixels in both locales, including boundaries, direct selection, keyboard, focus, touch snapping, clipping, external link attributes, and reduced motion.

The site uses explicit `/en` and `/ar` locale prefixes to avoid the earlier locale rewrite loop. Browser checks run on these live routes.

### Landing page

Run the web build, `typecheck`, and ESLint on the landing page and `space-scene.tsx`. Visually verify desktop and mobile in both locales, all seven Figma layers and the spaceship, keyboard links/details, pause/resume, reduced motion, and distinct parallax rates.

Run `node scripts/verify-landing.mjs` with Playwright available to check the supplied fonts actually load, all hero images load, planet visibility and heading bounds at 320/390/768/1440 pixels in English and Arabic, automatic animation, pause/resume, scroll parallax, and reduced motion. It accepts the same `PLAYWRIGHT_MODULE`, `CHROME_PATH`, `MISSION_BASE_URL`, and `MISSION_SCREENSHOTS` options as the mission-deck checks.
