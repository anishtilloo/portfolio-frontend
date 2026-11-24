<script setup lang="ts">
/**
 * The home page: the portfolio as a book lying on a sunlit desk.
 *
 * The page is a tall scroll track with a sticky, full-screen stage on top.
 * Scrolling moves a "playhead" along a timeline of keyframes; each keyframe
 * says where the camera is looking (closed cover, open spread, or one page)
 * and how many leaves have been turned. Everything in between is eased.
 *
 * The hard cover swings open on its hinge. Paper pages are soft, so they turn
 * by folding from the bottom corner (see lib/pageFold.ts).
 *
 * The playhead chases the real scroll position with a little damping, so a
 * mouse wheel that jumps 100px at a time still turns the page smoothly.
 */
import '@fontsource-variable/caveat/wght.css'

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import DeskProps from '@/components/book/DeskProps.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { education, favourites, offHours, profile, projects, work } from '@/content/profile'
import { foldPage } from '@/lib/pageFold'
import { line, rect, seeded, smooth } from '@/lib/rough'

/* ---------- Book geometry (in book pixels; the camera scales all of it) ---------- */

const PAGE_W = 460
const PAGE_H = 700
/** Paper sits just inside the boards. */
const PAPER_INSET_Y = 7
const PAPER_INSET_X = 9
const PAPER_W = PAGE_W - PAPER_INSET_X
const PAPER_H = PAGE_H - PAPER_INSET_Y * 2
const CREASE = Math.ceil(Math.hypot(PAPER_W, PAPER_H) * 2)
/** Below this on-screen scale the two-page spread is too small to read. */
const MIN_SPREAD_SCALE = 0.83

const geometry = {
  '--page-w': `${PAGE_W}px`,
  '--page-h': `${PAGE_H}px`,
  '--paper-w': `${PAPER_W}px`,
  '--paper-h': `${PAPER_H}px`,
  '--paper-y': `${PAPER_INSET_Y}px`,
  '--crease': `${CREASE}px`,
}

/* ---------- Content split into pages ---------- */

const projectPages = [projects.slice(0, 2), projects.slice(2, 4)]
const shelf = projects.slice(4)
const year = new Date().getFullYear()

const contacts = computed(() =>
  [
    { label: 'Email', text: profile.contact.email, href: `mailto:${profile.contact.email}` },
    { label: 'GitHub', text: handle(profile.contact.github), href: profile.contact.github },
    { label: 'LinkedIn', text: handle(profile.contact.linkedin), href: profile.contact.linkedin },
    {
      label: 'Instagram',
      text: handle(profile.contact.instagram, '@'),
      href: profile.contact.instagram,
    },
  ].filter((contact) => contact.text),
)

function handle(url: string, prefix = ''): string {
  const name = url.replace(/\/+$/, '').split('/').pop() ?? ''
  return name ? prefix + name : ''
}

/* ---------- Hand-drawn bits ---------- */

const coverFrame = rect(30, 30, PAGE_W - 60, PAGE_H - 60, seeded(11), 0.8)
const coverRule = line(150, 0, 310, 0, seeded(5), 0.6)
const underlines = {
  work: line(2, 5, 198, 5, seeded(7), 0.7),
  done: line(2, 5, 198, 5, seeded(29), 0.7),
  built: line(2, 5, 198, 5, seeded(17), 0.7),
  off: line(2, 5, 198, 5, seeded(43), 0.7),
  hello: line(2, 5, 198, 5, seeded(61), 0.7),
}
const noteArrow = smooth([
  [4, 26],
  [22, 10],
  [44, 6],
  [60, 12],
])

/* ---------- Timeline ---------- */

type Cam = 'closed' | 'spread' | 'left' | 'right'
type PageId = 'cover' | 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6'

interface Key {
  at: number
  cam: Cam
  turned: number
}

interface Timeline {
  keys: Key[]
  stops: Partial<Record<PageId, number>>
  total: number
}

const chapters: { label: string; page: PageId }[] = [
  { label: 'Cover', page: 'cover' },
  { label: 'Work', page: 'p1' },
  { label: 'Projects', page: 'p3' },
  { label: 'Hobbies', page: 'p5' },
]

function buildTimeline(pageMode: boolean): Timeline {
  const keys: Key[] = [{ at: 0, cam: 'closed', turned: 0 }]
  const stops: Timeline['stops'] = { cover: 0 }
  let at = 0
  const last = () => keys[keys.length - 1]
  const move = (length: number, cam: Cam, turned = last().turned) => {
    at += length
    keys.push({ at, cam, turned })
  }
  const hold = (length: number, ...pages: PageId[]) => {
    for (const page of pages) stops[page] ??= at + length * 0.5
    move(length, last().cam)
  }

  hold(0.35)
  if (!pageMode) {
    move(1.3, 'spread', 1) // zoom out while the cover opens
    hold(0.9, 'p1', 'p2')
    move(1.2, 'spread', 2)
    hold(0.9, 'p3', 'p4')
    move(1.2, 'spread', 3)
    hold(0.9, 'p5', 'p6')
  } else {
    // Small screens: show the whole open book, then read it page by page.
    move(1.3, 'spread', 1)
    hold(0.3)
    move(0.6, 'left')
    hold(0.6, 'p1')
    move(0.6, 'right')
    hold(0.6, 'p2')
    move(1.2, 'left', 2) // the camera follows the turning page across
    hold(0.6, 'p3')
    move(0.6, 'right')
    hold(0.6, 'p4')
    move(1.2, 'left', 3)
    hold(0.6, 'p5')
    move(0.6, 'right')
    hold(0.6, 'p6')
  }
  return { keys, stops, total: at }
}

