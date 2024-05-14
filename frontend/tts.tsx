import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import { fetchJson, FormField, modelX } from "./utils";
import type { VoiceInfo } from '../src/edge-tts'

const model = modelX
interface Resp {
  audio: string;
  wordSubtitle: string;
  sentenceSubtitle: string;
}

export function TTSPage() {
  const [text, setText] = createSignal('')
  const [resp, setResp] = createSignal<Resp | undefined>()
  const [loading, setLoading] = createSignal(false)

  const [audioUrl, setAudioUrl] = createSignal('')
  const [srt1Url, setSrt1Url] = createSignal('')
  const [srt2Url, setSrt2Url] = createSignal('')
  const [voice, setVoice] = createSignal('zh-CN-YunxiaNeural')
  const [voices] = createResource<VoiceInfo[]>(() => fetchJson('/tts/listVoices'))

  createEffect(() => {
    let url = audioUrl()
    if (!url) return
    return () => URL.revokeObjectURL(url)
  })

  async function start() {
    try {
      setLoading(!0)

      const resp: Resp = await fetchJson('/tts', {
        query: {
          voice: voice(),
          text: text(),
          format: 'full'
        },
      })

      let rawStr = atob(resp.audio)
      let blob = new Blob([Uint8Array.from(rawStr, s => s.charCodeAt(0))], { type: 'audio/mp3' })
      setAudioUrl(URL.createObjectURL(blob))
      setResp(resp)

      let srt1 = new File([resp.sentenceSubtitle], 'srt1.srt', { type: 'text/plain' })
      setSrt1Url(URL.createObjectURL(srt1))

      let srt2 = new File([resp.sentenceSubtitle], 'srt2.srt', { type: 'text/plain' })
      setSrt1Url(URL.createObjectURL(srt2))
    } catch (error) {
      console.log("error", error)
      alert(String(error))
    } finally {
      setLoading(false)
    }
  }

  return <section class="section">
    <div class="container">
      <h1 class="title">TTS</h1>

      <FormField label="语音">
        <div class="select">
          <select use:model={[voice, setVoice]}>
            <For each={voices() || []}>{
              item => <option value={item.ShortName}>{item.Name}</option>
            }</For>
          </select>
        </div>
      </FormField>

      <FormField label="内容">
        <textarea class="textarea" placeholder="输入要说的东西" use:model={[text, setText]}></textarea>
      </FormField>

      <div class="field is-grouped">
        <div class="control">
          <button class="button is-primary" classList={{ 'is-loading': loading() }} disabled={loading()} onClick={start}>开始合成</button>
        </div>
      </div>

      <Show when={audioUrl()}>
        <div class="block" style={{
          display: 'flex',
          'align-items': 'center',
          gap: '8px'
        }}>
          <audio autoplay src={audioUrl()} controls />
          <a class="button" download={"audio-" + text().slice(0, 10) + ".mp3"} href={audioUrl()}>下载音频文件</a>
        </div>
      </Show>

      <Show when={resp()}>

        <FormField label="字幕1">
          <a class="button" download={"audio-" + text().slice(0, 10) + ".srt"} href={srt1Url()}>下载srt字幕</a>
          <textarea class="textarea" readOnly>{resp()!.sentenceSubtitle}</textarea>
        </FormField>

        <FormField label="字幕2">
          <a class="button" download={"audio-" + text().slice(0, 10) + "-words.srt"} href={srt2Url()}>下载srt字幕</a>
          <textarea class="textarea" readOnly>{resp()!.wordSubtitle}</textarea>
        </FormField>

      </Show>
    </div>
  </section>
}