/** Lattice geometry for Bourgoin, Plate 103. Lengths are in units of the spacing. */

export const PERIOD = 6
export const R1 = 5 / 8
export const R2 = 3 / 4
export const HOLE_R = 1 / 4
export const SQRT3 = Math.sqrt(3)

export type Pt = { x: number; y: number }
export type Sign = 1 | -1
export type Dir = 0 | 1 | 2
export type TriKind = 0 | 1
export type RingId = { i: number; j: number }

export type Owner = { type: "ring"; i: number; j: number } | { type: "background" }

/** Directions A, B, and B−A, in index steps. */
export const DIRS: { di: number; dj: number }[] = [
  { di: 1, dj: 0 },
  { di: 0, dj: 1 },
  { di: -1, dj: 1 },
]

export const NEIGHBORS: { di: number; dj: number }[] = [
  { di: 1, dj: 0 },
  { di: 0, dj: 1 },
  { di: -1, dj: 1 },
  { di: -1, dj: 0 },
  { di: 0, dj: -1 },
  { di: 1, dj: -1 },
]

export function mod(a: number, n = PERIOD): number {
  return ((a % n) + n) % n
}

export function center(i: number, j: number): Pt {
  return { x: i + j / 2, y: (j * SQRT3) / 2 }
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function dot(a: Pt, b: Pt): number {
  return a.x * b.x + a.y * b.y
}

export function sameRing(a: RingId, b: RingId): boolean {
  return a.i === b.i && a.j === b.j
}

export function sameOwner(a: Owner, b: Owner): boolean {
  if (a.type !== b.type) return false
  if (a.type === "background" || b.type === "background") return true
  return a.i === b.i && a.j === b.j
}

/** Nearest lattice point. Exact on lattice images of our 60° rotations. */
export function nearestRing(p: Pt): RingId {
  const j = Math.round((p.y * 2) / SQRT3)
  const i = Math.round(p.x - j / 2)
  return { i, j }
}

export function colorIndex(i: number, j: number): number {
  return mod(i + 2 * j, 3)
}

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0"
  const v = Math.abs(n) < 1e-8 ? 0 : n
  let s = v.toFixed(4)
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "")
  if (s === "-0") s = "0"
  return s
}
