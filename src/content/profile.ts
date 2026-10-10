/**
 * Everything the portfolio pages say about you lives in this file.
 * Edit the text here; the layout picks it up.
 */

export const profile = {
  name: 'Anish Tilloo',
  role: 'Software Engineer',
  location: 'Nagpur, India',

  headline: 'I sketch systems, then build them.',
  intro:
    "I'm Anish, a full-stack engineer in Nagpur with nearly three years of owning features end to end, from database and API design through to the UI. At Claim Genius I work on an AI automation platform for vehicle inspection, and outside it I build LLM tools: a RAG document Q&A system and an LLM-powered pull request reviewer.",

  // Leave any of these empty ('') to hide it from the page.
  contact: {
    email: 'tillooanish2612@gmail.com',
    github: 'https://github.com/anishtilloo',
    linkedin: 'https://www.linkedin.com/in/anish-tilloo-799397195/',
    instagram: 'https://www.instagram.com/anishtilloo/',
    instagram1: 'https://www.instagram.com/sketchy_animated_life/',
  },
}

export const work = {
  company: 'Claim Genius',
  title: 'Full-Stack Developer',
  // e.g. '2023 to now'. Hidden while empty.
  period: 'Aug 2023 to now',
  about:
    'Claim Genius makes automotive claim management software, built around an AI platform for vehicle inspection. I work across it, from data modelling and NestJS services up to the Vue screens on top, including billing, notifications and internal network monitoring.',
  highlights: [
    {
      title: 'Average API response from ~30 s to ~0.4 s',
      text: 'An API in Parts catalogue extraction and validation took about 30 seconds on every request. In the NestJS service behind it, I removed N+1 queries, added indexes and rewrote the main query with CTEs, which brought an uncached request down to 3–5 s. An in-memory cache now answers about 97% of requests in roughly 300 ms.',
    },
    {
      title: 'Vue 3 migration and a shared component library',
      text: 'I drove the product-wide move to Vue 3 and TypeScript, and designed the reusable UI component library the whole product now builds on. It removed a lot of duplicate code and set the maintainability standard for the team.',
    },
    {
      title: 'Fast screens for large datasets',
      text: 'Reactive UI components that stay quick with large datasets and many users at once, plus a shared utility module that transforms data to region-specific schemas behind type-safe TypeScript interfaces.',
    },
    {
      title: 'Billing and notifications',
      text: 'I built core billing functionality and the notification module: the data model, the business rules, and how both fit into the wider claims workflow.',
    },
    {
      title: 'Network monitoring over SNMP',
      text: 'I contributed to an internal tool that collects machine-level metrics such as CPU, uptime and interface stats over SNMP for internal audits.',
    },
    {
      title: 'Analytics inside PostgreSQL',
      text: 'I build and maintain the database functions behind the platform’s analytics: time-zone-aware CTEs, weekly time buckets, and array parameters so a single call can filter across many ids.',
    },
    {
      title: 'Vision models as tools for AI agents',
      text: 'I built a Python MCP server that exposes the company’s computer-vision models, such as dent, scratch and airbag detection, as tools an AI agent can call.',
    },
    {
      title: 'How the team works with AI',
      text: 'I’m writing the company’s AI usage standard and leading the move to reusable agent skills, including a write-up and team session on what skills are and how to vet one before installing it.',
    },
    {
      title: 'Reviews and planning',
      text: 'I review a junior engineer’s pull requests and help shape and assign the team’s tasks so each one can be owned end to end.',
    },
  ],
}

export interface Project {
  name: string
  context: string
  text: string
  stack: string[]
  /** Optional link to a repo or live site. */
  url?: string
}

export const projects: Project[] = [
  {
    name: 'Intelligent document Q&A',
    context: 'Personal project, since May 2025',
    text: 'Upload PDFs and ask questions about them. A Go API chunks each document, embeds it with Gemini into Qdrant, retrieves the relevant passages and has Llama 3.3 70B on Groq reason its way to an answer. JWT auth keeps each user’s documents and query history separate.',
    stack: ['Go', 'Gin', 'Vue 3', 'TypeScript', 'Gemini', 'Groq', 'Qdrant', 'PostgreSQL'],
  },
  {
    name: 'Sports player analysis platform',
    context: 'Personal project, since May 2026',
    text: 'A backend for coaching staff to make strategy decisions from player performance, physical and wellness data. Spring Boot with JWT auth and role-based access over a multi-tenant PostgreSQL model managed with Flyway, with MongoDB planned for high-volume stat ingestion.',
    stack: ['Java', 'Spring Boot', 'PostgreSQL', 'Flyway', 'MongoDB'],
  },
  {
    name: 'Models MCP server',
    context: 'Claim Genius',
    text: 'Wraps the company’s computer-vision model APIs as Model Context Protocol tools, so an agent can check a photo for damage the same way it calls any other tool.',
    stack: ['Python', 'FastMCP', 'uv'],
  },
  {
    name: 'QA task companion',
    context: 'Agent skill',
    text: 'Takes a developer’s plain description of a finished task and produces two things for QA: a structured test-case sheet, and release notes written from the user’s side.',
    stack: ['Agent skills', 'Prompt design'],
  },
  {
    name: 'This site',
    context: 'Personal project',
    text: 'A portfolio with a blog I can write in from the browser. Tags and full-text search are done in PostgreSQL itself, not in application code.',
    stack: ['Vue 3', 'TypeScript', 'FastAPI', 'PostgreSQL'],
  },
]

export const toolbox = [
  { area: 'Server', tools: ['Node.js', 'NestJS', 'Express', 'Gin', 'Spring Boot'] },
  { area: 'Browser', tools: ['Vue 3', 'TypeScript', 'React', 'Tailwind CSS', 'Vite'] },
  {
    area: 'Data',
    tools: ['PostgreSQL', 'MongoDB', 'MySQL', 'Prisma', 'Indexing', 'Caching', 'Query tuning'],
  },
  {
    area: 'AI',
    tools: ['RAG', 'Vector embeddings', 'Qdrant', 'Gemini API', 'Groq API', 'Model Context Protocol'],
  },
  { area: 'Languages', tools: ['JavaScript', 'TypeScript', 'Python', 'SQL', 'Java', 'Go', 'C++'] },
  { area: 'Tools', tools: ['Git', 'Docker', 'API documentation'] },
]

export const education = {
  degree: 'B.E. in Computer Engineering',
  school: 'St. Vincent Pallotti College of Engineering and Technology, Nagpur',
  period: '2019 to 2023',
}

export const offHours = [
  {
    title: 'Sketching',
    text: 'I draw, and post the results on Instagram as @sketchy_animated_life.',
    url: 'https://www.instagram.com/sketchy_animated_life/',
    linkText: 'See the sketches',
  },
  {
    title: 'Sport, by the numbers',
    text: 'Cricket, football, basketball, baseball and badminton. I watch with the stats open.',
  },
  {
    title: 'Stories',
    text: 'Anime, films, TV and a steady pile of fiction.',
  },
  {
    title: 'The kitchen',
    text: 'I love food and cook with more enthusiasm than skill.',
  },
]
