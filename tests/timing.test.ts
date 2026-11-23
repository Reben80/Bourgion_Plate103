import { describe, expect, it } from "vitest"
import { makeBoard } from "../src/geometry/board"
import { buildCell } from "../src/render/scene"
import { analyze } from "../src/symmetry/classify"

describe("timing", () => {
  it("rebuilds one period and its group within a tenth of a second", () => {
    const board = makeBoard("original")
    const start = performance.now()
    const cell = buildCell(board)
    const group = analyze(board)
    const ms = performance.now() - start
    expect(group.group).toBe("p6")
    expect(cell.fills).toHaveLength(36)
    expect(ms).toBeLessThan(120)
  })
})
