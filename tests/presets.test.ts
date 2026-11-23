import { describe, expect, it } from "vitest"
import { makeBoard, mulberry32 } from "../src/geometry/board"
import { analyze, overlayMarks } from "../src/symmetry/classify"
import { shapesIn } from "../src/tiles/shapes"

const EXPECTED = {
  original: "p6",
  alt: "pg",
  A: "p3",
  B: "p1",
  C: "p2",
  D: "pg",
} as const

describe("presets", () => {
  for (const [id, group] of Object.entries(EXPECTED)) {
    it(`${id} is ${group}`, () => {
      const board = makeBoard(id as keyof typeof EXPECTED)
      expect(analyze(board).group).toBe(group)
    })
  }

  it("mirroring the original keeps the six-fold group", () => {
    const board = makeBoard("original")
    for (const layer of board.keys)
      for (const row of layer) for (let j = 0; j < row.length; j++) row[j] = -1
    for (const layer of board.tris)
      for (const row of layer) for (let j = 0; j < row.length; j++) row[j] = -1
    expect(analyze(board).group).toBe("p6")
  })

  it("a fixed coin flip is usually free of extra symmetry", () => {
    let plain = 0
    for (let seed = 1; seed <= 12; seed++) {
      if (analyze(makeBoard("coin", mulberry32(seed))).group === "p1") plain++
    }
    expect(plain).toBeGreaterThanOrEqual(8)
  })
})

describe("tile shapes", () => {
  it("uses four shapes for the original and five for the other named presets", () => {
    expect(shapesIn(makeBoard("original"))).toEqual(["plain", "long-tab", "hole", "triangle"])
    for (const id of ["alt", "A", "B", "C", "D"] as const) {
      expect(shapesIn(makeBoard(id))).toEqual(["plain", "long-tab", "side-tab", "hole", "triangle"])
    }
  })
})

describe("overlay", () => {
  it("never emits a mirror line", () => {
    const boards = [
      makeBoard("original"),
      makeBoard("alt"),
      makeBoard("A"),
      makeBoard("B"),
      makeBoard("C"),
      makeBoard("D"),
      makeBoard("coin", mulberry32(3)),
    ]
    for (const board of boards) {
      for (const mark of overlayMarks(analyze(board))) {
        expect(["hex", "tri", "oval", "glide"]).toContain(mark.type)
      }
    }
  })
})
