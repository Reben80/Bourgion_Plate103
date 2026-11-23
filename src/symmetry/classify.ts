import type { Board } from "../geometry/board"
import { keySign, triSign } from "../geometry/board"
import {
  PERIOD,
  SQRT3,
  center,
  nearestRing,
  type Dir,
  type Pt,
  type RingId,
  type TriKind,
} from "../geometry/constants"
import { canonicalTriangle, downVerts, frameOf, upVerts, type Frame } from "../geometry/lattice"
import { ownerAt } from "../geometry/owner"
import type { Owner } from "../geometry/constants"

export type GroupName = "p6" | "p3" | "pgg" | "pg" | "p2" | "p1"

export type Mark =
  | { type: "hex"; x: number; y: number }
  | { type: "tri"; x: number; y: number }
  | { type: "oval"; x: number; y: number }
  | { type: "glide"; x: number; y: number; dx: number; dy: number }

export const GROUP_EXPLAIN: Record<GroupName, string> = {
  p6: "Six-fold rotations, and the threefold and twofold centers that come with them.",
  p3: "Threefold rotations. A third of a turn repeats the weave, and a half turn does not.",
  p2: "Half turns only. The weave matches itself after a 180° rotation.",
  pg: "Glide reflections in one direction, and no rotations.",
  pgg: "Glide reflections in two directions, together with half turns.",
  p1: "Translations only. No turn or glide leaves this weave unchanged.",
}

type Xform = (p: Pt) => Pt

function rot(p: Pt, c: Pt, ang: number): Pt {
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)
  const x = p.x - c.x
  const y = p.y - c.y
  return { x: c.x + x * cos - y * sin, y: c.y + x * sin + y * cos }
}

function mapRing(g: Xform, v: RingId): RingId {
  return nearestRing(g(center(v.i, v.j)))
}

function canonicalEdge(from: RingId, to: RingId): { i: number; j: number; dir: Dir } {
  const di = to.i - from.i
  const dj = to.j - from.j
  const dirs: { di: number; dj: number; dir: Dir }[] = [
    { di: 1, dj: 0, dir: 0 },
    { di: 0, dj: 1, dir: 1 },
    { di: -1, dj: 1, dir: 2 },
  ]
  for (const d of dirs) {
    if (d.di === di && d.dj === dj) return { i: from.i, j: from.j, dir: d.dir }
  }
  for (const d of dirs) {
    if (d.di === -di && d.dj === -dj) return { i: to.i, j: to.j, dir: d.dir }
  }
  throw new Error("not a lattice edge")
}

/** Orientation-preserving maps keep key and triangle signs. */
export function rotationPreserves(board: Board, g: Xform): boolean {
  for (let dir = 0; dir < 3; dir++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        const step = [
          { di: 1, dj: 0 },
          { di: 0, dj: 1 },
          { di: -1, dj: 1 },
        ][dir]
        const a = { i, j }
        const b = { i: i + step.di, j: j + step.dj }
        const edge = canonicalEdge(mapRing(g, a), mapRing(g, b))
        const s1 = keySign(board, i, j, dir as Dir)
        const s2 = keySign(board, edge.i, edge.j, edge.dir)
        if (s1 !== s2) return false
      }
    }
  }
  for (let kind = 0; kind < 2; kind++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        const verts = kind === 0 ? upVerts(i, j) : downVerts(i, j)
        const image = verts.map((v) => mapRing(g, v))
        const can = canonicalTriangle(image)
        const s1 = triSign(board, kind as TriKind, i, j)
        const s2 = triSign(board, can.kind, can.i, can.j)
        if (s1 !== s2) return false
      }
    }
  }
  return true
}

function ownersMatch(a: Owner, b: Owner, g: Xform): boolean {
  if (a.type !== "ring" || b.type !== "ring") return a.type === b.type
  const img = nearestRing(g(center(a.i, a.j)))
  return img.i === b.i && img.j === b.j
}

let probeCache: Pt[] | null = null

/** One interior point for every key quadrant and every band crossing. */
export function probePoints(): Pt[] {
  if (probeCache) return probeCache
  const pts: Pt[] = []
  for (let dir = 0; dir < 3; dir++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        const f = frameOf(i, j, dir as Dir)
        for (const [t, s] of [
          [0.04, 0.04],
          [-0.04, 0.04],
          [0.04, -0.04],
          [-0.04, -0.04],
        ]) {
          pts.push({ x: f.M.x + t * f.u.x + s * f.n.x, y: f.M.y + t * f.u.y + s * f.n.y })
        }
      }
    }
  }
  for (let kind = 0; kind < 2; kind++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        const verts = kind === 0 ? upVerts(i, j) : downVerts(i, j)
        const pairs: [number, number][] = [
          [0, 1],
          [1, 2],
          [2, 0],
        ]
        for (const [a, b] of pairs) {
          const ca = center(verts[a].i, verts[a].j)
          const cb = center(verts[b].i, verts[b].j)
          const ct = center(verts[3 - a - b].i, verts[3 - a - b].j)
          const mx = (ca.x + cb.x) / 2
          const my = (ca.y + cb.y) / 2
          const vx = ct.x - mx
          const vy = ct.y - my
          const len = Math.hypot(vx, vy)
          pts.push({ x: mx + (vx / len) * 0.46, y: my + (vy / len) * 0.46 })
        }
      }
    }
  }
  pts.push(center(0, 0))
  const up = upVerts(0, 0).map((v) => center(v.i, v.j))
  pts.push({
    x: (up[0].x + up[1].x + up[2].x) / 3,
    y: (up[0].y + up[1].y + up[2].y) / 3,
  })
  probeCache = pts
  return pts
}

