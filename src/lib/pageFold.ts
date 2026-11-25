/**
 * Geometry for a soft paper page being turned, seen from above.
 *
 * Turning a page by its bottom outer corner is a fold: the corner travels from
 * the right-hand page over to the left, and the crease is the line halfway
 * between where the corner started and where it is now. Everything past the
 * crease is flipped over, so you see the back of the page there.
 *
 * Coordinates are page pixels with the spine on the left edge (x = 0), the
 * outer edge at x = width and y pointing down. The back of the page is laid
 * out as a normal left-hand page, so it reads correctly once fully turned.
 */

interface Point {
  x: number
  y: number
}

export interface FoldState {
  /** clip-path for the front of the page: the part not yet folded over. */
  frontClip: string
  /** clip-path for the back, in its own (left-page) coordinates. */
  backClip: string
  /** CSS matrix() that lays the back of the page onto the fold. */
  backTransform: string
  /** Transform for a shading band whose left edge sits on the crease, facing the front. */
  frontCrease: string
  /** Same, inside the back of the page, facing into the flap. */
  backCrease: string
  /** 0 when flat, 1 halfway through the turn. */
  lift: number
}

const HIDDEN = 'polygon(0 0, 0 0, 0 0)'
/** Highest value of sin(πt)·(1 − t)² over 0..1. */
const RISE_PEAK = 0.39974
const px = (n: number) => `${n.toFixed(2)}px`

function polygon(points: Point[]): string {
  if (points.length < 3) return HIDDEN
  return `polygon(${points.map((p) => `${px(p.x)} ${px(p.y)}`).join(', ')})`
}

/** Keep the part of a convex polygon where side(point) >= 0. */
function clip(points: Point[], side: (p: Point) => number): Point[] {
  const out: Point[] = []
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const sa = side(a)
    const sb = side(b)
    if (sa >= 0) out.push(a)
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb)
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    }
  }
  return out
}

/**
 * @param progress 0 = lying flat on the right, 1 = lying flat on the left.
 * @param lift How high the corner rises at most, as a share of the width.
 *   Keep it at or under 1, or the page would tear away from the spine.
 */
export function foldPage(progress: number, width: number, height: number, lift = 0.6): FoldState {
  const turn = Math.min(1, Math.max(0, progress))
  const rect: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]

  if (turn <= 0.0005) {
    return {
      frontClip: polygon(rect),
      backClip: HIDDEN,
      backTransform: `matrix(-1, 0, 0, 1, ${width}, 0)`,
      frontCrease: 'scale(0)',
      backCrease: 'scale(0)',
      lift: 0,
    }
  }

  // The corner's path: an arc over the spine. It rises early, which makes the
  // diagonal dog-ear, then settles so the page lands square on the left.
  // Scaled so it peaks at exactly 1 (at turn ≈ 0.27): clamping it instead
  // would put a kink in the corner's path, which shows up as a jerk.
  const angle = Math.PI * turn
  const rise = (Math.sin(angle) * (1 - turn) ** 2) / RISE_PEAK
  const corner = { x: width, y: height }
  const moved = {
    x: width * Math.cos(angle),
    y: height - width * lift * rise,
  }

  // The crease: through the midpoint, perpendicular to the corner's travel.
  const dx = corner.x - moved.x
  const dy = corner.y - moved.y
  const length = Math.hypot(dx, dy) || 1
  const n = { x: dx / length, y: dy / length } // points into the folded part
  const mid = { x: (corner.x + moved.x) / 2, y: (corner.y + moved.y) / 2 }
  const side = (p: Point) => (p.x - mid.x) * n.x + (p.y - mid.y) * n.y

  const front = clip(rect, (p) => -side(p))
  const flap = clip(rect, side)

  // The back of the page lives in left-page coordinates u. A point u is the
  // back of page point P = (width - u.x, u.y), which the fold reflects to
  // P - 2 side(P) n. Mirror then reflect is a rigid motion, so one matrix.
  const a = -1 + 2 * n.x * n.x
  const b = 2 * n.x * n.y
  const c = -2 * n.x * n.y
  const d = 1 - 2 * n.y * n.y
  const origin = { x: width, y: 0 }
  const s0 = side(origin)
  const e = origin.x - 2 * s0 * n.x
  const f = origin.y - 2 * s0 * n.y

  const backFlap = flap.map((p) => ({ x: width - p.x, y: p.y }))

  // Crease bands: a tall strip whose left edge lies on the crease.
  const band = Math.hypot(width, height) * 2
  const frontAngle = Math.atan2(-n.y, -n.x)
  const backMid = { x: width - mid.x, y: mid.y }
  const backAngle = Math.atan2(n.y, -n.x)
  const crease = (at: Point, rad: number) =>
    `translate(${px(at.x)}, ${px(at.y)}) rotate(${rad.toFixed(4)}rad) translate(0, ${px(-band / 2)})`

  return {
    frontClip: polygon(front),
    backClip: polygon(backFlap),
    backTransform: `matrix(${a.toFixed(5)}, ${b.toFixed(5)}, ${c.toFixed(5)}, ${d.toFixed(5)}, ${e.toFixed(2)}, ${f.toFixed(2)})`,
    frontCrease: crease(mid, frontAngle),
    backCrease: crease(backMid, backAngle),
    lift: Math.sin(Math.PI * turn),
  }
}
