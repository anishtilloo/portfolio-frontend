import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import createMarkdown, { type MarkdownIt, type RendererRule } from 'markdown-it'

// Only the languages this blog is likely to use, to keep the bundle small.
// Add another with hljs.registerLanguage('name', importedLanguage).
const languages = { bash, css, javascript, json, python, sql, typescript, xml, yaml }
for (const [name, language] of Object.entries(languages)) {
  hljs.registerLanguage(name, language)
}
hljs.registerAliases(['ts', 'vue'], { languageName: 'typescript' })
hljs.registerAliases(['js'], { languageName: 'javascript' })
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' })
hljs.registerAliases(['html'], { languageName: 'xml' })
hljs.registerAliases(['py'], { languageName: 'python' })
hljs.registerAliases(['yml'], { languageName: 'yaml' })
hljs.registerAliases(['postgres', 'postgresql', 'psql'], { languageName: 'sql' })

const md: MarkdownIt = createMarkdown({
  html: false, // raw HTML in a post is shown as text, never run
  linkify: true,
  typographer: true,
  highlight(code, language) {
    if (language && hljs.getLanguage(language)) {
      const { value } = hljs.highlight(code, { language, ignoreIllegals: true })
      return `<pre><code class="hljs language-${md.utils.escapeHtml(language)}">${value}</code></pre>`
    }
    return `<pre><code class="hljs">${md.utils.escapeHtml(code)}</code></pre>`
  },
})

// Links to other sites open in a new tab.
const renderLink: RendererRule =
  md.renderer.rules.link_open ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options))

md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const href = String(tokens[index].attrGet('href') ?? '')
  if (/^https?:\/\//i.test(href)) {
    tokens[index].attrSet('target', '_blank')
    tokens[index].attrSet('rel', 'noopener noreferrer')
  }
  return renderLink(tokens, index, options, env, self)
}

/** Turn Markdown into HTML that is safe to put on the page with v-html. */
export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(md.render(source), { ADD_ATTR: ['target'] })
}
