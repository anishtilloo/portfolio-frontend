<script setup lang="ts">
/**
 * The hero drawing: a pencil sketch of the kind of system Anish builds,
 * which draws itself once when the page loads.
 */
import { arrow, ellipse, rect, seeded, smooth, stroke } from '@/lib/rough'

type Pen = 'ink' | 'red' | 'graphite'

interface Label {
  x: number
  y: number
  text: string
  note?: boolean // handwritten annotation, not a box title
  rotate?: number
}

interface Shape {
  strokes: string[]
  pen?: Pen
  labels?: Label[]
}

const rnd = seeded(2612)

function box(x: number, y: number, w: number, h: number, ...lines: string[]): Shape {
  const first = y + h / 2 + 7 - (lines.length - 1) * 12
  return {
    strokes: rect(x, y, w, h, rnd, 1.1),
    labels: lines.map((text, index) => ({ x: x + w / 2, y: first + index * 24, text })),
  }
}

/** A database, drawn the usual way: a cylinder. */
function cylinder(cx: number, top: number, text: string): Shape {
  const rx = 61
  const ry = 12
  const h = 52
  const base: [number, number][] = []
  for (let i = 0; i <= 8; i++) {
    const angle = (i / 8) * Math.PI
    base.push([cx + Math.cos(angle) * rx, top + h + Math.sin(angle) * ry + (rnd() - 0.5) * 1.6])
  }
  return {
    strokes: [
      ellipse(cx, top, rx, ry, rnd, 1.1),
      stroke(cx - rx, top, cx - rx, top + h, rnd),
      stroke(cx + rx, top, cx + rx, top + h, rnd),
      smooth(base),
    ],
    labels: [{ x: cx, y: top + ry + h / 2 + 8, text }],
  }
}

function link(x1: number, y1: number, x2: number, y2: number, label?: Label): Shape {
  return { strokes: arrow(x1, y1, x2, y2, rnd, 0.9), labels: label ? [label] : [] }
}

// Listed in the order a person would draw them.
const shapes: Shape[] = [
  // Data stores share one column (x 353–475), centred on the rows at y 94, 206 and 318.
  // Arrows stop about 6px short of the shape they point at.
  box(8, 64, 100, 60, 'Vue 3 app'),
  link(114, 94, 136, 94),
  box(142, 64, 172, 60, 'Node/Python/Go'),
  link(320, 94, 347, 94),
  cylinder(414, 68, 'PostgreSQL'),
  link(300, 130, 347, 194),
  cylinder(414, 180, 'MongoDB'),
  link(228, 130, 228, 170),
  box(168, 176, 120, 60, 'LLMs'),
  link(294, 222, 347, 306),
  cylinder(414, 292, 'Qdrant'),
  link(186, 242, 100, 382, { x: 122, y: 300, text: 'tools', note: true, rotate: -4 }),
  box(8, 388, 150, 60, 'MCP server'),
  link(164, 418, 293, 418),
  box(299, 388, 176, 60, 'Vision models'),
  {
    pen: 'graphite',
    strokes: [],
    labels: [{ x: 240, y: 484, text: 'so AI agents can call them', note: true, rotate: -2 }],
  },
  {
    pen: 'red',
    strokes: [
      smooth([
        [298, 16],
        [310, 26],
        [314, 40],
        [313, 53],
      ]),
      stroke(313, 54, 306, 45, rnd, 0.4),
      stroke(313, 54, 320, 46, rnd, 0.4),
    ],
    labels: [{ x: 218, y: 24, text: '30s → 0.4s average', note: true, rotate: -3 }],
  },
]

// Flatten to one drawing sequence so each stroke can start after the one before.
let order = 0
const sequence = shapes.map((shape) => {
  const start = order
  const strokes = shape.strokes.map((d) => ({ d, index: order++ }))
  return { pen: shape.pen ?? 'ink', strokes, labels: shape.labels ?? [], start }
})
</script>

<template>
  <svg
    class="sketch"
    viewBox="0 0 480 500"
    role="img"
    aria-labelledby="sketch-title sketch-desc"
  >
    <title id="sketch-title">A hand-drawn system diagram</title>
    <desc id="sketch-desc">
      A Vue 3 app calls a NestJS API. The API reads and writes PostgreSQL and MongoDB, and calls
      LangChain with Gemini, which searches Qdrant and uses tools from an MCP server that wraps
      vision models. A note beside the API reads: 30s → 0.4s average.
    </desc>

    <g v-for="(shape, s) in sequence" :key="s" :class="`pen pen--${shape.pen}`">
      <path
        v-for="line in shape.strokes"
        :key="line.index"
        :d="line.d"
        pathLength="1"
        :style="{ '--i': line.index }"
      />
      <text
        v-for="label in shape.labels"
        :key="label.text"
        :x="label.x"
        :y="label.y"
        :class="{ note: label.note }"
        :transform="label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined"
        :style="{ '--i': shape.start + 3 }"
        text-anchor="middle"
      >
        {{ label.text }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.sketch {
  width: 100%;
  height: auto;
  overflow: visible;
}

.pen {
  --pen: var(--ink);
}

.pen--red {
  --pen: var(--red-pencil);
}

.pen--graphite {
  --pen: var(--graphite);
}

path {
  fill: none;
  stroke: var(--pen);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 0.38s ease-out forwards;
  animation-delay: calc(var(--i) * 26ms + 150ms);
}

text {
  fill: var(--pen);
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 600;
  font-variation-settings:
    'INFM' 30,
    'BNCE' 0,
    'SPAC' 0;
  opacity: 0;
  animation: appear 0.3s ease-out forwards;
  animation-delay: calc(var(--i) * 26ms + 150ms);
}

text.note {
  font-size: 17px;
  font-weight: 500;
  font-variation-settings:
    'INFM' 100,
    'BNCE' 4,
    'SPAC' 0;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes appear {
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  path {
    animation: none;
    stroke-dashoffset: 0;
  }

  text {
    animation: none;
    opacity: 1;
  }
}
</style>
