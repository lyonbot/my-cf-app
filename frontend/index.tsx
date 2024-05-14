import { createEffect, createMemo, createSignal, lazy, Suspense } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { TTSPage } from "./tts";
import { DownloaderPage } from "./downloader";
import './index.css';

const pageApps = {
  TTS: TTSPage,
  Downloader: DownloaderPage
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

  return <div>
    <div class="tabs">
      <ul>
        {pageKeys.map(k => (
          <li classList={{ "is-active": k === pageKey() }}>
            <a onClick={() => setPageKey(k)}>{k}</a>
          </li>
        ))}
      </ul>
    </div>

    <Suspense>
      <Dynamic component={pageApps[pageKey()]} />
    </Suspense>
  </div>
};

render(App, document.getElementById("app")!);