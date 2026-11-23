import { describe, expect, it } from "vitest"
import { makeBoard } from "../src/geometry/board"
import { buildCell } from "../src/render/scene"
import { analyze } from "../src/symmetry/classify"

describe("timing", () => {
  it("rebuilds one period and its group without a large regression", () => {
    const board = makeBoard("original")
    const start = performance.now()
    const cell = buildCell(board)
    const group = analyze(board)
    const ms = performance.now() - start
    expect(group.group).toBe("p6")
    expect(cell.fills).toHaveLength(36)
    // A warm laptop finishes near 75ms. A cold runner is slower, so this only
    // catches a real regression, not that first-run difference.
    expect(ms).toBeLessThan(400)
  })
})
