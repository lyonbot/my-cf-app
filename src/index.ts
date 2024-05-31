import { Context, Hono } from 'hono';
import { EdgeTTS } from "./edge-tts"
import { parseMedia } from './media-parser';
import { searchShutterStockVideo } from './shutter-stock';
import { homepageHTML } from "./static";
import { searchUnsplash } from './unsplash';
import { balancedMatch } from './utils/balanceMatch';

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
	c.header("Access-Control-Allow-Credentials", "true")
	c.header("Vary", "Origin")

	if (c.req.method === 'OPTIONS') {
		return c.body('OK')
	}
	return next()
})

function cascadeIndexOf(text: string, locators: (string | RegExp)[], from = 0) {
	let pos = from;
	for (let extract of locators) {
		if (typeof extract === 'string') {
			pos = text.indexOf(extract, pos)
		} else {
			const re = new RegExp(extract.source, extract.flags + (extract.global ? '' : 'g'))
			re.lastIndex = pos
			const match = re.exec(text)
			pos = match?.index ?? -1
		}
		if (pos === -1) return pos
	}

	return pos
}

function slice2(text: string, start: number | (string | RegExp)[], endAt: (string | RegExp)[]) {
	if (typeof start !== 'number') start = cascadeIndexOf(text, start)
	if (start < 0) return ''

	let end = cascadeIndexOf(text, endAt, start)
	if (end < start) return ''
	return text.slice(start, end)
}

async function getProxyResponse(c: Context, rawUrl: string | URL) {
	const url = new URL(rawUrl)
	const headers = {} as Record<string, string>
	for (let [k, v] of Object.entries(c.req.header())) {
		if (k.startsWith('cf-')) continue
		if (k.startsWith('x-real')) continue
		if (k.startsWith('x-forward')) continue
		if (k === 'host') v = url.hostname
		headers[k] = v
	}

	const balanceExtract = url.searchParams.getAll('__balanceExtract')
	if (balanceExtract.length) url.searchParams.delete('__balanceExtract')

	const res = await fetch(url, {
		method: c.req.method,
		body: c.req.raw.body,
		headers,
	}) as Response

	let resBody = res.body
	const resHeaders = {} as Record<string, string>
	res.headers.forEach((value, key) => {
		if (key.startsWith('access-control-')) return
		if (key === 'location') value = '/to/' + new URL(value, url).href
		resHeaders[key] = value
	})

	if (balanceExtract.length) {
		let text = await res.text()
		let extractedFrom = cascadeIndexOf(text, balanceExtract.map(extract => {
			const isRE = extract.startsWith('/') && /^\/(.+)\/([ium]*?)$/.exec(extract)
			if (isRE) return new RegExp(isRE[1], isRE[2])
			return extract
		}))

		let extractedText = extractedFrom !== -1 && balancedMatch(text.slice(extractedFrom))?.content

		return c.text(extractedText || '', 200, {
			'x-processed-by': 'extract-balance',
		})
	}

	return c.body(resBody, {
		status: res.status,
		headers: resHeaders,
	})
}

app.use(async (c, next) => {
	if (!c.req.path.startsWith('/to/')) return next()

	let rawUrl = c.req.raw.url
	let pos = rawUrl.indexOf('/to/')
	rawUrl = rawUrl.slice(pos + 4)

	return await getProxyResponse(c, rawUrl)
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
	const imageUrl = result.results[randomIndex].urls.regular;

	const imageRes = await fetch(imageUrl)
	const imageBuffer = await imageRes.arrayBuffer()
	c.header('content-type', imageRes.headers.get('content-type') || 'image/jpg')
	c.header('cache-control', imageRes.status === 200 ? 'public, max-age=38400' : 'no-cache')
	return c.body(imageBuffer)
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
	c.header('cache-control', videoRes.status === 200 ? 'public, max-age=38400' : 'no-cache')
	return c.body(videoBuffer)
})

