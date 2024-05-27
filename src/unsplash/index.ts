export async function searchUnsplash(keyword: string, opts?: {
  page?: number
  size?: number
}) {
  let url = new URL('https://unsplash.com/napi/search/photos?page=1&per_page=20&query=')
  url.searchParams.set('query', keyword)
  url.searchParams.set('page', String(opts?.page || 1))
  url.searchParams.set('per_page', String(opts?.size || 20))

  let answer: UnsplashResult = await fetch(url, {
    headers: {
      'User-Agent': 'curl/8.4.0'
    }
  }).then(x => x.json())

  return answer
}

export type UnsplashResult = {
  total: number
  total_pages: number
  results: Array<{
    id: string
    slug: string
    alternative_slugs: {
      en: string
      es: string
      ja: string
      fr: string
      it: string
      ko: string
      de: string
      pt: string
    }
    created_at: string
    updated_at: string
    promoted_at?: string
    width: number
    height: number
    color: string
    blur_hash: string
    description?: string
    alt_description: string
    breadcrumbs: Array<{
      slug: string
      title: string
      index: number
      type: string
    }>
    urls: {
      raw: string
      full: string
      regular: string
      small: string
      thumb: string
      small_s3: string
    }
    links: {
      self: string
      html: string
      download: string
      download_location: string
    }
    likes: number
    liked_by_user: boolean
    current_user_collections: Array<any>
    sponsorship: any
    topic_submissions: {
      [k: string]: {
        status: string
        approved_on?: string
      }
    }
    asset_type: string
    premium: boolean
    plus: boolean
    user: {
      id: string
      updated_at: string
      username: string
      name: string
      first_name: string
      last_name?: string
      twitter_username?: string
      portfolio_url?: string
      bio?: string
      location?: string
      links: {
        self: string
        html: string
        photos: string
        likes: string
        portfolio: string
        following: string
        followers: string
      }
      profile_image: {
        small: string
        medium: string
        large: string
      }
      instagram_username?: string
      total_collections: number
      total_likes: number
      total_photos: number
      total_promoted_photos: number
      total_illustrations: number
      total_promoted_illustrations: number
      accepted_tos: boolean
      for_hire: boolean
      social: {
        instagram_username?: string
        portfolio_url?: string
        twitter_username?: string
        paypal_email: any
      }
    }
    tags_preview: Array<any>
    search_source: string
  }>
}
