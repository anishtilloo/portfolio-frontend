<script setup lang="ts">
/**
 * Everything lying on the desk around the book, in book pixels with the
 * spine at (0, 0). The pad spans roughly ±630 by ±450; things in its margins
 * show in the open-book view, things on the wood above and below show on
 * phones, and the right-hand wood shows while the book is closed.
 *
 * Nods to the shows and books on the shelf are drawn here from scratch,
 * not copied from any official artwork.
 */
import { ellipse, line, rect, seeded, smooth } from '@/lib/rough'

const sheetRnd = seeded(31)
const sheetDoodle = [
  ...rect(40, 150, 120, 90, sheetRnd, 1.2),
  ...line(30, 156, 100, 100, sheetRnd),
  ...line(100, 100, 170, 156, sheetRnd),
  ...rect(86, 196, 28, 44, sheetRnd, 1),
  ellipse(200, 70, 26, 26, sheetRnd, 1.2),
  ...line(20, 252, 240, 250, sheetRnd, 1.3),
  smooth([
    [26, 290],
    [70, 278],
    [120, 296],
    [170, 280],
    [226, 292],
  ]),
]

/** A paper clip: one wire bent into nested loops. */
const clipPath = 'M14 8 V62 a10 10 0 0 0 20 0 V14 a14 14 0 0 0 -28 0 V58 a6 6 0 0 0 12 0 V18'

/* Straw hat, from above: woven rings and spokes. */
const brimRings = [140, 128, 116, 104, 92]
const crownRings = [60, 48, 36, 24, 12]
const spokes = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2
  return { x1: Math.cos(a) * 84, y1: Math.sin(a) * 84, x2: Math.cos(a) * 146, y2: Math.sin(a) * 146 }
})

/* Ramen: wavy noodles and a fish-cake swirl. */
const noodles = Array.from({ length: 9 }, (_, row) => {
  const y = -60 + row * 15
  const points: [number, number][] = []
  for (let x = -110; x <= 110; x += 14) points.push([x, y + Math.sin(x / 9 + row) * 5])
  return smooth(points)
})
const swirl = (() => {
  const points: [number, number][] = []
  for (let i = 0; i <= 40; i++) {
    const a = i * 0.42
    const r = 2 + i * 0.36
    points.push([42 + Math.cos(a) * r, 34 + Math.sin(a) * r])
  }
  return smooth(points)
})()
</script>