/* ---------- Live state ---------- */

const track = ref<HTMLElement | null>(null)
const world = ref<HTMLElement | null>(null)
const coverLeaf = ref<HTMLElement | null>(null)
const paperLeafOne = ref<HTMLElement | null>(null)
const paperLeafTwo = ref<HTMLElement | null>(null)
const trackHeight = ref('600vh')
const hint = ref(1)
const activeChapter = ref(0)

interface PaperParts {
  root: HTMLElement
  front: HTMLElement
  back: HTMLElement
  flap: HTMLElement
  frontCrease: HTMLElement
  backCrease: HTMLElement
}
let paperLeaves: PaperParts[] = []

let timeline = buildTimeline(false)
let pageMode = false
let unit = 800 // scroll pixels per timeline unit
let viewW = 0
let viewH = 0
let target = 0
let current = 0
let frame = 0
let lastTime = 0
let reducedMotion = false
let motionQuery: MediaQueryList | undefined

function camera(cam: Cam) {
  const roomW = viewW - 24
  const roomH = viewH - 170 // leave room for the top bar and chapter tabs
  const spread = Math.min(roomW / (PAGE_W * 2), roomH / PAGE_H)
  switch (cam) {
    case 'closed': {
      const fit = Math.min((viewH - 90) / PAGE_H, (viewW - 32) / PAGE_W)
      const scale = Math.min(Math.max(fit, spread * 1.18), (viewH - 90) / PAGE_H)
      return { x: PAGE_W / 2, scale, rotate: -3 }
    }
    case 'spread':
      return { x: 0, scale: spread, rotate: 0 }
    case 'left':
    case 'right': {
      const page = Math.min((viewW - 12) / PAGE_W, roomH / PAGE_H)
      return { x: cam === 'left' ? -PAGE_W / 2 : PAGE_W / 2, scale: page, rotate: 0 }
    }
  }
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** z-order: unturned leaves stack first-on-top, turned ones last-on-top, a turning one above all. */
function leafZ(index: number, turn: number, count: number): string {
  if (turn <= 0) return String(10 + count - index)
  if (turn >= 1) return String(20 + index)
  return '40'
}

function render(at: number) {
  const { keys } = timeline
  let i = 0
  while (i < keys.length - 2 && keys[i + 1].at <= at) i++
  const a = keys[i]
  const b = keys[i + 1] ?? a
  const raw = b.at > a.at ? clamp((at - a.at) / (b.at - a.at), 0, 1) : 0
  const t = reducedMotion ? Math.round(raw) : ease(raw)
  const turnOf = (index: number) => mix(a.turned > index ? 1 : 0, b.turned > index ? 1 : 0, t)

  const from = camera(a.cam)
  const to = camera(b.cam)
  const scale = mix(from.scale, to.scale, t)
  const x = mix(from.x, to.x, t)
  const rotate = mix(from.rotate, to.rotate, t)
  if (world.value) {
    world.value.style.transform = `scale(${scale}) rotate(${rotate}deg) translateX(${-x}px)`
  }

  const count = 1 + paperLeaves.length

  // The hard cover swings on its hinge.
  const cover = coverLeaf.value
  if (cover) {
    const turn = turnOf(0)
    cover.style.transform = `perspective(2400px) rotateY(${-180 * turn}deg)`
    cover.style.zIndex = leafZ(0, turn, count)
    cover.style.setProperty('--lift', Math.sin(Math.PI * turn).toFixed(3))
  }

  // Paper pages fold over from the corner.
  paperLeaves.forEach((leaf, index) => {
    const turn = turnOf(index + 1)
    const fold = foldPage(turn, PAPER_W, PAPER_H)
    leaf.root.style.zIndex = leafZ(index + 1, turn, count)
    leaf.front.style.clipPath = fold.frontClip
    leaf.front.style.visibility = turn >= 1 ? 'hidden' : 'visible'
    leaf.back.style.clipPath = fold.backClip
    leaf.back.style.transform = fold.backTransform
    leaf.back.style.visibility = turn <= 0 ? 'hidden' : 'visible'
    leaf.frontCrease.style.transform = fold.frontCrease
    leaf.backCrease.style.transform = fold.backCrease
    leaf.frontCrease.style.opacity = fold.lift.toFixed(3)
    leaf.backCrease.style.opacity = fold.lift.toFixed(3)
    leaf.flap.style.filter =
      fold.lift > 0.01
        ? `drop-shadow(${(-6 * fold.lift).toFixed(1)}px ${(8 * fold.lift).toFixed(1)}px ${(18 * fold.lift).toFixed(1)}px rgb(40 22 5 / ${(0.42 * fold.lift).toFixed(2)}))`
        : 'none'
  })

  hint.value = clamp(1 - at / 0.3, 0, 1)
  let chapter = 0
  chapters.forEach((c, index) => {
    const stop = timeline.stops[c.page]
    if (stop !== undefined && at >= stop - 0.7) chapter = index
  })
  if (chapter !== activeChapter.value) activeChapter.value = chapter
}

function trackTop(): number {
  return track.value ? track.value.getBoundingClientRect().top + window.scrollY : 0
}

function readScroll() {
  target = clamp((window.scrollY - trackTop()) / unit, 0, timeline.total)
}

function tick(now: number) {
  const dt = Math.min(64, now - lastTime)
  lastTime = now
  const k = reducedMotion ? 1 : 1 - Math.exp(-dt / 120)
  current += (target - current) * k
  if (Math.abs(target - current) < 0.0004) current = target
  render(current)
  frame = current === target ? 0 : requestAnimationFrame(tick)
}

function onScroll() {
  readScroll()
  if (!frame) {
    lastTime = performance.now()
    frame = requestAnimationFrame(tick)
  }
}

function layout() {
  const widthChanged = window.innerWidth !== viewW
  const heightJump = Math.abs(window.innerHeight - viewH) > 150
  viewW = window.innerWidth
  viewH = window.innerHeight
  // Mobile address bars change the height while scrolling; only rebuild the
  // track for real resizes, so the book doesn't jump mid-read.
  if (widthChanged || heightJump) {
    const roomH = (viewH - 170) / PAGE_H
    const spread = Math.min((viewW - 24) / (PAGE_W * 2), roomH)
    const page = Math.min((viewW - 12) / PAGE_W, roomH)
    // Reading page by page only helps when width, not height, is what's short.
    pageMode = spread < MIN_SPREAD_SCALE && page > spread * 1.2
    timeline = buildTimeline(pageMode)
    unit = viewH * 0.9
    trackHeight.value = `${timeline.total * unit + viewH}px`
  }
  readScroll()
  current = target
  render(current)
}

function goTo(page: PageId) {
  const stop = timeline.stops[page]
  if (stop === undefined) return
  window.scrollTo({ top: trackTop() + stop * unit, behavior: reducedMotion ? 'auto' : 'smooth' })
}

/** Tabbing to a link on a page that isn't showing scrolls the book to it. */
function onFocusIn(event: FocusEvent) {
  const face = (event.target as HTMLElement).closest<HTMLElement>('[data-page]')
  const page = face?.dataset.page as PageId | undefined
  if (!page) return
  const stop = timeline.stops[page]
  if (stop !== undefined && Math.abs(stop - target) > 0.4) goTo(page)
}

function onMotionChange() {
  reducedMotion = motionQuery?.matches ?? false
  render(current)
}

function partsOf(root: HTMLElement | null): PaperParts[] {
  if (!root) return []
  const pick = (selector: string) => root.querySelector<HTMLElement>(selector)
  const front = pick('.face--front')
  const back = pick('.face--back')
  const flap = pick('.flap')
  const frontCrease = pick('.face--front .crease')
  const backCrease = pick('.face--back .crease')
  if (!front || !back || !flap || !frontCrease || !backCrease) return []
  return [{ root, front, back, flap, frontCrease, backCrease }]
}

onMounted(() => {
  paperLeaves = [...partsOf(paperLeafOne.value), ...partsOf(paperLeafTwo.value)]
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion = motionQuery.matches
  motionQuery.addEventListener('change', onMotionChange)
  layout()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', layout)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', layout)
  motionQuery?.removeEventListener('change', onMotionChange)
})
</script>

