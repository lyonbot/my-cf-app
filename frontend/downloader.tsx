import { createMemo, createSignal, Index, Show } from "solid-js"


export function DownloaderPage() {
  const [resp, setResp] = createSignal<{ result: string[] }>()

  return <section class="section">
    <div class="container">
      <h1 class="title">Downloader</h1>

      <form
        class="is-flex"
        onSubmit={e => {
          const formData = new FormData(e.currentTarget)
          e.preventDefault()

          fetch('/media/?' + new URLSearchParams({
            url: formData.get('url') as string
          }))
            .then(r => r.json())
            .then(r => setResp(r))
            .catch(e => {
              console.error(e)
              alert(e)
            })
        }}
      >
        <input
          name="url"
          class="input is-primary"
          type="text"
          autocomplete="off"
          required
        />

        <button
          type="submit"
          class="button is-primary"
        >Fetch</button>
      </form>

      <Show when={resp()}>
        <ul>
          <Index each={resp()!.result}>
            {item => {
              const url = createMemo(() => new URL(item()))
              const filename = createMemo(() => {
                let path = url().pathname
                let idx = path.lastIndexOf('/') + 1
                return path.slice(idx)
              })
              return <li style="margin-top: .5em">
                <a href={`/pro/${item()}`} download={filename()}>{item}</a>
              </li>
            }}
          </Index>
        </ul>
      </Show>
    </div>
  </section>
}