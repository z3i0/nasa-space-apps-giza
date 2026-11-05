// Uses an available Playwright installation; does not add a runtime dependency.
// PLAYWRIGHT_MODULE may point to an existing Playwright package.
import { createRequire } from "node:module"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const loadPackage = createRequire(import.meta.url)
const { chromium } = loadPackage(process.env.PLAYWRIGHT_MODULE || "playwright")

const base = process.env.MISSION_BASE_URL || "http://127.0.0.1:3000"
const route = process.env.MISSION_TEST_ROUTE || "/{locale}"
const output = process.env.MISSION_SCREENSHOTS

;(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  })
  try {
    for (const locale of ["en", "ar"]) {
      for (const width of [320, 390, 768, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          hasTouch: true,
          reducedMotion: "reduce",
        })
        await context.addCookies([
          { name: "NEXT_LOCALE", value: locale, url: base },
        ])
        const page = await context.newPage()
        const errors = []
        page.on("pageerror", (error) => errors.push(error.message))
        await page.goto(base + route.replace("{locale}", locale), {
          waitUntil: "networkidle",
        })
        const deck = page.locator("#mission")
        const track = deck.locator('[aria-roledescription="carousel"]')
        const slides = deck.locator('[aria-roledescription="slide"]')
        const previous = deck.getByRole("button", {
          name: locale === "en" ? "Previous mission" : "المهمة السابقة",
          exact: true,
        })
        const next = deck.getByRole("button", {
          name: locale === "en" ? "Next mission" : "المهمة التالية",
          exact: true,
        })
        const waitActive = async (index) => {
          await page.waitForFunction(
            (index) =>
              document
                .querySelectorAll('#mission [aria-roledescription="slide"]')
                [index]?.getAttribute("data-active") === "true",
            index
          )
          await page.waitForTimeout(200)
        }
        assert.equal(await slides.count(), 15)
        assert.equal(await deck.locator("img, picture").count(), 0)
        assert(await previous.isDisabled())
        await deck.scrollIntoViewIfNeeded()
        // The briefing CTA advances the deck and moves focus out of the hidden slide.
        await deck
          .getByRole("button", {
            name:
              locale === "en" ? "EXPLORE THE CHALLENGES" : "استكشف التحديات",
            exact: true,
          })
          .click()
        await waitActive(1)
        assert.equal(
          await track.evaluate((el) => el === document.activeElement),
          true
        )
        await previous.click()
        await waitActive(0)
        // Verify all challenge links, navigation boundaries, clipping, and live counts.
        for (let i = 0; i < 15; i++) {
          if (i) {
            await next.click()
            await waitActive(i)
          }
          const slide = slides.nth(i)
          assert.equal(await slide.getAttribute("inert"), null)
          assert.equal(await deck.locator('[aria-current="step"]').count(), 1)
          assert(
            (await deck.getByRole("status").innerText()).includes(String(i + 1))
          )
          const geometry = await slide.evaluate((el) => {
            const rect = el.getBoundingClientRect()
            const viewport = el.parentElement.getBoundingClientRect()
            return {
              width: el.clientWidth,
              content: el.scrollWidth,
              height: rect.height,
              trackHeight: viewport.height,
              centered: Math.abs(
                rect.left + rect.width / 2 - viewport.left - viewport.width / 2
              ),
            }
          })
          assert(
            geometry.content <= geometry.width + 1,
            `Content overflow: ${locale} ${width} slide ${i + 1}`
          )
          assert(
            geometry.height <= geometry.trackHeight + 1,
            `Clipped height: ${locale} ${width} slide ${i + 1}`
          )
          assert(
            geometry.centered < 3,
            `Off-center: ${locale} ${width} slide ${i + 1}`
          )
          if (i) {
            const link = slide.getByRole("link")
            assert.match(
              await link.getAttribute("href"),
              /^https:\/\/www\.spaceappschallenge\.org\/2026\/challenges\/.+\/$/
            )
            assert.equal(await link.getAttribute("target"), "_blank")
          }
        }
        assert(await next.isDisabled())
        await track.focus()
        await page.keyboard.press("Home")
        await waitActive(0)
        await page.keyboard.press(locale === "en" ? "ArrowRight" : "ArrowLeft")
        await waitActive(1)
        await page.keyboard.press(locale === "en" ? "ArrowLeft" : "ArrowRight")
        await waitActive(0)
        await page.keyboard.press("End")
        await waitActive(14)
        await deck.locator("nav button").nth(8).click()
        await waitActive(8)
        // Real touch input exercises native scroll-snap in both reading directions.
        await track.scrollIntoViewIfNeeded()
        const box = await track.boundingBox()
        const x1 = box.x + box.width * (locale === "en" ? 0.8 : 0.2)
        const x2 = box.x + box.width * (locale === "en" ? 0.2 : 0.8)
        const y = Math.max(10, box.y) + 120
        const cdp = await context.newCDPSession(page)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: x1, y }],
        })
        for (let step = 1; step <= 10; step++) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x1 + ((x2 - x1) * step) / 10, y }],
          })
          await page.waitForTimeout(25)
        }
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        })
        await waitActive(9)
        await page.waitForTimeout(800)
        assert.equal(
          await slides.nth(9).getAttribute("data-active"),
          "true",
          "Swipe must settle on the next card"
        )
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth
          ),
          true
        )
        if (output) {
          fs.mkdirSync(output, { recursive: true })
          await deck.evaluate((el) =>
            window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top)
          )
          await page.screenshot({
            path: path.join(output, `${locale}-${width}-challenge.png`),
          })
          await waitActive(9)
          await deck.locator("nav button").first().click()
          await waitActive(0)
          await deck.evaluate((el) =>
            window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top)
          )
          await page.screenshot({
            path: path.join(output, `${locale}-${width}-briefing.png`),
          })
          await waitActive(0)
        }
        assert.deepEqual(errors, [])
        console.log(
          `PASS ${locale} ${width}px: 15 slides, links, controls, keyboard, focus, touch, layout, reduced motion`
        )
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