<template>
  <div ref="track" class="track book-scene" :style="{ height: trackHeight }">
    <div class="stage">
      <div ref="world" class="world" :style="geometry" @focusin="onFocusIn">
        <div class="desk" aria-hidden="true"></div>

        <div class="pad" aria-hidden="true"></div>
        <DeskProps />

        <div class="book">
          <div class="board" aria-hidden="true"></div>
          <div class="ribbon" aria-hidden="true"></div>

          <!-- Last page, under every leaf: say hello -->
          <section class="sheet-paper page page--right base" data-page="p6" aria-labelledby="hello-title">
            <p class="running">Say hello</p>
            <h2 id="hello-title" class="page__title">Say hello</h2>
            <svg class="underline" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true">
              <path v-for="(d, i) in underlines.hello" :key="i" :d="d" />
            </svg>
            <p class="lead">
              If you’re building something with NestJS, Vue, PostgreSQL or LLMs and want to
              compare notes, I’d like to hear about it.
            </p>
            <ul class="contacts">
              <li v-for="contact in contacts" :key="contact.label">
                <span class="muted">{{ contact.label }}</span>
                <a
                  class="link"
                  :href="contact.href"
                  :target="contact.label === 'Email' ? undefined : '_blank'"
                  rel="noopener noreferrer"
                >
                  {{ contact.text }}
                </a>
              </li>
            </ul>

            <div v-for="project in shelf" :key="project.name" class="colophon">
              <p class="kicker">About this book</p>
              <p>{{ project.text }}</p>
              <p class="stack muted">{{ project.stack.join(' · ') }}</p>
            </div>

            <div class="actions">
              <RouterLink class="button button--primary button--small" to="/blog">
                Read the blog
              </RouterLink>
              <RouterLink class="button button--small" to="/classic">Classic view</RouterLink>
            </div>
            <p class="the-end">The end, for now.</p>
            <p class="folio">6</p>
          </section>

          <!-- Leaf 3: projects (continued) / off the clock -->
          <div ref="paperLeafTwo" class="leaf leaf--paper">
            <section class="face face--front sheet-paper page page--right" data-page="p4" aria-label="Projects, continued">
              <p class="running">Things I’ve built</p>
              <article v-for="project in projectPages[1]" :key="project.name" class="project">
                <p class="kicker">{{ project.context }}</p>
                <h3>
                  <a v-if="project.url" class="link" :href="project.url">{{ project.name }}</a>
                  <template v-else>{{ project.name }}</template>
                </h3>
                <p>{{ project.text }}</p>
                <p class="stack muted">{{ project.stack.join(' · ') }}</p>
              </article>
              <p class="note note--next" aria-hidden="true">to be continued →</p>
              <p class="folio">4</p>
              <span class="crease crease--front" aria-hidden="true"></span>
            </section>
            <div class="flap">
              <section class="face face--back sheet-paper page page--left" data-page="p5" aria-labelledby="off-title">
                <p class="running">{{ profile.name }}</p>
                <p class="kicker">Chapter three</p>
                <h2 id="off-title" class="page__title">Off the clock</h2>
                <svg class="underline" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true">
                  <path v-for="(d, i) in underlines.off" :key="i" :d="d" />
                </svg>
                <ul class="hobbies">
                  <li v-for="item in offHours" :key="item.title">
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.text }}</p>
                    <a
                      v-if="item.url"
                      class="link"
                      :href="item.url"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ item.linkText }}
                    </a>
                  </li>
                </ul>
                <div class="shelf">
                  <p class="kicker">On the shelf</p>
                  <dl>
                    <div v-for="group in favourites" :key="group.shelf" class="shelf__row">
                      <dt>{{ group.shelf }}</dt>
                      <dd>
                        <span v-for="title in group.titles" :key="title" class="shelf__title">{{ title }}</span>
                      </dd>
                    </div>
                  </dl>
                </div>
                <p class="folio">5</p>
                <span class="crease crease--back" aria-hidden="true"></span>
              </section>
            </div>
          </div>

          <!-- Leaf 2: highlights / projects -->
          <div ref="paperLeafOne" class="leaf leaf--paper">
            <section class="face face--front sheet-paper page page--right" data-page="p2" aria-label="Highlights">
              <p class="running">At {{ work.company }}</p>
              <p class="kicker">Chapter one, continued</p>
              <h2 class="page__title">What I’ve done there</h2>
              <svg class="underline" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true">
                <path v-for="(d, i) in underlines.done" :key="i" :d="d" />
              </svg>
              <ol class="highlights">
                <li v-for="item in work.highlights" :key="item.title">{{ item.title }}</li>
              </ol>
              <RouterLink class="more" :to="{ path: '/classic', hash: '#work' }">
                the longer version →
              </RouterLink>
              <p class="folio">2</p>
              <span class="crease crease--front" aria-hidden="true"></span>
            </section>
            <div class="flap">
              <section class="face face--back sheet-paper page page--left" data-page="p3" aria-labelledby="built-title">
                <p class="running">{{ profile.name }}</p>
                <p class="kicker">Chapter two</p>
                <h2 id="built-title" class="page__title">Things I’ve built</h2>
                <svg class="underline" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true">
                  <path v-for="(d, i) in underlines.built" :key="i" :d="d" />
                </svg>
                <article v-for="project in projectPages[0]" :key="project.name" class="project">
                  <p class="kicker">{{ project.context }}</p>
                  <h3>
                    <a v-if="project.url" class="link" :href="project.url">{{ project.name }}</a>
                    <template v-else>{{ project.name }}</template>
                  </h3>
                  <p>{{ project.text }}</p>
                  <p class="stack muted">{{ project.stack.join(' · ') }}</p>
                </article>
                <p class="folio">3</p>
                <span class="crease crease--back" aria-hidden="true"></span>
              </section>
            </div>
          </div>

          <!-- Leaf 1: the hard cover / inside cover with where I work now -->
          <div ref="coverLeaf" class="leaf leaf--cover">
            <header class="side side--front cover" data-page="cover">
              <svg class="cover__frame" :viewBox="`0 0 ${PAGE_W} ${PAGE_H}`" aria-hidden="true">
                <path v-for="(d, i) in coverFrame" :key="i" :d="d" />
              </svg>
              <p class="cover__label">A portfolio</p>
              <h1 class="cover__name">{{ profile.name }}</h1>
              <p class="cover__role">{{ profile.role }}</p>
              <svg class="cover__rule" viewBox="140 -6 180 12" aria-hidden="true">
                <path v-for="(d, i) in coverRule" :key="i" :d="d" />
              </svg>
              <p class="cover__intro">
                <span v-for="text in profile.tagline" :key="text">{{ text }}</span>
              </p>
              <p class="cover__foot">{{ profile.location }} · {{ year }}</p>
            </header>
            <div class="side side--back inside-cover">
              <section class="sheet-paper page page--left" data-page="p1" aria-labelledby="work-title">
                <p class="running">{{ profile.name }}</p>
                <p class="kicker">Chapter one</p>
                <h2 id="work-title" class="page__title">Where I work now</h2>
                <svg class="underline" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true">
                  <path v-for="(d, i) in underlines.work" :key="i" :d="d" />
                </svg>
                <p class="company">{{ work.company }}</p>
                <p class="role">
                  {{ work.title }}<template v-if="work.period">, {{ work.period }}</template>
                </p>
                <p class="note note--company" aria-hidden="true">
                  <svg viewBox="0 0 64 30">
                    <path :d="noteArrow" />
                  </svg>
                  still here, still learning
                </p>
                <p>{{ work.about }}</p>
                <div class="education">
                  <p class="kicker">Before that</p>
                  <p class="education__degree">{{ education.degree }}</p>
                  <p class="muted">{{ education.school }}, {{ education.period }}</p>
                </div>
                <p class="folio">1</p>
              </section>
            </div>
          </div>
        </div>

        <div class="sunlight" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>

      <div class="grade" aria-hidden="true"></div>

      <nav class="bar" aria-label="Main">
        <RouterLink to="/classic">Classic view</RouterLink>
        <RouterLink to="/blog">Blog</RouterLink>
        <RouterLink to="/reading">Reading</RouterLink>
        <ThemeToggle />
      </nav>

      <p class="hint" :style="{ opacity: hint }" aria-hidden="true">
        <span class="hint__wheel"></span>
        Scroll to open the book
      </p>

      <nav class="chapters" :class="{ 'is-hidden': hint > 0.5 }" aria-label="Chapters">
        <button
          v-for="(chapter, index) in chapters"
          :key="chapter.page"
          type="button"
          :aria-current="index === activeChapter ? 'step' : undefined"
          @click="goTo(chapter.page)"
        >
          {{ chapter.label }}
        </button>
      </nav>
    </div>
  </div>