<template>
  <div class="props" aria-hidden="true">
    <!-- On the wood -->
    <div class="prop sheet">
      <svg viewBox="0 0 260 340">
        <path v-for="(d, i) in sheetDoodle" :key="i" :d="d" />
      </svg>
    </div>

    <svg class="prop hat" viewBox="-150 -150 300 300">
      <circle r="146" fill="#e2b85f" />
      <g fill="none" stroke="#a8772a" stroke-opacity="0.35">
        <circle v-for="r in brimRings" :key="r" :r="r" />
      </g>
      <g stroke="#8d6220" stroke-opacity="0.16">
        <line v-for="(s, i) in spokes" :key="i" v-bind="s" />
      </g>
      <circle r="80" fill="#b8312a" />
      <circle r="80" fill="none" stroke="#8e221d" stroke-width="2" />
      <circle r="69" fill="#ecc874" />
      <g fill="none" stroke="#a8772a" stroke-opacity="0.35">
        <circle v-for="r in crownRings" :key="r" :r="r" />
      </g>
      <ellipse cx="-30" cy="-34" rx="34" ry="22" fill="#fff6dd" opacity="0.25" />
    </svg>

    <div class="prop book-under">
      <p class="book-under__title">Never Lie</p>
      <p class="book-under__by">a thriller</p>
    </div>
    <div class="prop book-over">
      <p class="book-over__title">Red<br />Rising</p>
      <span class="book-over__mark"></span>
    </div>

    <svg class="prop egg" viewBox="-60 -85 120 170">
      <defs>
        <radialGradient id="desk-egg-shade" cx="38%" cy="30%" r="75%">
          <stop offset="0" stop-color="#7a2a20" />
          <stop offset="0.6" stop-color="#3a1210" />
          <stop offset="1" stop-color="#140707" />
        </radialGradient>
        <pattern id="desk-egg-scales" width="14" height="11" patternUnits="userSpaceOnUse">
          <path d="M0 11 Q7 0 14 11" fill="none" stroke="#e2a948" stroke-opacity="0.45" stroke-width="1.3" />
          <path d="M-7 5.5 Q0 -5.5 7 5.5 M7 5.5 Q14 -5.5 21 5.5" fill="none" stroke="#e2a948" stroke-opacity="0.3" stroke-width="1" />
        </pattern>
      </defs>
      <ellipse rx="52" ry="78" fill="url(#desk-egg-shade)" />
      <ellipse rx="52" ry="78" fill="url(#desk-egg-scales)" />
      <ellipse cx="-18" cy="-36" rx="11" ry="22" fill="#fff" opacity="0.13" />
    </svg>

    <svg class="prop ramen" viewBox="-150 -150 300 300">
      <defs>
        <radialGradient id="desk-broth" r="60%">
          <stop offset="0" stop-color="#e7b56a" />
          <stop offset="1" stop-color="#b9762f" />
        </radialGradient>
        <clipPath id="desk-bowl">
          <circle r="102" />
        </clipPath>
      </defs>
      <circle r="126" fill="#f5efe4" />
      <circle r="118" fill="none" stroke="#284f86" stroke-width="9" stroke-dasharray="16 9" />
      <circle r="104" fill="url(#desk-broth)" />
      <g clip-path="url(#desk-bowl)">
        <path v-for="(d, i) in noodles" :key="i" :d="d" fill="none" stroke="#f6dfa0" stroke-width="5" stroke-linecap="round" />
        <rect x="8" y="-96" width="58" height="74" rx="3" fill="#1d2a20" transform="rotate(14 37 -59)" />
        <ellipse cx="-44" cy="-42" rx="27" ry="21" fill="#fffaf0" />
        <ellipse cx="-42" cy="-41" rx="13" ry="10" fill="#f0a43a" />
        <ellipse cx="-58" cy="18" rx="27" ry="21" fill="#fffaf0" transform="rotate(-20 -58 18)" />
        <ellipse cx="-57" cy="18" rx="13" ry="10" fill="#f0a43a" />
        <circle cx="42" cy="34" r="22" fill="#fffdfa" stroke="#ece3da" stroke-width="2" />
        <path :d="swirl" fill="none" stroke="#e4708f" stroke-width="3" stroke-linecap="round" />
        <g fill="#5d9c3a">
          <circle cx="0" cy="60" r="5" /><circle cx="14" cy="72" r="4" /><circle cx="-14" cy="76" r="5" />
          <circle cx="76" cy="-8" r="4" /><circle cx="-6" cy="-6" r="4" />
        </g>
      </g>
      <g stroke="#7a4b25" stroke-width="8" stroke-linecap="round">
        <line x1="-150" y1="118" x2="150" y2="62" />
        <line x1="-146" y1="136" x2="152" y2="84" />
      </g>
    </svg>

    <div class="prop note note--blue">
      <p>git commit -m<br />"one more<br />episode"</p>
    </div>

    <!-- On the pad -->
    <div class="prop mug">
      <span class="mug__handle"></span>
      <span class="mug__coffee"></span>
    </div>
    <div class="prop pencil"><span class="pencil__clip"></span></div>
    <svg class="prop clips" viewBox="0 0 150 110">
      <path :d="clipPath" transform="translate(10 20) rotate(-18 20 40)" />
      <path :d="clipPath" transform="translate(52 8) rotate(12 20 40)" />
      <path :d="clipPath" transform="translate(96 26) rotate(-4 20 40)" />
    </svg>
    <div class="prop eraser"></div>

    <svg class="prop duck" viewBox="0 0 150 110">
      <path d="M8 52 Q2 40 14 36 Q20 44 18 54 Z" fill="#f3c22b" />
      <ellipse cx="62" cy="56" rx="52" ry="38" fill="#ffd43b" />
      <ellipse cx="56" cy="58" rx="30" ry="21" fill="#f5c52c" />
      <circle cx="110" cy="54" r="25" fill="#ffd43b" />
      <path d="M130 46 Q150 54 130 62 Q126 54 130 46 Z" fill="#f08a24" />
      <circle cx="117" cy="43" r="3" fill="#1d1d1d" />
      <circle cx="117" cy="65" r="3" fill="#1d1d1d" />
      <ellipse cx="96" cy="44" rx="8" ry="5" fill="#fff" opacity="0.4" />
    </svg>

    <div class="prop note note--yellow">
      <p>// TODO:<br />finish Red Rising<br />(again)</p>
    </div>
  </div>
