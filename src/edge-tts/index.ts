import { OUTPUT_FORMAT } from "./constants";
import { SubMaker } from "./SubMaker";

function randomUUID(): string {
  // Generate a random UUIDv4 string
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  return uuid;
}

type Connection = {
  ws: WebSocket
}

export interface VoiceInfo {
  Name: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  SuggestedCodec: string;
  FriendlyName: string;
  Status: string;
  VoiceTag: {
    ContentCategories: any[];
    VoicePersonalities: any[];
  };
}

export class EdgeTTS {
  private static TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
  private static VOICES_URL = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=${EdgeTTS.TRUSTED_CLIENT_TOKEN}`;
  private static SYNTH_URL = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EdgeTTS.TRUSTED_CLIENT_TOKEN}`;

  format = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  voice = 'zh-CN-YunxiaNeural'
  voiceLocale = 'zh-CN';

  setOutputFormat(format: OUTPUT_FORMAT): this {
    this.format = format;
    return this;
  }

  setVoice(voice: string): this {
    this.voice = voice;
    this.voiceLocale = /^\w+-\w+/.exec(voice)![0]
    return this;
  }

  static async listVoices(): Promise<VoiceInfo[]> {
    const resp = await fetch(EdgeTTS.VOICES_URL)
    return await resp.json()
  }

  private _wsPromise: Promise<Connection> | undefined
  private getConnection() {
    if (this._wsPromise) return this._wsPromise

    const promise = (async () => {
      const res = await fetch(`${EdgeTTS.SYNTH_URL}&ConnectionId=${connect_id()}`, {
        headers: {
          "Upgrade": "websocket",
          "Pragma": "no-cache",
          "Cache-Control": "no-cache",
          "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36 Edg/91.0.864.41",
        }
      })
      const ws = res.webSocket
      if (!ws) throw new Error('Cannot create websocket connection')

      const release = () => {
        if (promise === this._wsPromise) this._wsPromise = undefined;
      }
      ws.addEventListener('close', release)
      ws.addEventListener('error', release)

      ws.accept()
      return { ws }
    })();
    this._wsPromise = promise
    return this._wsPromise
  }

  async synthesize(text: string) {
    const { ws } = await this.getConnection()
    const date = new Date().toString()

    let download_audio = false
    let audio_chunks = [] as Uint8Array[]
    let audio_end_callback!: () => void

    let sentenceSubtitle = new SubMaker()
    let wordSubtitle = new SubMaker()

    ws.addEventListener('message', ({ data }) => {
      if (typeof data === 'string') {
        const headers = {} as Record<string, string>
        const headersEnd = data.indexOf('\r\n\r\n')

        data.slice(0, headersEnd).split('\r\n').forEach(line => {
          let sep = line.indexOf(':')
          let key = line.slice(0, sep).toLowerCase()
          let value = line.slice(sep + 1)
          headers[key] = value
        })

        const body = data.slice(headersEnd + 4)
        switch (headers.path) {
          case "turn.start": {
            download_audio = true
            break
          }

          case "turn.end": {
            download_audio = false
            audio_end_callback()
            break
          }

          case 'audio.metadata': {
            (JSON.parse(body) as any).Metadata.forEach((metadata: any) => {
              let sub: SubMaker | undefined

              if (metadata.Type === 'WordBoundary') sub = wordSubtitle
              if (metadata.Type === 'SentenceBoundary') sub = sentenceSubtitle

              if (sub) sub.create_sub([metadata.Data.Offset, metadata.Data.Duration,], metadata.Data.text.Text)
            })
            break
          }
        }

        return
      }

      if (download_audio) {
        const u8 = new Uint8Array(data)
        const needle = new TextEncoder().encode('Path:audio\r\n')
        const body = u8.slice(indexOfUint8(u8, needle) + needle.length)
        audio_chunks.push(body)
      }
    })

    const finalReturn = {
      chunks: audio_chunks,
      sentenceSubtitle,
      wordSubtitle
    }

    return new Promise<typeof finalReturn>((resolve) => {
      audio_end_callback = () => {
        resolve(finalReturn)
      }

      ws.send([
        `X-Timestamp:${date}`,
        "Content-Type:application/json; charset=utf-8",
        "Path:speech.config",
        "",
        '{"context":{"synthesis":{"audio":{"metadataoptions":{',
        '"sentenceBoundaryEnabled":true,"wordBoundaryEnabled":true},',
        '"outputFormat":"' + this.format + '"',
        "}}}}\r\n",
      ].join('\r\n'))

      ws.send(ssml_headers_plus_data(
        connect_id(),
        date,
        mkssml(text, this.voice, '+0%', '+0%')
      ))
    })
  }
}

function ssml_headers_plus_data(request_id: string, timestamp: string, ssml: string) {
  return (
    `X-RequestId:${request_id}\r\n` +
    "Content-Type:application/ssml+xml\r\n" +
    `X-Timestamp:${timestamp}Z\r\n` + //  # This is not a mistake, Microsoft Edge bug.
    "Path:ssml\r\n\r\n" +
    ssml
  )
}

function connect_id() {
  return randomUUID().replace(/-/g, '')
}

function mkssml(text: string | Uint8Array, voice: string, rate: string, volume: string): string {
  text = toString(text);
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'><prosody pitch='+0Hz' rate='${rate}' volume='${volume}'>${text}</prosody></voice></speak>`;
  return ssml;
}

function toString(text: string | Uint8Array): string {
  if (typeof text === 'string') return text;
  return new TextDecoder().decode(text);
}

function indexOfUint8(data: Uint8Array, needle: Uint8Array): number {
  for (let i = 0; i < data.byteLength - needle.length; i++) {
    let j = 0
    for (; j < needle.length && data[i + j] === needle[j]; j++);
    if (j === needle.length) return i
  }
  return -1
}