</template>

<!-- Scene colours. Unscoped so the theme selector on <html> can reach them. -->
<style>
.book-scene {
  /* Golden-hour honey oak */
  --wood: #b98552;
  --wood-deep: #7c4f2b;
  --wood-grain: rgb(80 42 12 / 0.2);
  /* Navy felt desk pad */
  --pad: #22305e;
  --pad-deep: #18224a;
  --stitch: rgb(240 226 196 / 0.45);
  /* Linen-bound book */
  --linen: #e6dcc4;
  --linen-deep: #c9b993;
  --stamp: #1f2a5a;
  /* Paper */
  --leaf: #f6efdf;
  --leaf-edge: #ddd0b2;
  --leaf-ink: #1b2559;
  --hand-ink: #24408e;
  --leaf-muted: #66667a;
  --leaf-rule: #d8cbab;
  --highlighter: #f2c94c;
  --sun: rgb(255 196 110);
  --sun-blend: overlay;
  --grade: radial-gradient(ellipse 90% 80% at 30% 20%, rgb(255 210 140 / 0.14), transparent 60%),
    radial-gradient(ellipse 90% 85% at 50% 50%, transparent 50%, rgb(60 30 5 / 0.38));
  --chrome: rgb(250 244 230 / 0.92);
  --chrome-ink: #1b2559;
}

