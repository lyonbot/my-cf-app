import { Hono } from 'hono';
import { EdgeTTS } from "./edge-tts"
import { parseMedia } from './media-parser';
import { searchShutterStockVideo } from './shutter-stock';
import { homepageHTML } from "./static";
import { searchUnsplash } from './unsplash';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
}

const app = new Hono()

app.use(async (c, next) => {
	const reqOrigin = c.req.header('origin') || '*'
	c.header("Access-Control-Allow-Origin", reqOrigin)
	c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
	c.header("Access-Control-Allow-Headers", "Content-Type")
	c.header("Access-Control-Max-Age", "86400")
	c.header("Vary", "Origin")

	if (c.req.method === 'OPTIONS') {
		return c.body('OK')
	}
	return next()
})

app.get('/', (c) => c.html(homepageHTML))
app.get('/tts', async (c) => {
	const tts = new EdgeTTS();

	const format = c.req.query('format') as 'audio' | 'full' || 'audio'
	if (c.req.query('voice')) tts.setVoice(c.req.query('voice')!);

	const result = await tts.synthesize(String(c.req.query('text') ||
		"春节过后，北京、上海、深圳、南京、武汉等多地都传出房地产市场回暖的消息，楼市似乎在一夜间就由冷转热。市场的急剧变化，让很多从业者都有些措手不及。北京一位房产经纪人对中新经纬说：“回暖速度太快，我们也觉得有些突然。”"
	));

	const blob = new Blob([...result.chunks], { type: 'audio/mpeg' })
	if (format === 'audio') return c.body(blob.stream())

	return c.json({
		audio: btoa(Array.from(new Uint8Array(await blob.arrayBuffer()), x => String.fromCharCode(x)).join('')),
		wordSubtitle: result.wordSubtitle.generate_subs(),
		sentenceSubtitle: result.sentenceSubtitle.generate_subs(),
	})
})
app.get('/tts/listVoices', async (c) => {
	const ans = await EdgeTTS.listVoices()
	return c.json(ans)
})

app.get('/media/*', async (c) => {
	const url = c.req.query('url') || c.req.path.slice(7)
	const parsed = await parseMedia(url)

	return c.json({ result: parsed })
})
app.get('/pro/*', async (c) => {
	const url = new URL(c.req.path.slice(5))
	url.search = new URLSearchParams(c.req.query()).toString()

	const headers = {
		...c.req.header(),
		host: url.hostname,
	} as Record<string, string>
	if (headers.referer?.includes('/pro/')) headers.referer = headers.referer.slice(headers.referer.indexOf('/pro/') + 5)

	const resp = await fetch(url, { headers })

	c.status(resp.status as any)
	resp.headers.forEach((v, k) => c.header(k, v))
	return c.body(await resp.arrayBuffer())
})

app.get('/unsplash', async (c) => {
	const query = c.req.query('query')
	const page = (+c.req.query('page')!) || 1
	const size = (+c.req.query('size')!) || 20
	const randomPick = +c.req.query('pick')!

	if (!query) return c.json({ error: 'query is required' }, 400)
	if (page < 1 || !Number.isInteger(page)) return c.json({ error: 'page must be a positive integer' }, 400)
	if (size < 1 || !Number.isInteger(size)) return c.json({ error: 'size must be a positive integer' }, 400)

	const result = await searchUnsplash(query, { page, size })
	if (!randomPick) return c.json(result)

	// random pick image
	const randomIndex = randomPick % result.results.length
	return c.redirect(result.results[randomIndex].urls.regular)
})

app.get('/shutter-stock-video', async (c) => {
	const query = c.req.query('query')
	const orientation = c.req.query('orientation') as 'landscape' | 'portrait' | 'square'
	const page = (+c.req.query('page')!) || 1
	const randomPick = +c.req.query('pick')!

	if (!query) return c.json({ error: 'query is required' }, 400)
	if (page < 1 || !Number.isInteger(page)) return c.json({ error: 'page must be a positive integer' }, 400)

	const result = await searchShutterStockVideo(query, { page, orientation })
	if (!randomPick) return c.json(result)

	// random pick image
	const videos = result.videos
	const randomIndex = randomPick % videos.length
	const videoURL = videos[randomIndex].video_files[0].link

	const videoRes = await fetch(videoURL)
	const videoBuffer = await videoRes.arrayBuffer()
	
	// for (const k of ['Content-Type', 'Content-Length', 'content-encoding']) {
	// 	if (videoRes.headers.get(k)) c.header(k, videoRes.headers.get(k)!)
	// }
	c.header('content-type', 'video/mp4')
	c.header('cache-control', videoRes.status === 200 ? 'public, max-age=31536000' : 'no-cache')
  return c.body(videoBuffer)
})

export default app;