app.get('/douban/movie', async (c) => {
	const id = c.req.query('id')
	if (!id) return c.json({ error: 'id is required' }, 400)

	const url = 'https://movie.douban.com/subject/' + encodeURIComponent(id)
	const resp = await getProxyResponse(c, url)
	const text = await resp.text()
	const proxyUrlPrefix = new URL(c.req.raw.url).origin + '/to/'

	const base = JSON.parse(balancedMatch(text.slice(cascadeIndexOf(text, [
		'application/ld+json',
		'{'
	])))!.content)

	let related = [] as { id: string, title: string, rating: string, cover: string, url: string }[]
	{
		let sectionHTML = slice2(text, ['class="recommendations-'], ['</div>'])
		let start = 0
		while ((start = cascadeIndexOf(sectionHTML, ['<dl'], start)) !== -1) {
			let end = sectionHTML.indexOf('</dl>', start)
			let itemHTML = sectionHTML.slice(start, end)
			if (end === -1) break
			start = end;

			const id = /\/(\d+)\//.exec(itemHTML)?.[1]
			if (!id) continue
			related.push({
				id,
				title: slice2(itemHTML, cascadeIndexOf(itemHTML, ['alt=', '"']) + 1, ['"']),
				cover: proxyUrlPrefix + slice2(itemHTML, cascadeIndexOf(itemHTML, ['src=', '"']) + 1, ['"']),
				rating: proxyUrlPrefix + slice2(itemHTML, cascadeIndexOf(itemHTML, ['rate', '>']) + 1, ['<']),
				url: 'https://movie.douban.com/subject/' + encodeURIComponent(id)
			})
		}
	}

	return c.json({
		id,
		type: base['@type'],
		title: base.name,
		url: 'https://movie.douban.com/subject/' + id,
		cover: proxyUrlPrefix + base.image,
		rating: base.aggregateRating.ratingValue,
		genre: base.genre,
		datePublished: base.datePublished,
		author: base.author,
		actor: base.actor,
		director: base.director,
		description: slice2(text, ['property="v:summary"', '>'], ['</span']).slice(1).trim(),

		related,
	})
})

app.get('/douban/search-movie', async (c) => {
	const query = c.req.query('query')?.trim()
	const page = +c.req.query('page')! || 1
	if (!query) return c.json({ error: 'query is required' }, 400)

	let url = 'https://search.douban.com/movie/subject_search?search_text=' + encodeURIComponent(query) + '&cat=1002&__balanceExtract=window.__DATA__'
	if (page > 1) url += '&start=' + (page - 1) * 15

	const resp = await getProxyResponse(c, url)
	const json: any = await resp.json()

	const proxyUrlPrefix = new URL(c.req.raw.url).origin + '/to/'

	return c.json({
		total: json.total,
		data: json.items
			.filter((x: any) => x.tpl_name === 'search_subject')
			.map((x: any) => ({
				id: x.id,
				title: x.title,
				cover: proxyUrlPrefix + x.cover_url,
				rating: x.rating.value,
				url: x.url,
				abstract: x.abstract,
				abstract_2: x.abstract_2,
			}))
	})
})

app.post('/chat/kindly', async (c) => {
	const { message } = await c.req.json()
	const ans = await fetch(`https://${c.env!.AZURE_OPENAI_DOMAIN}/openai/deployments/gpt4o/chat/completions?api-version=2024-02-01`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'api-key': String(c.env!.AZURE_OPENAI_KEY)
		},
		body: JSON.stringify({
			messages: [
				{ role: "system", content: "你刚刚加入一段对话中，请以最亲和的方式接上话茬，不要让气氛尴尬，可以用夸赞的语气和emoji增强亲和力🤗。" },
				{ role: "user", content: message },
			],
		}),
	});

	const fallbacks = [
		"嗯，我暂时没什么好说的🤔",
		"哦，这个问题让我有点困惑😅",
		"哎呀，我有点不知道该怎么接了🤷‍♂️",
		"我还在想怎么回答呢🤔",
		"这个话题有点超出我的知识范围了😅",
		"让我想一想该怎么接话🤔",
		"我一时不知道该说什么了🤷‍♀️",
		"我暂时没什么想法🧐",
		"这个问题我需要再想想🤔",
		"我感到有点迷茫，不知道该怎么接😅"
	]

	const json = await ans.json() as any
	return c.json({
		message: json?.choices?.[0]?.message?.content || fallbacks[Math.floor(Math.random() * fallbacks.length)]
	})
})

export default app; 
