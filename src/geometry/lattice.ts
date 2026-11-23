import {
  DIRS,
  NEIGHBORS,
  R1,
  R2,
  SQRT3,
  center,
  dist,
  nearestRing,
  type Dir,
  type Pt,
  type RingId,
  type TriKind,
} from "./constants"

export type Quad = "UL" | "UR" | "LR" | "LL"
export type Role = "L" | "R" | "U" | "D"

export type Frame = {
  L: Pt
  R: Pt
  M: Pt
  u: Pt
  n: Pt
  U: Pt
  D: Pt
  Li: RingId
  Ri: RingId
  Ui: RingId
  Di: RingId
}

export function neighborsOf(i: number, j: number): RingId[] {
  return NEIGHBORS.map((o) => ({ i: i + o.di, j: j + o.dj }))
}

export function frameOf(i: number, j: number, dir: Dir): Frame {
  const Li = { i, j }
  const step = DIRS[dir]
  const Ri = { i: i + step.di, j: j + step.dj }
  const L = center(Li.i, Li.j)
  const R = center(Ri.i, Ri.j)
  const M = { x: (L.x + R.x) / 2, y: (L.y + R.y) / 2 }
  let ux = R.x - L.x
  let uy = R.y - L.y
  const len = Math.hypot(ux, uy)
  ux /= len
  uy /= len
  const u = { x: ux, y: uy }
  const n = { x: uy, y: -ux }
  const h = SQRT3 / 2
  const U = { x: M.x + n.x * h, y: M.y + n.y * h }
  const D = { x: M.x - n.x * h, y: M.y - n.y * h }
  return { L, R, M, u, n, U, D, Li, Ri, Ui: nearestRing(U), Di: nearestRing(D) }
}

export function quadrantOf(t: number, s: number): Quad {
  if (s >= 0) return t >= 0 ? "UR" : "UL"
  return t >= 0 ? "LR" : "LL"
}

/** Key sign assigns each quadrant of the key box to one of the four rings. */
export function roleOf(sign: 1 | -1, quad: Quad): Role {
  if (sign === 1) {
    if (quad === "UL") return "R"
    if (quad === "UR") return "U"
    if (quad === "LR") return "L"
    return "D"
  }
  if (quad === "UL") return "U"
  if (quad === "UR") return "L"
  if (quad === "LR") return "D"
  return "R"
}

export function ringOfRole(frame: Frame, role: Role): RingId {
  if (role === "L") return frame.Li
  if (role === "R") return frame.Ri
  if (role === "U") return frame.Ui
  return frame.Di
}

export function upVerts(i: number, j: number): RingId[] {
  return [
    { i, j },
    { i: i + 1, j },
    { i, j: j + 1 },
  ]
}

export function downVerts(i: number, j: number): RingId[] {
  return [
    { i: i + 1, j },
    { i: i + 1, j: j + 1 },
    { i, j: j + 1 },
  ]
}

export type CanonTri = { kind: TriKind; i: number; j: number; ordered: RingId[] }

/** Identify a unit triangle and return it in the brief's positive order. */
export function canonicalTriangle(verts: RingId[]): CanonTri {
  const minJ = Math.min(verts[0].j, verts[1].j, verts[2].j)
  const atMin = verts.filter((v) => v.j === minJ)
  const atMax = verts.filter((v) => v.j === minJ + 1)
  if (atMin.length === 2 && atMax.length === 1) {
    const left = atMin[0].i < atMin[1].i ? atMin[0] : atMin[1]
    return { kind: 0, i: left.i, j: left.j, ordered: upVerts(left.i, left.j) }
  }
  if (atMin.length === 1 && atMax.length === 2) {
    const bottom = atMin[0]
    const i = bottom.i - 1
    const j = bottom.j
    return { kind: 1, i, j, ordered: downVerts(i, j) }
  }
  throw new Error("vertices are not a unit triangle")
}

export function commonNeighbors(a: RingId, b: RingId): RingId[] {
  const nb = neighborsOf(b.i, b.j)
  return neighborsOf(a.i, a.j).filter(
    (n) => !(n.i === b.i && n.j === b.j) && nb.some((m) => m.i === n.i && m.j === n.j),
  )
}

export function sideOf(a: Pt, b: Pt, p: Pt): 1 | -1 {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
  return cross >= 0 ? 1 : -1
}

/** +1 means X is over Y when Y is the next vertex after X in the positive list. */
export function xIsOverY(x: RingId, y: RingId, ordered: RingId[], sign: 1 | -1): boolean {
  const ix = ordered.findIndex((v) => v.i === x.i && v.j === x.j)
  const iy = ordered.findIndex((v) => v.i === y.i && v.j === y.j)
  if (ix < 0 || iy < 0) throw new Error("vertex missing from triangle")
  const yFollows = (ix + 1) % 3 === iy
  return yFollows ? sign === 1 : sign === -1
}

export function circleHits(c1: Pt, r1: number, c2: Pt, r2: number): Pt[] {
  const dx = c2.x - c1.x
  const dy = c2.y - c1.y
  const d = Math.hypot(dx, dy)
  if (d < 1e-12 || d > r1 + r2 + 1e-8 || d < Math.abs(r1 - r2) - 1e-8) return []
  const a = (d * d + r1 * r1 - r2 * r2) / (2 * d)
  const h2 = r1 * r1 - a * a
  const h = h2 <= 1e-12 ? 0 : Math.sqrt(Math.max(0, h2))
  const xm = c1.x + (a * dx) / d
  const ym = c1.y + (a * dy) / d
  if (h < 1e-9) return [{ x: xm, y: ym }]
  const rx = (-dy * h) / d
  const ry = (dx * h) / d
  return [
    { x: xm + rx, y: ym + ry },
    { x: xm - rx, y: ym - ry },
  ]
}

export function inAnnulus(p: Pt, c: Pt): boolean {
  const d = dist(p, c)
  return d >= R1 - 1e-6 && d <= R2 + 1e-6
}

export function pickSide(pts: Pt[], a: Pt, b: Pt, side: 1 | -1): Pt {
  const hit = pts.find((p) => sideOf(a, b, p) === side)
  if (!hit) throw new Error("missing intersection on this side")
  return hit
}
