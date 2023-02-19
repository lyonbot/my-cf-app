import { EdgeTTS } from "./edge-tts"
import { homepageHTML } from "./static";

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

export default {
	fetch: async function (
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const reqOrigin = request.headers.get('origin') || '*'
		const corsHeaders = {
			"Access-Control-Allow-Origin": reqOrigin,
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Max-Age": "86400",
			"Vary": "Origin"
		}

		const method = request.method
		const { pathname, searchParams: query } = new URL(request.url)
		if (method === 'OPTIONS') return new Response('OK', { headers: corsHeaders })

		// ------------------------------------

		if (method === 'GET' && pathname === '/') {
			return new Response(homepageHTML, { headers: { ...corsHeaders, 'content-type': 'text/html' } })
		}

		if (method === 'GET' && pathname === '/tts/listVoices') {
			const ans = await EdgeTTS.listVoices()
			const blob = new Blob([JSON.stringify(ans)], { type: 'application/json' })
			return new Response(blob, { headers: corsHeaders })
		}

		if (method === 'GET' && pathname === '/tts') {
			const tts = new EdgeTTS();

			const format = query.get('format') as 'audio' | 'full' || 'audio'
			if (query.has('voice')) tts.setVoice(query.get('voice')!);

			const result = await tts.synthesize(String(query.get('text') ||
				"春节过后，北京、上海、深圳、南京、武汉等多地都传出房地产市场回暖的消息，楼市似乎在一夜间就由冷转热。市场的急剧变化，让很多从业者都有些措手不及。北京一位房产经纪人对中新经纬说：“回暖速度太快，我们也觉得有些突然。”"
			));

			const blob = new Blob([...result.chunks], { type: 'audio/mpeg' })
			if (format === 'audio') return new Response(blob, { headers: corsHeaders })

			return new Response(JSON.stringify({
				audio: btoa(Array.from(new Uint8Array(await blob.arrayBuffer()), x => String.fromCharCode(x)).join('')),
				wordSubtitle: result.wordSubtitle.generate_subs(),
				sentenceSubtitle: result.sentenceSubtitle.generate_subs(),
			}), { headers: corsHeaders })
		}

		return new Response(null, { status: 404 })
	},
};