:root[data-theme='dark'] .book-scene {
  /* The same desk at night, under a lamp */
  --wood: #4b3121;
  --wood-deep: #22150c;
  --wood-grain: rgb(0 0 0 / 0.32);
  --pad: #161f45;
  --pad-deep: #0e1533;
  --stitch: rgb(240 226 196 / 0.28);
  --linen: #d7ccb3;
  --linen-deep: #b0a17f;
  --leaf: #ebe2cd;
  --leaf-edge: #b8aa8a;
  --leaf-muted: #5b5a6c;
  --leaf-rule: #c9bb98;
  --sun: transparent;
  --grade: radial-gradient(ellipse 55% 55% at 55% 42%, rgb(255 205 130 / 0.16), transparent 70%),
    radial-gradient(ellipse 85% 80% at 50% 50%, transparent 38%, rgb(4 3 10 / 0.8));
  --chrome: rgb(22 36 92 / 0.88);
  --chrome-ink: #eef2ff;
}
</style>

<style scoped>
/* ---------- Stage ---------- */

.track {
  position: relative;
}

.stage {
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--wood-deep);
}

.world {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  transform-origin: 0 0;
}

/* ---------- The desk ---------- */

.desk {
  position: absolute;
  left: -3200px;
  top: -2400px;
  width: 6400px;
  height: 4800px;
  background-color: var(--wood);
  background-image:
    /* plank seams */
    repeating-linear-gradient(
      90deg,
      transparent 0 396px,
      rgb(40 18 4 / 0.34) 396px 398px,
      rgb(255 235 200 / 0.06) 398px 400px
    ),
    /* long grain */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='800'%3E%3Cfilter id='g' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.08 0.004' numOctaves='3' seed='9' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.3 0 0 0 0 0.15 0 0 0 0 0.04 0 0 0 1.7 -0.6'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E"),
    repeating-linear-gradient(90deg, var(--wood-grain) 0 1px, transparent 1px 9px, rgb(255 240 210 / 0.03) 9px 11px, transparent 11px 27px);
  background-size:
    auto,
    400px 800px,
    auto;
}

