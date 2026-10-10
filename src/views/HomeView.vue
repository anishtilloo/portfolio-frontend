<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { api } from '@/api/client'
import type { PostSummary } from '@/api/types'
import PostRow from '@/components/PostRow.vue'
import SketchFrame from '@/components/SketchFrame.vue'
import SystemSketch from '@/components/SystemSketch.vue'
import { education, offHours, profile, projects, toolbox, work } from '@/content/profile'

const latest = ref<PostSummary[]>([])
const latestState = ref<'loading' | 'ready' | 'error'>('loading')

onMounted(async () => {
  try {
    latest.value = (await api.listPosts({ limit: 3 })).items
    latestState.value = 'ready'
  } catch {
    latestState.value = 'error'
  }
})

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

/** 'https://github.com/someone/' -> 'someone' */
function handle(url: string, prefix = ''): string {
  const name = url.replace(/\/+$/, '').split('/').pop() ?? ''
  return name ? prefix + name : ''
}
</script>

<template>
  <section class="hero container">
    <div class="hero__text">
      <h1 class="hero__headline">{{ profile.headline }}</h1>
      <p class="hero__intro">{{ profile.intro }}</p>
      <div class="hero__actions">
        <RouterLink class="button button--primary" to="/blog">Read the blog</RouterLink>
        <a class="button" href="#work">See my work</a>
      </div>
    </div>
    <SystemSketch class="hero__sketch" />
  </section>

  <section id="work" class="section container work">
    <header class="work__intro">
      <h2 class="section__title">At {{ work.company }}</h2>
      <p class="work__role">
        {{ work.title }}<template v-if="work.period">, {{ work.period }}</template>
      </p>
      <p class="muted">{{ work.about }}</p>
    </header>

    <ul class="work__list">
      <li v-for="item in work.highlights" :key="item.title" class="work__item">
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>
      </li>
    </ul>
  </section>

  <section id="projects" class="section container">
    <h2 class="section__title">Things I’ve built</h2>
    <div class="projects">
      <SketchFrame
        v-for="(project, index) in projects"
        :key="project.name"
        tag="article"
        class="project"
        :seed="index * 7 + 3"
      >
        <p class="project__context muted">{{ project.context }}</p>
        <h3 class="project__name">
          <a v-if="project.url" class="link" :href="project.url">{{ project.name }}</a>
          <template v-else>{{ project.name }}</template>
        </h3>
        <p>{{ project.text }}</p>
        <p class="project__stack muted">
          <span class="visually-hidden">Built with </span>{{ project.stack.join(', ') }}
        </p>
      </SketchFrame>
    </div>
  </section>

  <section class="section container">
    <h2 class="section__title">Toolbox</h2>
    <dl class="toolbox">
      <div v-for="group in toolbox" :key="group.area" class="toolbox__row">
        <dt>{{ group.area }}</dt>
        <dd>{{ group.tools.join(', ') }}</dd>
      </div>
    </dl>
  </section>

  <section class="section container">
    <h2 class="section__title">Education</h2>
    <div class="education">
      <h3>{{ education.degree }}</h3>
      <p>{{ education.school }}</p>
      <p class="muted">{{ education.period }}</p>
    </div>
  </section>

  <section class="section container">
    <div class="section__head">
      <h2 class="section__title">Lately on the blog</h2>
      <RouterLink class="link" to="/blog">All posts</RouterLink>
    </div>

    <p v-if="latestState === 'loading'" class="muted" aria-live="polite">Loading posts…</p>
    <p v-else-if="latestState === 'error'" class="notice">
      Posts will show up here once the API is running.
    </p>
    <p v-else-if="!latest.length" class="notice">
      Nothing published yet. The first post is on its way.
    </p>
    <div v-else class="latest">
      <PostRow v-for="post in latest" :key="post.id" :post="post" />
    </div>
  </section>

  <section class="section container">
    <h2 class="section__title">Off the clock</h2>
    <ul class="off">
      <li v-for="item in offHours" :key="item.title">
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>
        <p v-if="item.url">
          <a class="link" :href="item.url" target="_blank" rel="noopener noreferrer">
            {{ item.linkText }}
          </a>
        </p>
      </li>
    </ul>
  </section>

  <section id="contact" class="section container contact">
    <h2 class="section__title">Say hello</h2>
    <p class="contact__lead">
      If you’re building something with NestJS, Vue, PostgreSQL or LLMs and want to compare notes,
      I’d like to hear about it.
    </p>
    <ul class="contact__list">
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
  </section>
