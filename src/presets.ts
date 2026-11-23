import type { PresetId } from "./geometry/board"

export type Palette = {
  id: PresetId
  label: string
  group: string
  bands: [string, string, string]
  ground: string
}

/** Three-color glazes. The booklet's last pages are the source of record; these are the working set. */
export const PALETTES: Palette[] = [
  {
    id: "original",
    label: "Original",
    group: "p6",
    bands: ["#c65b3a", "#2f7a72", "#2a3f86"],
    ground: "#f3eee4",
  },
  {
    id: "alt",
    label: "Alternating rows",
    group: "pg",
    bands: ["#d9892b", "#b44d74", "#3e6840"],
    ground: "#f3eee4",
  },
  {
    id: "A",
    label: "A. Up / down",
    group: "p3",
    bands: ["#3f8f52", "#6d4584", "#d7a63a"],
    ground: "#f4efe6",
  },
  {
    id: "B",
    label: "B. Keys by row",
    group: "p1",
    bands: ["#d36b4e", "#7eae9b", "#1d315f"],
    ground: "#f3eee4",
  },
  {
    id: "C",
    label: "C. Crossings by row",
    group: "p2",
    bands: ["#6d7a32", "#6aa3c4", "#7a3148"],
    ground: "#f3eee4",
  },
  {
    id: "D",
    label: "D. Diagonal",
    group: "pg",
    bands: ["#e0b03a", "#1c8f86", "#2c3338"],
    ground: "#f3eee4",
  },
  {
    id: "coin",
    label: "E. Coin flip",
    group: "p1",
    bands: ["#c4473a", "#c6a15a", "#243e78"],
    ground: "#f3eee4",
  },
]

export const PRINT_BAND = "#e7e1d6"
export const PRINT_GROUND = "#14171c"

export function paletteById(id: PresetId | "custom"): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}
