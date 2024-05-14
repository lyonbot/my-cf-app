export async function parseMedia(url: string | URL) {
  url = new URL(url)

  if (url.hostname === 'x.com' || url.hostname.includes('twitter.com')) {
    const j = await fetch(`https://api.vxtwitter.com/${url.pathname}`).then(x => x.json()) as any
    return j.mediaURLs as string[]
  }

  throw new Error('Unsupported Origin')
}