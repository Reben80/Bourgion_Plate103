import type { Board } from "../geometry/board"
import { keySign, triSign } from "../geometry/board"
import { PERIOD, type Dir } from "../geometry/constants"
import { canonicalTriangle, frameOf } from "../geometry/lattice"

export type TileShape = "plain" | "long-tab" | "side-tab" | "hole" | "triangle"

/**
 * Each key gives plain pieces to its endpoints and a tab to each off-edge ring.
 * The tab is long when the key sign equals that side's triangle sign.
 * Holes and small triangles are always present.
 */
export function shapesIn(board: Board): TileShape[] {
  let long = false
  let side = false
  for (let dir = 0; dir < 3; dir++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        const frame = frameOf(i, j, dir as Dir)
        const sign = keySign(board, i, j, dir as Dir)
        for (const apex of [frame.Ui, frame.Di]) {
          const tri = canonicalTriangle([frame.Li, frame.Ri, apex])
          const ts = triSign(board, tri.kind, tri.i, tri.j)
          if (sign === ts) long = true
          else side = true
        }
      }
    }
  }
  const shapes: TileShape[] = ["plain"]
  if (long) shapes.push("long-tab")
  if (side) shapes.push("side-tab")
  shapes.push("hole", "triangle")
  return shapes
}

export const SHAPE_LABEL: Record<TileShape, string> = {
  plain: "Plain",
  "long-tab": "Long tab",
  "side-tab": "Side tab",
  hole: "Hexagonal hole",
  triangle: "Small triangle",
}
