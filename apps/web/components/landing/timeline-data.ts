export const timelinePhases = [
  { key: "bootcamp", number: "01", accent: "#a6bcff" },
  { key: "registration", number: "02", accent: "#b9a8f5" },
  { key: "deadline", number: "03", accent: "#8ec8ff" },
  { key: "hackathon", number: "04", accent: "#c2b0ff" },
] as const

export const timelinePlanets = [
  {
    name: "earth",
    src: "/space/earth.webp",
    width: 300,
    height: 303,
    size: 0.18,
  },
  {
    name: "saturn",
    src: "/space/saturn.png",
    width: 759,
    height: 459,
    size: 0.26,
  },
  {
    name: "jupiter",
    src: "/space/jupiter.webp",
    width: 366,
    height: 369,
    size: 0.21,
  },
  { name: "mars", src: "/space/mars.svg", width: 240, height: 240, size: 0.18 },
  {
    name: "neptune",
    src: "/space/neptune.webp",
    width: 598,
    height: 548,
    size: 0.23,
  },
] as const
