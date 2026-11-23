import { DIRS, PERIOD, mod, type Dir, type Sign, type TriKind } from "./constants"

export type PresetId = "original" | "alt" | "A" | "B" | "C" | "D" | "coin"

export type Board = {
  keys: Sign[][][]
  tris: Sign[][][]
}

export function emptyBoard(): Board {
  const keys: Sign[][][] = []
  const tris: Sign[][][] = []
  for (let d = 0; d < 3; d++) {
    keys[d] = []
    for (let i = 0; i < PERIOD; i++) {
      keys[d][i] = []
      for (let j = 0; j < PERIOD; j++) keys[d][i][j] = 1
    }
  }
  for (let k = 0; k < 2; k++) {
    tris[k] = []
    for (let i = 0; i < PERIOD; i++) {
      tris[k][i] = []
      for (let j = 0; j < PERIOD; j++) tris[k][i][j] = 1
    }
  }
  return { keys, tris }
}

export function cloneBoard(board: Board): Board {
  return {
    keys: board.keys.map((dirs) => dirs.map((row) => row.slice() as Sign[])),
    tris: board.tris.map((kinds) => kinds.map((row) => row.slice() as Sign[])),
  }
}

/** (−1)^n, including negative n. */
export function pm(n: number): Sign {
  return Math.abs(n) % 2 === 0 ? 1 : -1
}

function keyAt(preset: PresetId, dir: Dir, i: number, j: number, rng: () => number): Sign {
  switch (preset) {
    case "original":
    case "A":
    case "C":
      return 1
    case "alt":
    case "B":
      return pm(j)
    case "D":
      return dir === 2 ? pm(i - 1) : pm(i)
    case "coin":
      return rng() < 0.5 ? 1 : -1
  }
}

function triAt(preset: PresetId, kind: TriKind, i: number, j: number, rng: () => number): Sign {
  switch (preset) {
    case "original":
    case "B":
      return 1
    case "A":
      return kind === 0 ? 1 : -1
    case "alt":
    case "C":
      return pm(j)
    case "D":
      return pm(i)
    case "coin":
      return rng() < 0.5 ? 1 : -1
  }
}

export function makeBoard(preset: PresetId, rng: () => number = Math.random): Board {
  const board = emptyBoard()
  for (let dir = 0; dir < 3; dir++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        board.keys[dir][i][j] = keyAt(preset, dir as Dir, i, j, rng)
      }
    }
  }
  for (let kind = 0; kind < 2; kind++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        board.tris[kind][i][j] = triAt(preset, kind as TriKind, i, j, rng)
      }
    }
  }
  return board
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function keySign(board: Board, i: number, j: number, dir: Dir): Sign {
  return board.keys[dir][mod(i)][mod(j)]
}

export function triSign(board: Board, kind: TriKind, i: number, j: number): Sign {
  return board.tris[kind][mod(i)][mod(j)]
}

export function flipKey(board: Board, i: number, j: number, dir: Dir): void {
  const ii = mod(i)
  const jj = mod(j)
  board.keys[dir][ii][jj] = board.keys[dir][ii][jj] === 1 ? -1 : 1
}

export function flipTri(board: Board, kind: TriKind, i: number, j: number): void {
  const ii = mod(i)
  const jj = mod(j)
  board.tris[kind][ii][jj] = board.tris[kind][ii][jj] === 1 ? -1 : 1
}

export function mirrorBoard(board: Board): void {
  for (const layer of board.keys) {
    for (const row of layer) {
      for (let j = 0; j < row.length; j++) row[j] = row[j] === 1 ? -1 : 1
    }
  }
  for (const layer of board.tris) {
    for (const row of layer) {
      for (let j = 0; j < row.length; j++) row[j] = row[j] === 1 ? -1 : 1
    }
  }
}

export function boardEquals(a: Board, b: Board): boolean {
  for (let d = 0; d < 3; d++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        if (a.keys[d][i][j] !== b.keys[d][i][j]) return false
      }
    }
  }
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        if (a.tris[k][i][j] !== b.tris[k][i][j]) return false
      }
    }
  }
  return true
}

export function shiftMatches(board: Board, di: number, dj: number): boolean {
  for (let d = 0; d < 3; d++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        if (board.keys[d][i][j] !== board.keys[d][mod(i + di)][mod(j + dj)]) return false
      }
    }
  }
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        if (board.tris[k][i][j] !== board.tris[k][mod(i + di)][mod(j + dj)]) return false
      }
    }
  }
  return true
}

export { DIRS }
