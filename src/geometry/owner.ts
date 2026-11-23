import type { Board } from "./board"
import { keySign, triSign } from "./board"
import {
  R1,
  R2,
  center,
  dist,
  dot,
  nearestRing,
  type Dir,
  type Owner,
  type Pt,
  type RingId,
} from "./constants"
import {
  canonicalTriangle,
  commonNeighbors,
  frameOf,
  neighborsOf,
  quadrantOf,
  ringOfRole,
  roleOf,
  xIsOverY,
  type Frame,
} from "./lattice"

function ringsTouching(p: Pt): RingId[] {
  const near = nearestRing(p)
  const hits: RingId[] = []
  const around = [near, ...neighborsOf(near.i, near.j)]
  for (const id of around) {
    const d = dist(p, center(id.i, id.j))
    if (d >= R1 - 1e-7 && d <= R2 + 1e-7) hits.push(id)
  }
  return hits
}

function topRing(hits: RingId[], p: Pt, board: Board): RingId {
  let best = hits[0]
  for (let k = 1; k < hits.length; k++) {
    const other = hits[k]
    if (overAt(other, best, p, board)) best = other
  }
  return best
}

/** True when `a` is over `b` at point p, which sits in one of their two crossings. */
export function overAt(a: RingId, b: RingId, p: Pt, board: Board): boolean {
  const thirds = commonNeighbors(a, b)
  const ca = center(a.i, a.j)
  const cb = center(b.i, b.j)
  let chosen = thirds[0]
  let best = -1
  for (const t of thirds) {
    const ct = center(t.i, t.j)
    const side = (cb.x - ca.x) * (p.y - ca.y) - (cb.y - ca.y) * (p.x - ca.x)
    const tside = (cb.x - ca.x) * (ct.y - ca.y) - (cb.y - ca.y) * (ct.x - ca.x)
    const agree = side * tside
    if (agree > best) {
      best = agree
      chosen = t
    }
  }
  const tri = canonicalTriangle([a, b, chosen])
  const sign = triSign(board, tri.kind, tri.i, tri.j)
  return xIsOverY(a, b, tri.ordered, sign)
}

function frameNear(p: Pt): { i: number; j: number; dir: Dir; frame: Frame }[] {
  const near = nearestRing(p)
  const origins = [near, ...neighborsOf(near.i, near.j)]
  const out: { i: number; j: number; dir: Dir; frame: Frame }[] = []
  for (const o of origins) {
    for (const dir of [0, 1, 2] as Dir[]) {
      const frame = frameOf(o.i, o.j, dir)
      if (dist(p, frame.M) > 0.28) continue
      out.push({ i: o.i, j: o.j, dir, frame })
    }
  }
  return out
}

function keyOwner(p: Pt, board: Board): Owner | null {
  for (const edge of frameNear(p)) {
    const f = edge.frame
    if (dist(p, f.L) >= R1 - 1e-9) continue
    if (dist(p, f.R) >= R1 - 1e-9) continue
    if (dist(p, f.U) <= R2 + 1e-9) continue
    if (dist(p, f.D) <= R2 + 1e-9) continue
    const rel = { x: p.x - f.M.x, y: p.y - f.M.y }
    const t = dot(rel, f.u)
    const s = dot(rel, f.n)
    const sign = keySign(board, edge.i, edge.j, edge.dir)
    const role = roleOf(sign, quadrantOf(t, s))
    const id = ringOfRole(f, role)
    return { type: "ring", i: id.i, j: id.j }
  }
  return null
}

/** Which ring owns this point, or the background (hole or small triangle). */
export function ownerAt(p: Pt, board: Board): Owner {
  const hits = ringsTouching(p)
  if (hits.length === 1) return { type: "ring", i: hits[0].i, j: hits[0].j }
  if (hits.length >= 2) {
    const top = topRing(hits, p, board)
    return { type: "ring", i: top.i, j: top.j }
  }
  return keyOwner(p, board) ?? { type: "background" }
}
