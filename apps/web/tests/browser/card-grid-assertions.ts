import { expect, type Locator } from "@playwright/test"

export async function expectUniformCards(cards: Locator) {
  await expect
    .poll(async () =>
      cards.evaluateAll((elements) => {
        const heights = elements.map(
          (element) => element.getBoundingClientRect().height
        )
        return Math.max(...heights) - Math.min(...heights)
      })
    )
    .toBeLessThanOrEqual(1)
  const sizes = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect()
      const footer = element
        .querySelector("[data-card-footer]")!
        .getBoundingClientRect()
      return {
        width: box.width,
        footerInset: box.bottom - footer.bottom,
        overflows: element.scrollWidth > element.clientWidth,
      }
    })
  )
  expect(
    Math.max(...sizes.map((size) => size.width)) -
      Math.min(...sizes.map((size) => size.width))
  ).toBeLessThanOrEqual(1)
  expect(
    Math.max(...sizes.map((size) => size.footerInset)) -
      Math.min(...sizes.map((size) => size.footerInset))
  ).toBeLessThanOrEqual(1)
  expect(sizes.some((size) => size.overflows)).toBe(false)
}