function preservesProbes(board: Board, g: Xform): boolean {
  for (const p of probePoints()) {
    const o1 = ownerAt(p, board)
    const o2 = ownerAt(g(p), board)
    if (!ownersMatch(o1, o2, g)) return false
  }
  return true
}

export type Analysis = {
  group: GroupName
  marks: Mark[]
  explain: string
}

type RotHit = { order: 6 | 3 | 2; x: number; y: number }

function findRotations(board: Board): RotHit[] {
  const hits: RotHit[] = []
  const seen = new Set<string>()
  const add = (order: 6 | 3 | 2, p: Pt) => {
    const key = `${order}:${p.x.toFixed(4)}:${p.y.toFixed(4)}`
    if (seen.has(key)) return
    seen.add(key)
    hits.push({ order, x: p.x, y: p.y })
  }

  for (let i = 0; i < PERIOD; i++) {
    for (let j = 0; j < PERIOD; j++) {
      const c = center(i, j)
      if (rotationPreserves(board, (p) => rot(p, c, Math.PI / 3))) add(6, c)
      else if (rotationPreserves(board, (p) => rot(p, c, (2 * Math.PI) / 3))) add(3, c)
      else if (rotationPreserves(board, (p) => rot(p, c, Math.PI))) add(2, c)
    }
  }

  for (let kind = 0; kind < 2; kind++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        const verts = kind === 0 ? upVerts(i, j) : downVerts(i, j)
        const cs = verts.map((v) => center(v.i, v.j))
        const c = {
          x: (cs[0].x + cs[1].x + cs[2].x) / 3,
          y: (cs[0].y + cs[1].y + cs[2].y) / 3,
        }
        if (rotationPreserves(board, (p) => rot(p, c, (2 * Math.PI) / 3))) add(3, c)
      }
    }
  }

  for (let dir = 0; dir < 3; dir++) {
    for (let i = 0; i < PERIOD; i++) {
      for (let j = 0; j < PERIOD; j++) {
        const f: Frame = frameOf(i, j, dir as Dir)
        if (rotationPreserves(board, (p) => rot(p, f.M, Math.PI))) add(2, f.M)
      }
    }
  }
  return hits
}

function rotate(p: Pt, ang: number): Pt {
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }
}

/**
 * Glides of this weave run along an altitude of the lattice, through a
 * quarter-point or a midpoint, and shift by one row (√3/2). Rotating the
 * vertical case covers all three altitudes.
 */
function findGlides(board: Board): Mark[] {
  const found: Mark[] = []
  const kept = new Set<string>()
  const row = SQRT3 / 2
  for (let k = 0; k < 6; k++) {
    const ang = (k * Math.PI) / 3
    const R = (p: Pt) => rotate(p, ang)
    const Rinv = (p: Pt) => rotate(p, -ang)
    for (const x0 of [0.25, 0.75, 0.5]) {
      const glide = (p: Pt) => R({ x: 2 * x0 - Rinv(p).x, y: Rinv(p).y + row })
      const mirror = (p: Pt) => R({ x: 2 * x0 - Rinv(p).x, y: Rinv(p).y })
      if (preservesProbes(board, mirror)) continue
      if (!preservesProbes(board, glide)) continue
      const dir = R({ x: 0, y: 1 })
      const origin = R({ x: x0, y: 0 })
      const off = origin.x * dir.y - origin.y * dir.x
      const angKey = (Math.atan2(dir.y, dir.x) + Math.PI) % Math.PI
      const id = `${angKey.toFixed(3)}:${off.toFixed(3)}`
      if (kept.has(id)) continue
      kept.add(id)
      found.push({ type: "glide", x: origin.x, y: origin.y, dx: dir.x, dy: dir.y })
    }
  }
  return found
}

function glideDirections(glides: Mark[]): number[] {
  const dirs: number[] = []
  for (const g of glides) {
    if (g.type !== "glide") continue
    const ang = Math.atan2(g.dy, g.dx)
    const folded = ((ang % Math.PI) + Math.PI) % Math.PI
    if (!dirs.some((d) => Math.abs(d - folded) < 0.2 || Math.abs(d - folded - Math.PI) < 0.2)) {
      dirs.push(folded)
    }
  }
  return dirs
}

export function analyze(board: Board): Analysis {
  const rots = findRotations(board)
  const has6 = rots.some((r) => r.order === 6)
  const has3 = rots.some((r) => r.order === 3)
  const has2 = rots.some((r) => r.order === 2)
  let glides: Mark[] = []
  let group: GroupName
  if (has6) group = "p6"
  else if (has3) group = "p3"
  else {
    glides = findGlides(board)
    const dirs = glideDirections(glides)
    if (dirs.length >= 2) group = "pgg"
    else if (dirs.length === 1) group = "pg"
    else if (has2) group = "p2"
    else group = "p1"
  }

  const marks: Mark[] = []
  for (const r of rots) {
    if (r.order === 6) marks.push({ type: "hex", x: r.x, y: r.y })
    else if (r.order === 3) marks.push({ type: "tri", x: r.x, y: r.y })
    else marks.push({ type: "oval", x: r.x, y: r.y })
  }
  if (group === "pg" || group === "pgg") marks.push(...glides)

  return { group, marks, explain: GROUP_EXPLAIN[group] }
}

/** Marks actually drawn. Mirrors are never produced. */
export function overlayMarks(analysis: Analysis): Mark[] {
  return analysis.marks.filter(
    (m) => m.type === "hex" || m.type === "tri" || m.type === "oval" || m.type === "glide",
  )
}
