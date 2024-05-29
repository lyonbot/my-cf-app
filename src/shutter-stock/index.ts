const key = 'gctKuNNKkPvvf9FegwLANT4iSYYv27rWuzPzTkkKOaN8xYsvmhPMcZJh'

export async function searchShutterStockVideo(keyword: string, opts?: {
  page?: number
}) {
  let url = new URL(`https://api.pexels.com/videos/search`)
  url.searchParams.set('query', keyword)
  if (+opts?.page! > 1) url.searchParams.set('page', String(opts?.page))

  let answer: ShutterStockVideoResult = await fetch(url, {
    headers: {
      Authorization: key,
      'Accept': '*/*',
    }
  })
    .then(x => (x.json()))

  return answer
}

export type ShutterStockVideoResult = {
  page: number
  per_page: number
  total_results: number
  url: string
  videos: Array<{
    id: number
    width: number
    height: number
    url: string
    image: string
    duration: number
    user: {
      id: number
      name: string
      url: string
    }
    video_files: Array<{
      id: number
      quality: string
      file_type: string
      width?: number
      height?: number
      link: string
    }>
    video_pictures: Array<{
      id: number
      picture: string
      nr: number
    }>
  }>
}

