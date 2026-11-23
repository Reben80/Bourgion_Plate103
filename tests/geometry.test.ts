import { describe, expect, it } from "vitest"
import { makeBoard } from "../src/geometry/board"
import { colorIndex, dist, R1, R2, center } from "../src/geometry/constants"
import { frameOf, neighborsOf } from "../src/geometry/lattice"
import { ownerAt } from "../src/geometry/owner"
import { annulusCap, quadrantPath } from "../src/render/paths"

describe("lattice", () => {
  it("places neighbors one spacing apart", () => {
    const c = center(0, 0)
    for (const n of neighborsOf(0, 0)) {
      expect(dist(c, center(n.i, n.j))).toBeCloseTo(1, 10)
    }
  })

  it("keeps a neighbor's outer circle tangent to the hexagonal hole", () => {
    expect(1 - R2).toBeCloseTo(1 / 4, 10)
  })

  it("gives the horizontal key its off-edge rings", () => {
    const f = frameOf(2, 3, 0)
    expect(f.Ui).toEqual({ i: 3, j: 2 })
    expect(f.Di).toEqual({ i: 2, j: 4 })
  })

  it("colors overlapping rings differently", () => {
    const mine = colorIndex(4, 2)
    for (const n of neighborsOf(4, 2)) {
      expect(colorIndex(n.i, n.j)).not.toBe(mine)
    }
  })
})

describe("ownership", () => {
  const board = makeBoard("original")

  it("leaves the ring center as background", () => {
    expect(ownerAt(center(1, 1), board).type).toBe("background")
  })

  it("assigns a key quadrant by the +1 rule", () => {
    const f = frameOf(1, 1, 0)
    const p = {
      x: f.M.x + 0.04 * f.u.x + 0.04 * f.n.x,
      y: f.M.y + 0.04 * f.u.y + 0.04 * f.n.y,
    }
    const owner = ownerAt(p, board)
    expect(owner).toEqual({ type: "ring", i: f.Ui.i, j: f.Ui.j })
  })

  it("puts the mid-band point on its own ring", () => {
    const c = center(2, 2)
    const p = { x: c.x + (R1 + R2) / 2, y: c.y }
    expect(ownerAt(p, board)).toEqual({ type: "ring", i: 2, j: 2 })
  })
})

describe("paths", () => {
  it("builds a closed annulus cap and a key quadrant", () => {
    const cap = annulusCap(center(0, 0), center(1, 0), 1)
    expect(cap.startsWith("M")).toBe(true)
    expect(cap.endsWith("Z")).toBe(true)
    const quad = quadrantPath(frameOf(0, 0, 0), "UR")
    expect(quad.includes("A")).toBe(true)
    expect(quad.endsWith("Z")).toBe(true)
  })
})