/* Felt desk pad with a stitched edge. */
.pad {
  position: absolute;
  left: -630px;
  top: -450px;
  width: 1260px;
  height: 900px;
  border-radius: 14px;
  background-color: var(--pad);
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='f' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.22 -0.06'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at 40% 30%, rgb(255 255 255 / 0.05), transparent 70%);
  box-shadow:
    inset 0 0 0 2px var(--pad-deep),
    0 3px 0 var(--pad-deep),
    8px 18px 36px rgb(50 25 5 / 0.45);
}

.pad::after {
  content: '';
  position: absolute;
  inset: 16px;
  border: 2px dashed var(--stitch);
  border-radius: 8px;
}

/* Late sun through a window, falling across the desk. */
.sunlight {
  position: absolute;
  left: -1560px;
  top: -1080px;
  width: 1100px;
  height: 900px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 70px;
  transform: rotate(-28deg) skewX(18deg);
  pointer-events: none;
  mix-blend-mode: var(--sun-blend);
  opacity: 0.8;
}

.sunlight span {
  background: var(--sun);
  border-radius: 24px;
  box-shadow: 0 0 46px 18px var(--sun);
}

.grade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: var(--grade);
}

/* ---------- The book ---------- */

.book {
  position: absolute;
  left: calc(var(--page-w) * -1);
  top: calc(var(--page-h) / -2);
  width: calc(var(--page-w) * 2);
  height: var(--page-h);
}

/* The back board, under the right-hand pages. */
.board {
  position: absolute;
  left: var(--page-w);
  top: 0;
  width: var(--page-w);
  height: var(--page-h);
  border-radius: 2px 8px 8px 2px;
  background-color: var(--linen-deep);
  box-shadow:
    2px 3px 0 var(--leaf-edge),
    3px 5px 0 var(--linen-deep),
    10px 26px 40px -8px rgb(30 15 0 / 0.55);
}

/* A satin bookmark hanging out of the bottom. */
.ribbon {
  position: absolute;
  left: calc(var(--page-w) + 70px);
  top: calc(var(--page-h) - 60px);
  width: 16px;
  height: 140px;
  transform: rotate(6deg);
  transform-origin: top center;
  background: linear-gradient(90deg, #8e1f22, #c23a37 45%, #9c2427);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 88%, 0 100%);
  filter: drop-shadow(3px 4px 3px rgb(0 0 0 / 0.35));
}

/* Paper: warm, slightly grainy, darker towards the edges. */
.sheet-paper {
  background-color: var(--leaf);
  color: var(--leaf-ink);
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='p' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.33 0 0 0 0 0.16 0 0 0 0.3 -0.07'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E"),
    var(--gutter, none);
  box-shadow: inset 0 0 50px rgb(150 110 50 / 0.12);
}

.page--right {
  --gutter: linear-gradient(90deg, rgb(70 45 10 / 0.2), rgb(70 45 10 / 0.05) 6%, transparent 13%);
}

.page--left {
  --gutter: linear-gradient(270deg, rgb(70 45 10 / 0.2), rgb(70 45 10 / 0.05) 6%, transparent 13%);
}

/* The last page, lying on the back board. */
.base {
  position: absolute;
  left: var(--page-w);
  top: var(--paper-y);
  width: var(--paper-w);
  height: var(--paper-h);
  box-shadow:
    inset 0 0 50px rgb(150 110 50 / 0.12),
    1px 1px 0 var(--leaf-edge),
    2px 2px 0 var(--leaf),
    3px 3px 0 var(--leaf-edge);
}

/* Soft paper leaves: positioned on the paper area, folded by script. */
.leaf--paper {
  position: absolute;
  left: var(--page-w);
  top: var(--paper-y);
  width: var(--paper-w);
  height: var(--paper-h);
}

.leaf--paper .face {
  position: absolute;
  inset: 0;
}

.leaf--paper .face--back {
  transform-origin: 0 0;
  visibility: hidden;
}

.flap {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.flap > .face {
  pointer-events: auto;
}

/* Shading along the crease. Its left edge sits on the fold line. */
.crease {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(var(--crease) / 2);
  height: var(--crease);
  transform-origin: 0 0;
  pointer-events: none;
  opacity: 0;
}

.crease--front {
  /* the page bending up out of the flat */
  background: linear-gradient(
    90deg,
    rgb(60 35 5 / 0.3),
    rgb(60 35 5 / 0.1) 30px,
    rgb(60 35 5 / 0.03) 110px,
    transparent 220px
  );
}

.crease--back {
  /* the rounded fold catches the light, then falls into shade at the far edge */
  background: linear-gradient(
    90deg,
    rgb(60 35 5 / 0.22),
    rgb(255 250 235 / 0.35) 14px,
    rgb(255 250 235 / 0.08) 70px,
    transparent 160px,
    rgb(60 35 5 / 0.12) 520px
  );
}

/* The hard cover swings on its hinge in 3D. */
.leaf--cover {
  position: absolute;
  left: var(--page-w);
  top: 0;
  width: var(--page-w);
  height: var(--page-h);
  transform-origin: 0 50%;
  transform-style: preserve-3d;
}

.side {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.side--back {
  transform: rotateY(180deg);
}

.side::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: calc(var(--lift, 0) * 0.9);
  background: linear-gradient(90deg, rgb(30 15 0 / 0.3), rgb(30 15 0 / 0.06) 70%, transparent);
}

.side--back::after {
  background: linear-gradient(270deg, rgb(30 15 0 / 0.3), rgb(30 15 0 / 0.06) 70%, transparent);
}

.inside-cover {
  border-radius: 8px 2px 2px 8px;
  background-color: var(--linen-deep);
  box-shadow:
    -2px 3px 0 var(--leaf-edge),
    -3px 5px 0 var(--linen-deep),
    -10px 26px 40px -8px rgb(30 15 0 / 0.55);
}

.inside-cover .page {
  position: absolute;
  left: var(--paper-x, 9px);
  top: var(--paper-y);
  width: var(--paper-w);
  height: var(--paper-h);
}

/* ---------- Cover ---------- */

.cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 112px 56px 66px;
  border-radius: 2px 8px 8px 2px;
  text-align: center;
  color: var(--stamp);
  background-color: var(--linen);
  background-image:
    /* the hinge */
    linear-gradient(90deg, rgb(60 40 10 / 0.28), rgb(255 250 235 / 0.35) 3.5%, rgb(60 40 10 / 0.14) 5.5%, transparent 8.5%),
    /* linen weave */
    repeating-linear-gradient(0deg, rgb(120 95 50 / 0.07) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.18) 0 1px, transparent 1px 3px),
    radial-gradient(ellipse at 35% 25%, rgb(255 250 235 / 0.5), transparent 65%);
  box-shadow: inset 0 0 40px rgb(120 90 40 / 0.18);
}

