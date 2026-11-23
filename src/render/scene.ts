import type { Board } from "../geometry/board"
import { PERIOD, SQRT3, colorIndex, type Dir, type RingId } from "../geometry/constants"
import { frameOf } from "../geometry/lattice"
import { jointsFor, keyCrossPath, ringPath, ringStroke, ringsInView, type ViewBox } from "./paths"

/** One period of the torus: translate by a*(6,0) + b*(3, 3√3). */
export const CELL_A = { x: PERIOD, y: 0 }
export const CELL_B = { x: PERIOD / 2, y: (PERIOD / 2) * SQRT3 }

/** A fixed patch of the weave. Panning only changes the viewBox. */
export const FIELD: ViewBox = { x: -5.2, y: -3.6, w: 16.4, h: 11.2 }

export type Weave = {
  fills: { i: number; j: number; d: string; color: number }[]
  stroke: string
  joints: string
  crosses: string
}

export function buildWeave(board: Board, field: ViewBox = FIELD): Weave {
  const rings = ringsInView(field, 0.3)
  const fills = rings.map((ring) => ({
    i: ring.i,
    j: ring.j,
    color: colorIndex(ring.i, ring.j),
    d: ringPath(ring.i, ring.j, board),
  }))
  let stroke = ""
  let joints = ""
  let crosses = ""
  for (const ring of rings) {
    stroke += ringStroke(ring.i, ring.j, board)
    joints += jointsFor(ring.i, ring.j, board)
    for (const dir of [0, 1, 2] as Dir[]) {
      const frame = frameOf(ring.i, ring.j, dir)
      if (
        frame.M.x < field.x - 0.2 ||
        frame.M.x > field.x + field.w + 0.2 ||
        frame.M.y < field.y - 0.2 ||
        frame.M.y > field.y + field.h + 0.2
      ) {
        continue
      }
      crosses += keyCrossPath(frame)
    }
  }
  return { fills, stroke, joints, crosses }
}

/** The 6×6 block of rings. Translations of this block cover the plane. */
export function buildCell(board: Board): Weave {
  const fills: Weave["fills"] = []
  let stroke = ""
  let joints = ""
  let crosses = ""
  for (let j = 0; j < PERIOD; j++) {
    for (let i = 0; i < PERIOD; i++) {
      fills.push({ i, j, color: colorIndex(i, j), d: ringPath(i, j, board) })
      stroke += ringStroke(i, j, board)
      joints += jointsFor(i, j, board)
      for (const dir of [0, 1, 2] as Dir[]) crosses += keyCrossPath(frameOf(i, j, dir))
    }
  }
  return { fills, stroke, joints, crosses }
}

export type Tile = { key: string; x: number; y: number; di: number; dj: number }

/** Period copies that meet the view, with a margin so rings aren't clipped mid-pan. */
export function tilesCovering(view: ViewBox): Tile[] {
  const y0 = view.y - 0.9
  const y1 = view.y + view.h + 0.9
  const b0 = Math.floor(y0 / CELL_B.y)
  const b1 = Math.ceil(y1 / CELL_B.y)
  const tiles: Tile[] = []
  for (let b = b0; b <= b1; b++) {
    const shift = b * CELL_B.x
    const a0 = Math.floor((view.x - 0.9 - shift) / CELL_A.x)
    const a1 = Math.ceil((view.x + view.w + 0.9 - shift) / CELL_A.x)
    for (let a = a0; a <= a1; a++) {
      tiles.push({
        key: `${a}:${b}`,
        x: a * CELL_A.x + b * CELL_B.x,
        y: b * CELL_B.y,
        di: a * PERIOD + b * (PERIOD / 2),
        dj: b * PERIOD,
      })
    }
  }
  return tiles
}

export function ringKey(ring: RingId): string {
  return `${ring.i}:${ring.j}`
}