</template>

<style scoped>
/* Hero */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  align-items: center;
  gap: clamp(2rem, 5vw, 4.5rem);
  padding-block: clamp(2.5rem, 7vw, 5.5rem) 1rem;
}

.hero__headline {
  font-size: var(--step-4);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.022em;
  font-variation-settings:
    'INFM' 55,
    'BNCE' 0,
    'SPAC' 0;
  max-width: 11ch;
}

.hero__intro {
  margin-top: 1.6rem;
  max-width: 33rem;
  font-size: var(--step-1);
  line-height: 1.5;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2rem;
}

.hero__sketch {
  max-width: 30rem;
  justify-self: end;
}

@media (max-width: 56rem) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero__sketch {
    justify-self: start;
  }
}

/* Sections */
.section {
  padding-top: var(--section);
}

.section__title {
  font-size: var(--step-3);
  margin-bottom: 1.75rem;
}

.section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1.5rem;
}

/* Work */
.work {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 1.5rem clamp(2rem, 6vw, 5rem);
}

.work__intro {
  position: sticky;
  top: 2rem;
  align-self: start;
}

.work__intro .section__title {
  margin-bottom: 0.6rem;
}

.work__role {
  font-weight: 600;
  margin-bottom: 0.9rem;
}

.work__item {
  padding-block: 1.25rem;
  border-top: 1.5px dashed var(--rule);
}

.work__item:first-child {
  padding-top: 0.4rem;
  border-top: 0;
}

.work__item h3 {
  font-size: var(--step-1);
  margin-bottom: 0.35rem;
}

@media (max-width: 56rem) {
  .work {
    grid-template-columns: 1fr;
  }

  .work__intro {
    position: static;
  }
}

/* Projects */
.projects {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
}

.project {
  display: flex;
  flex-direction: column;
  padding: 1.6rem 1.75rem 1.5rem;
}

.project__context {
  font-size: var(--step--1);
}

.project__name {
  font-size: var(--step-2);
  margin-block: 0.15rem 0.7rem;
}

.project__stack {
  margin-top: auto;
  padding-top: 1.1rem;
  font-size: var(--step--1);
}

@media (max-width: 46rem) {
  .projects {
    grid-template-columns: 1fr;
  }
}

/* Toolbox */
.toolbox {
  margin: 0;
  max-width: 46rem;
}

.toolbox__row {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 0.25rem 1.5rem;
  padding-block: 0.85rem;
  border-top: 1.5px dashed var(--rule);
}

.toolbox dt {
  font-family: var(--font-display);
  font-weight: 600;
}

.toolbox dd {
  margin: 0;
}

/* Education */
.education {
  max-width: 46rem;
}

.education h3 {
  font-size: var(--step-1);
  margin-bottom: 0.35rem;
}

/* Latest posts */
.latest > :last-child {
  border-bottom: 1.5px dashed var(--rule);
}

/* Off the clock */
.off {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 2rem 2.5rem;
}

.off h3 {
  font-size: var(--step-1);
  margin-bottom: 0.35rem;
}

.off p + p {
  margin-top: 0.5rem;
}

/* Contact */
.contact__lead {
  max-width: 36rem;
  font-size: var(--step-1);
  line-height: 1.5;
}

.contact__list {
  display: grid;
  gap: 0.6rem;
  margin-top: 1.75rem;
}

.contact__list li {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 1.5rem;
  justify-items: start;
}

.contact__list a {
  overflow-wrap: anywhere;
}

@media (max-width: 30rem) {
  .toolbox__row,
  .contact__list li {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