.cover__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.cover__frame path,
.cover__rule path {
  fill: none;
  stroke: var(--stamp);
  stroke-width: 1.4;
  stroke-linecap: round;
  opacity: 0.55;
}

.cover__label {
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  opacity: 0.75;
}

.cover__name {
  margin-top: 60px;
  font-family: 'Caveat Variable', var(--font-display);
  font-size: 104px;
  font-weight: 600;
  line-height: 0.86;
  letter-spacing: -0.01em;
  color: var(--hand-ink);
  text-wrap: balance;
}

.cover__role {
  margin-top: 26px;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.cover__rule {
  width: 170px;
  height: 14px;
  margin-top: 30px;
  overflow: visible;
}

.cover__intro {
  display: grid;
  gap: 2px;
  margin-top: 28px;
  font-size: 16px;
  line-height: 1.5;
  opacity: 0.85;
}

.cover__foot {
  margin-top: auto;
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.14em;
  opacity: 0.6;
}

/* ---------- Pages ---------- */

.page {
  display: flex;
  flex-direction: column;
  padding: 54px 40px 44px;
  overflow: hidden;
  font-size: 15px;
  line-height: 1.55;
}

.page--left {
  padding-inline: 46px 38px;
}

.page--right {
  padding-inline: 38px 46px;
}

.page .muted {
  color: var(--leaf-muted);
}

.running {
  position: absolute;
  top: 22px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--leaf-muted);
}

.folio {
  position: absolute;
  bottom: 18px;
  font-family: 'Caveat Variable', var(--font-display);
  font-size: 20px;
  color: var(--leaf-muted);
}

.page--right .folio {
  right: 28px;
}

.page--left .folio {
  left: 28px;
}

.kicker {
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--leaf-muted);
}

.page__title {
  margin-top: 2px;
  font-family: 'Caveat Variable', var(--font-display);
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
  color: var(--hand-ink);
}

.underline {
  width: 58%;
  height: 10px;
  margin: 4px 0 20px;
  overflow: visible;
}

.underline path {
  fill: none;
  stroke: var(--highlighter);
  stroke-width: 3;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  opacity: 0.9;
}

/* Margin notes in pen. */
.note {
  font-family: 'Caveat Variable', var(--font-display);
  color: var(--hand-ink);
  line-height: 1.1;
}

.note svg {
  display: inline-block;
  width: 40px;
  height: 20px;
  margin-right: 4px;
  vertical-align: -2px;
  overflow: visible;
}

.note path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.note--company {
  margin: -6px 0 14px;
  font-size: 22px;
  transform: rotate(-2deg);
  transform-origin: left;
}

.note--next {
  align-self: flex-end;
  margin-top: auto;
  margin-bottom: 18px;
  font-size: 24px;
  transform: rotate(-3deg);
}

.company {
  font-family: var(--font-display);
  font-size: 38px;
  font-weight: 700;
  line-height: 1.05;
}

.role {
  margin: 8px 0 14px;
  font-weight: 600;
}

.education {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1.5px dashed var(--leaf-rule);
}

.education__degree {
  margin-top: 2px;
  font-family: var(--font-display);
  font-weight: 600;
}

.highlights {
  counter-reset: item;
  display: grid;
  gap: 12px;
}

