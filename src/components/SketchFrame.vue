<script setup lang="ts">
/**
 * A box with a hand-drawn outline. The outline is redrawn whenever the box
 * changes size, and `seed` gives each frame its own slightly different hand.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { rect, seeded } from '@/lib/rough'

const props = withDefaults(defineProps<{ seed?: number; roughness?: number; tag?: string }>(), {
  seed: 1,
  roughness: 1,
  tag: 'div',
})

const box = ref<HTMLElement | null>(null)
const width = ref(0)
const height = ref(0)
let observer: ResizeObserver | undefined

onMounted(() => {
  if (!box.value) return
  observer = new ResizeObserver(() => {
    // offsetWidth/Height include padding; the outline goes around the whole box.
    width.value = box.value?.offsetWidth ?? 0
    height.value = box.value?.offsetHeight ?? 0
  })
  observer.observe(box.value)
})

onBeforeUnmount(() => observer?.disconnect())

const strokes = computed(() =>
  width.value && height.value
    ? rect(3, 3, width.value - 6, height.value - 6, seeded(props.seed), props.roughness)
    : [],
)
</script>

<template>
  <component :is="tag" ref="box" class="frame">
    <svg
      class="frame__lines"
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      aria-hidden="true"
    >
      <path v-for="(d, index) in strokes" :key="index" :d="d" />
    </svg>
    <slot />
  </component>
</template>

<style scoped>
.frame {
  position: relative;
  isolation: isolate;
}

/* The sheet of paper inside the outline. */
.frame::before {
  content: '';
  position: absolute;
  inset: 4px;
  z-index: -1;
  background: var(--sheet);
}

.frame__lines {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.frame__lines path {
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.35;
  stroke-linecap: round;
  opacity: 0.88;
}
</style>
