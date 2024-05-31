import { marked } from 'marked'
import content from './other-api.md'

export function OtherAPIPage() {
  return <div class='markdown-body' style='margin: 0 20px' ref={el => {
    Promise.resolve(marked.parse(content, {
      gfm: true,
      breaks: true,
    })).then(html => el.innerHTML = html)
  }}></div>
}