.highlights li {
  counter-increment: item;
  display: grid;
  grid-template-columns: 30px 1fr;
  font-size: 16px;
  line-height: 1.35;
}

.highlights li::before {
  content: counter(item) '.';
  font-family: 'Caveat Variable', var(--font-display);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: #c22f29;
}

.more {
  align-self: flex-end;
  margin-top: auto;
  margin-bottom: 18px;
  font-family: 'Caveat Variable', var(--font-display);
  font-size: 24px;
  color: var(--hand-ink);
  text-decoration: none;
  transform: rotate(-2deg);
}

.more:hover {
  text-decoration: underline;
}

.project {
  font-size: 14.5px;
  line-height: 1.5;
}

.project + .project {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1.5px dashed var(--leaf-rule);
}

.page--right .project:first-of-type {
  margin-top: 4px;
}

.project h3 {
  margin: 2px 0 6px;
  font-size: 21px;
}

.project .stack {
  margin-top: 6px;
  font-size: 12.5px;
}

.hobbies {
  display: grid;
  gap: 22px;
}

.hobbies h3 {
  font-size: 23px;
  margin-bottom: 4px;
}

.hobbies a {
  display: inline-block;
  margin-top: 6px;
}

.shelf {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1.5px dashed var(--leaf-rule);
}

.shelf dl {
  display: grid;
  gap: 8px;
  margin: 8px 0 0;
}

.shelf__row {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
}

.shelf dt {
  font-family: 'Caveat Variable', var(--font-display);
  font-size: 21px;
  font-weight: 700;
  color: var(--hand-ink);
}

.shelf dd {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 6px;
  margin: 0;
}

/* Titles written on little spine labels. */
.shelf__title {
  padding: 1px 8px;
  border: 1.2px solid var(--leaf-rule);
  border-radius: 4px;
  background: rgb(255 255 255 / 0.35);
  font-size: 13px;
  white-space: nowrap;
}

.lead {
  font-size: 16.5px;
  line-height: 1.5;
}

.contacts {
  display: grid;
  gap: 6px;
  margin-top: 20px;
}

.contacts li {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 12px;
  justify-items: start;
}

.contacts a {
  overflow-wrap: anywhere;
}

.colophon {
  margin-top: 22px;
  padding: 14px 16px;
  border: 1.5px dashed var(--leaf-rule);
  border-radius: 6px;
  font-size: 14px;
}

.colophon .stack {
  margin-top: 6px;
  font-size: 12.5px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

/* Page buttons are drawn in the book's ink in both themes. */
.page .button {
  border-color: var(--leaf-ink);
  color: var(--leaf-ink);
}

.page .button--primary {
  background: var(--leaf-ink);
  color: var(--leaf);
}

.page .link {
  --link-stripe: #ffe45c;
  --link-line: rgb(27 37 89 / 0.55);
}

.the-end {
  margin-top: auto;
  text-align: center;
  font-family: 'Caveat Variable', var(--font-display);
  font-size: 28px;
  color: var(--hand-ink);
  transform: rotate(-2deg);
}

/* ---------- Chrome over the stage ---------- */

.bar,
.chapters {
  position: absolute;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  border-radius: 999px;
  background: var(--chrome);
  color: var(--chrome-ink);
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.25);
  backdrop-filter: blur(6px);
}

.bar {
  top: 14px;
  right: 16px;
  gap: 4px 16px;
  padding: 5px 6px 5px 18px;
  font-size: var(--step--1);
}

.bar a {
  text-decoration: none;
  border-bottom: 2px solid transparent;
}

.bar a:hover {
  border-bottom-color: var(--marker);
}

.bar :deep(.toggle) {
  border-color: transparent;
}

.chapters {
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  justify-content: center;
  gap: 2px;
  width: max-content;
  max-width: calc(100% - 32px);
  padding: 4px;
  transition: opacity 0.3s;
}

.chapters.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.chapters:focus-within {
  opacity: 1;
  pointer-events: auto;
}

.chapters button {
  padding: 6px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-display);
  font-size: var(--step--1);
  white-space: nowrap;
  cursor: pointer;
}

.chapters button:hover {
  background: rgb(127 127 127 / 0.15);
}

.chapters button[aria-current] {
  background: var(--marker);
  color: var(--on-marker);
}

.hint {
  position: absolute;
  z-index: 5;
  bottom: 18px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 10px;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 999px;
  background: rgb(25 14 4 / 0.6);
  color: #fbf3e4;
  font-family: var(--font-display);
  font-size: var(--step--1);
  white-space: nowrap;
  pointer-events: none;
}

.hint__wheel {
  position: relative;
  width: 15px;
  height: 23px;
  border: 1.5px solid currentColor;
  border-radius: 8px;
}

.hint__wheel::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 4px;
  width: 2px;
  height: 5px;
  margin-left: -1px;
  border-radius: 1px;
  background: currentColor;
  animation: wheel 1.6s ease-in-out infinite;
}

@keyframes wheel {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  70% {
    transform: translateY(7px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 0;
  }
}

@media (max-width: 34rem) {
  .bar {
    left: 16px;
    justify-content: center;
    padding-left: 12px;
  }

  .chapters button {
    padding: 6px 10px;
  }
}
</style>
