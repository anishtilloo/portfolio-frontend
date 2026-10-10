/**
 * A tiny hand-drawn line generator.
 *
 * Every shape is built from slightly bowed, slightly misplaced strokes, the way
 * a line looks when drawn quickly with a pencil. Shapes take a seeded random
 * function, so a given seed always produces the same drawing.
 */

export type Random = () => number

/** Small, fast seeded generator (mulberry32). */
export function seeded(seed: number): Random {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round = (n: number) => Math.round(n * 10) / 10

/** One pencil stroke from (x1, y1) to (x2, y2). */
export function stroke(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rnd: Random,
  roughness = 1,
): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  // Short lines wobble less than long ones.
  const wobble = Math.min(1.7, 0.5 + length / 160) * roughness
  const jitter = () => (rnd() - 0.5) * 2 * wobble
  // A gentle bow, perpendicular to the line.
  const bow = (rnd() - 0.5) * length * 0.022 * roughness
  const nx = -dy / length
  const ny = dx / length

  const at = (t: number) => [x1 + dx * t + nx * bow + jitter(), y1 + dy * t + ny * bow + jitter()]
  const [c1x, c1y] = at(0.3 + rnd() * 0.1)
  const [c2x, c2y] = at(0.6 + rnd() * 0.1)

  return (
    `M${round(x1 + jitter())} ${round(y1 + jitter())}` +
    `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ` +
    `${round(x2 + jitter())} ${round(y2 + jitter())}`
  )
}

/** A line gone over twice, like a sketch. */
export function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rnd: Random,
  roughness = 1,
): string[] {
  return [stroke(x1, y1, x2, y2, rnd, roughness), stroke(x1, y1, x2, y2, rnd, roughness * 0.8)]
}

/** A rectangle whose corners slightly overshoot. */
export function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  rnd: Random,
  roughness = 1,
): string[] {
  const over = () => rnd() * 3 * roughness
  const right = x + width
  const bottom = y + height
  return [
    ...line(x - over(), y, right + over(), y, rnd, roughness),
    ...line(right, y - over(), right, bottom + over(), rnd, roughness),
    ...line(right + over(), bottom, x - over(), bottom, rnd, roughness),
    ...line(x, bottom + over(), x, y - over(), rnd, roughness),
  ]
}

/** A closed curve through points on an ellipse, overlapping itself at the end. */
export function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rnd: Random,
  roughness = 1,
): string {
  const steps = 10
  const start = rnd() * Math.PI * 2
  const points: [number, number][] = []
  for (let i = 0; i <= steps + 1; i++) {
    const angle = start + (i / steps) * Math.PI * 2
    const wobble = 1 + (rnd() - 0.5) * 0.07 * roughness
    points.push([cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble])
  }
  return smooth(points)
}

/** A line with an open arrowhead at its end. */
export function arrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rnd: Random,
  roughness = 1,
  head = 9,
): string[] {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const spread = 0.46
  const wing = (side: number) =>
    stroke(
      x2,
      y2,
      x2 - Math.cos(angle + spread * side) * head,
      y2 - Math.sin(angle + spread * side) * head,
      rnd,
      roughness * 0.5,
    )
  return [...line(x1, y1, x2, y2, rnd, roughness), wing(1), wing(-1)]
}

/** Catmull-Rom spline through the points, as cubic Bézier segments. */
export function smooth(points: [number, number][]): string {
  if (points.length < 2) return ''
  let d = `M${round(points[0][0])} ${round(points[0][1])}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, points.length - 1)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(p2[0])} ${round(p2[1])}`
  }
  return d
}