</template>

<style scoped>
.props {
  position: absolute;
  left: 0;
  top: 0;
}

.prop {
  position: absolute;
  /* base.css caps svg at 100% width, and this layer has no width of its own. */
  max-width: none;
}

/* Speckled stoneware mug, seen from above */
.mug {
  left: 486px;
  top: -478px;
  width: 168px;
  height: 168px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 40%, rgb(90 70 50 / 0.5) 0 1.2px, transparent 1.6px) 0 0 / 23px 19px,
    radial-gradient(circle at 70% 20%, rgb(90 70 50 / 0.4) 0 1px, transparent 1.4px) 0 0 / 17px 29px,
    radial-gradient(circle, #efe5d2 60%, #fbf5ea 66%, #d8cbb2 74%);
  box-shadow:
    12px 18px 26px rgb(50 22 2 / 0.45),
    inset -6px -8px 14px rgb(120 90 50 / 0.18);
}

.mug__coffee {
  position: absolute;
  inset: 15%;
  border-radius: 50%;
  background:
    radial-gradient(ellipse 30% 18% at 36% 32%, rgb(255 240 220 / 0.22), transparent 70%),
    radial-gradient(circle, #1e120a 70%, #2e1c10 100%);
  box-shadow: inset 0 4px 10px rgb(0 0 0 / 0.55);
}

.mug__handle {
  position: absolute;
  right: -46px;
  top: 58px;
  width: 66px;
  height: 52px;
  border-radius: 0 26px 26px 0;
  border: 14px solid #ece2cf;
  border-left: 0;
  z-index: -1;
  box-shadow: 10px 12px 18px rgb(50 22 2 / 0.35);
}

/* Mechanical pencil */
.pencil {
  left: -712px;
  top: -130px;
  width: 330px;
  height: 13px;
  transform: rotate(-82deg);
  border-radius: 6px 3px 3px 6px;
  background: linear-gradient(#3c4a55, #1f272e 55%, #2b353d);
  box-shadow: 8px 10px 12px rgb(20 10 0 / 0.45);
}

.pencil::before {
  /* metal cone and lead */
  content: '';
  position: absolute;
  right: -40px;
  top: 0;
  width: 40px;
  height: 13px;
  background: linear-gradient(90deg, #c7ccd2 0 70%, #2a2a2a 70%);
  clip-path: polygon(0 0, 70% 38%, 100% 46%, 100% 54%, 70% 62%, 0 100%);
}

.pencil::after {
  /* grip */
  content: '';
  position: absolute;
  right: 6px;
  top: 0;
  width: 80px;
  height: 13px;
  background: repeating-linear-gradient(90deg, rgb(255 255 255 / 0.12) 0 2px, transparent 2px 5px);
}

.pencil__clip {
  position: absolute;
  left: 18px;
  top: -4px;
  width: 92px;
  height: 5px;
  border-radius: 3px;
  background: linear-gradient(#e2e6ea, #9aa1a8);
}

.clips {
  left: -628px;
  top: 190px;
  width: 150px;
  height: 110px;
  overflow: visible;
  filter: drop-shadow(3px 5px 3px rgb(0 0 0 / 0.4));
}

.clips path {
  fill: none;
  stroke: #cfd5dc;
  stroke-width: 3;
  stroke-linecap: round;
}

/* A well-used eraser */
.eraser {
  left: 490px;
  top: 230px;
  width: 104px;
  height: 50px;
  transform: rotate(-14deg);
  border-radius: 9px 14px 14px 9px;
  background:
    linear-gradient(100deg, transparent 72%, rgb(70 70 80 / 0.18) 86%, rgb(70 70 80 / 0.28)),
    linear-gradient(#fbf8f2, #e9e3d8);
  box-shadow:
    inset 0 -4px 0 rgb(0 0 0 / 0.06),
    8px 12px 14px rgb(20 10 0 / 0.38);
}

/* A loose sketch on the wood */
.sheet {
  left: -1020px;
  top: -560px;
  width: 260px;
  height: 340px;
  transform: rotate(-11deg);
  background: var(--leaf);
  box-shadow: 6px 10px 18px rgb(50 22 2 / 0.32);
}

.sheet svg {
  width: 100%;
  height: 100%;
}

.sheet path {
  fill: none;
  stroke: #4b4f63;
  stroke-width: 1.6;
  stroke-linecap: round;
  opacity: 0.8;
}


/* Straw hat on the wood, top right */
.hat {
  left: 668px;
  top: -500px;
  width: 300px;
  height: 300px;
  transform: rotate(-12deg);
  filter: drop-shadow(14px 18px 16px rgb(40 18 2 / 0.4));
}

/* Two paperbacks on the wood, bottom right */
.book-under,
.book-over {
  width: 210px;
  height: 300px;
  padding: 26px 22px;
  border-radius: 3px 6px 6px 3px;
  box-shadow:
    3px 3px 0 #efe6d2,
    5px 5px 0 #d9ccb0,
    12px 18px 24px rgb(40 18 2 / 0.4);
}

.book-under {
  left: 718px;
  top: -40px;
  transform: rotate(9deg);
  background:
    radial-gradient(ellipse at 70% 80%, rgb(60 140 150 / 0.35), transparent 60%),
    linear-gradient(160deg, #1c2326, #0d1214);
  color: #f2f2f2;
}

.book-under__title {
  font-family: var(--font-body);
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
}

.book-under__by {
  margin-top: 8px;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.6;
}

.book-over {
  left: 676px;
  top: 150px;
  transform: rotate(-7deg);
  background:
    radial-gradient(circle at 50% 62%, rgb(255 140 60 / 0.25), transparent 45%),
    linear-gradient(170deg, #8e1d18, #4f0d0b);
  color: #f0c869;
}

.book-over__title {
  font-family: var(--font-body);
  font-size: 38px;
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* A simple sickle-moon mark, not anyone's cover art. */
.book-over__mark {
  position: absolute;
  left: 50%;
  top: 58%;
  width: 70px;
  height: 70px;
  margin: -35px 0 0 -35px;
  border-radius: 50%;
  box-shadow: inset -10px 6px 0 0 #f0c869;
  transform: rotate(-30deg);
}

/* A dragon's egg, on the wood above the pad */
.egg {
  left: 200px;
  top: -720px;
  width: 120px;
  height: 170px;
  transform: rotate(24deg);
  filter: drop-shadow(10px 14px 10px rgb(30 12 0 / 0.5));
}

/* A bowl of ramen, on the wood below the pad */
.ramen {
  left: -400px;
  top: 480px;
  width: 280px;
  height: 280px;
  filter: drop-shadow(12px 16px 16px rgb(40 18 2 / 0.45));
}

/* The debugging duck */
.duck {
  left: -640px;
  top: -392px;
  width: 128px;
  height: 94px;
  transform: rotate(28deg);
  filter: drop-shadow(8px 10px 8px rgb(0 0 0 / 0.35));
}

/* Sticky notes */
.note {
  width: 140px;
  height: 140px;
  padding: 16px 14px;
  font-family: 'Caveat Variable', var(--font-display);
  font-size: 21px;
  line-height: 1.12;
  color: #1d2a55;
  box-shadow:
    0 1px 0 rgb(0 0 0 / 0.05),
    6px 12px 14px -4px rgb(30 15 0 / 0.38);
}

.note--yellow {
  left: 478px;
  top: -150px;
  transform: rotate(5deg);
  background: linear-gradient(170deg, #fff3a0, #f9e27a);
}

.note--blue {
  left: 200px;
  top: 500px;
  transform: rotate(-6deg);
  background: linear-gradient(170deg, #c9e6ff, #a9d3f5);
}
</style>
