import assert from "node:assert/strict"
import { createRequire } from "node:module"
import fs from "node:fs"
import path from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright")
const base = process.env.MISSION_BASE_URL || "http://localhost:3000"
const output = process.env.MISSION_SCREENSHOTS
if (output) fs.mkdirSync(output, { recursive: true })
const phases = ["bootcamp", "registration", "deadline", "hackathon"]
const numbers = ["01", "02", "03", "04"]
const dates = {
  en: ["NOVEMBER 6, 2026", "NOVEMBER 7, 2026", "NOVEMBER 10, 2026", "NOVEMBER 13–14, 2026"],
  ar: ["6 نوفمبر 2026", "7 نوفمبر 2026", "10 نوفمبر 2026", "13–14 نوفمبر 2026"],
}
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
})
try {
  for (const locale of ["en", "ar"]) {
    for (const width of [320, 390, 768, 1440]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
        hasTouch: true,
      })
      const errors = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(`${base}/${locale}`, { waitUntil: "networkidle" })
      const timeline = page.locator("#timeline")
      await timeline.scrollIntoViewIfNeeded()
      await timeline.locator("img").evaluateAll((images) =>
        images.forEach((image) => { image.loading = "eager" })
      )
      await page.waitForFunction(() =>
        [...document.querySelectorAll("#timeline img")].every(
          (img) => img.complete && img.naturalWidth > 0
        )
      )
      const tabs = timeline.getByRole("tab")
      const panel = timeline.getByRole("tabpanel")
      const previous = panel.locator("footer button").first()
      const next = panel.locator("footer button").last()
      const check = async (index) => {
        assert.equal(await timeline.getAttribute("data-phase"), phases[index])
        assert.equal(
          await tabs.nth(index).getAttribute("aria-selected"),
          "true"
        )
        assert.equal(await tabs.nth(index).getAttribute("tabindex"), "0")
        assert.equal(
          await timeline.locator('[role="tab"][aria-selected="true"]').count(),
          1
        )
        assert.equal(
          await timeline.locator('svg[data-complete="true"]').count(),
          index
        )
        assert.equal(await previous.isDisabled(), index === 0)
        assert.equal(await next.isDisabled(), index === phases.length - 1)
        assert((await tabs.nth(index).innerText()).includes(numbers[index]))
        assert((await panel.innerText()).includes(numbers[index]))
        assert((await panel.innerText()).includes(dates[locale][index]))
        if (index === phases.length - 1)
          assert((await panel.innerText()).includes(locale === "ar" ? "جامعة زويل" : "Zewail University"))
        assert.match(
          await panel.locator("footer").innerText(),
          new RegExp(`0${index + 1}\\s*/\\s*04`)
        )
        assert.equal(await panel.locator("li").count(), 3)
        const geometry = await timeline.evaluate((el) => {
          const panel = el.querySelector('[role="tabpanel"]')
          const content = panel.querySelector("h3").parentElement
          const controls = panel.querySelector("footer")
          const instructions = el.querySelector("#timeline-instructions")
          const images = [...el.querySelectorAll("img")]
          const overlaps = (a, b) =>
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top
          return {
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            panelFits: panel.scrollWidth <= panel.clientWidth,
            contentFits: content.scrollWidth <= content.clientWidth,
            imagesLoaded: images.every(
              (img) => img.complete && img.naturalWidth > 0
            ),
            collisions: images
              .filter((img) => !img.src.includes("spaceship"))
              .filter((img) => {
                const rect = img.getBoundingClientRect()
                return (
                  overlaps(rect, content.getBoundingClientRect()) ||
                  overlaps(rect, controls.getBoundingClientRect()) ||
                  overlaps(rect, instructions.getBoundingClientRect())
                )
              })
              .map((img) => img.src),
          }
        })
        assert(
          !geometry.overflow && geometry.panelFits && geometry.contentFits,
          `${locale}/${width}/${index}: overflow`
        )
        assert(geometry.imagesLoaded, "Timeline images must load")
        assert.deepEqual(
          geometry.collisions,
          [],
          `${locale}/${width}/${index}: planets overlap content`
        )
      }
      await check(0)
      for (let index = 1; index < phases.length; index++) {
        await next.click()
        await check(index)
      }
      if (output)
        await timeline.screenshot({
          path: path.join(output, `timeline-${locale}-${width}-hackathon.png`),
        })
      await tabs.nth(0).click()
      await tabs.nth(0).press(locale === "ar" ? "ArrowLeft" : "ArrowRight")
      await check(1)
      assert(await tabs.nth(1).evaluate((el) => el === document.activeElement))
      await tabs.nth(1).press("End")
      await check(phases.length - 1)
      await tabs.nth(phases.length - 1).press("Home")
      await check(0)
      await tabs.nth(2).click()
      await check(2)
      if (output)
        await timeline.screenshot({
          path: path.join(output, `timeline-${locale}-${width}.png`),
        })
      await previous.click()
      await check(1)
      await panel.focus()
      await panel.press("Home")
      await check(0)
      // Real touch input: horizontal swipes navigate; vertical swipes scroll the page.
      if (width === 390) {
        await panel.scrollIntoViewIfNeeded()
        const bounds = await panel.boundingBox()
        const cdp = await page.context().newCDPSession(page)
        const swipe = async (dx, dy) => {
          const start = { x: bounds.x + bounds.width / 2, y: bounds.y + 170 }
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [start],
          })
          for (let step = 1; step <= 5; step++) {
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [
                { x: start.x + (dx * step) / 5, y: start.y + (dy * step) / 5 },
              ],
            })
          }
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          })
        }
        await swipe(locale === "ar" ? 100 : -100, 5)
        await check(1)
        await swipe(5, -100)
        await check(1)
        await cdp.detach()
      }
      assert.deepEqual(errors, [])
      console.log(
        `PASS ${locale} ${width}px: four phases, dates, controls, keyboard, trail, geometry, reduced motion${width === 390 ? ", touch" : ""}`
      )
      await page.close()
    }
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  })
  await page.goto(`${base}/en`, { waitUntil: "networkidle" })
  const timeline = page.locator("#timeline")
  await timeline.scrollIntoViewIfNeeded()
  const sample = () =>
    timeline.evaluate((el) => {
      const ship = el.querySelector('img[src*="spaceship"]').parentElement
        .parentElement
      const orbit =
        el.querySelector('img[src*="earth"]').parentElement.parentElement
          .parentElement
      const wave = el.querySelector("svg[data-complete] path:last-child")
      return {
        x: ship.getBoundingClientRect().x,
        orbit: getComputedStyle(orbit).transform,
        wave: parseFloat(getComputedStyle(wave).strokeDashoffset),
      }
    })
  await page.waitForTimeout(900)
  const before = await sample()
  await timeline.getByRole("tab").nth(2).click()
  await page.waitForTimeout(200)
  const during = await sample()
  await page.waitForTimeout(1000)
  const after = await sample()
  assert(before.x < during.x && during.x < after.x, "Ship must travel smoothly")
  assert.notEqual(during.orbit, before.orbit)
  assert.notEqual(during.orbit, after.orbit)
  assert(
    during.wave > 0 && during.wave < 1,
    "Dotted route must draw into a wave"
  )
  assert.equal(after.wave, 0)
  console.log(
    "PASS animated ship travel, orbital movement, and dotted-to-wavy trail"
  )
  await page.close()
} finally {
  await browser.close()
}
