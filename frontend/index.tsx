import { createEffect, createMemo, createSignal, lazy, onMount, Suspense } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { TTSPage } from "./tts";
import { DownloaderPage } from "./downloader";
import { OtherAPIPage } from "./other-api";
import './index.css';
import 'github-markdown-css/github-markdown-light.css'

const pageApps = {
  TTS: TTSPage,
  Downloader: DownloaderPage,
  OtherAPI: OtherAPIPage,
}
const pageKeys = Object.keys(pageApps) as (keyof typeof pageApps)[]

const App = () => {
  const q = new URLSearchParams(location.search)
  const [pageKey, setPageKey] = createSignal(q.get('page') as (keyof typeof pageApps) || pageKeys[0])
  createEffect(() => {
    let updated = false

    const q = new URLSearchParams(location.search)
    if (q.get('page') !== pageKey()) { updated = true; q.set('page', pageKey()) }

    if (updated) window.history.replaceState({}, '', '?' + q.toString())
  })

  const [mailStr, setMailStr] = createSignal('')
  onMount(() => {
    const chs = '@s.noymoc.liamxof'.split('').reverse()
    chs.unshift(...chs.splice(-6))

    let temperature = 1;
    let timer = setInterval(() => {
      temperature *= 0.9
      if (temperature < 0.1) { temperature = 0; clearInterval(timer) }

      let c2 = chs.map(c => String.fromCharCode(c.charCodeAt(0) + Math.round((Math.random() - 0.5) * 4 * temperature)))
      for (let i = c2.length; i >= 0; i--) {
        if (Math.random() < temperature) [c2[i - 1], c2[i]] = [c2[i], c2[i - 1]];
      }

      setMailStr(c2.join(''))
    }, 60)
  })

  return <div class="appContainer">
    <nav class="tabs">
      <ul>
        {pageKeys.map(k => (
          <li classList={{ "is-active": k === pageKey() }}>
            <a onClick={() => setPageKey(k)}>{k}</a>
          </li>
        ))}
      </ul>
    </nav>

    <div class="appContent">
      <Suspense>
        <Dynamic component={pageApps[pageKey()]} />
      </Suspense>
    </div>

    <footer>
      <p>此处展示的都是个人的粗糙实验性接口，仅用于测试场景。</p>
      <p>如果有问题或者想联系，请邮件 {mailStr()}</p>
    </footer>
  </div>
};

render(App, document.getElementById("app")!);