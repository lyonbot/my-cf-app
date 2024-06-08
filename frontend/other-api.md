# 无稳定性保障的 API 们

## /assets/image

Search for images from unsplash

- query
- page ?= 1
- pick ?= 0 -- redirect to a random image

## /assets/video

Search for videos for placeholders

- query
- page ?= 1
- orientation ?= 'landscape' | 'portrait' | 'square'
- pick ?= 0 -- redirect to a random video

## /assets/music

Search for music

- query
- genre ?= (comma separated list of genre names, see [/assets/music/genres](/assets/music/genres) )
- page ?= 1
- pick ?= 0 -- redirect to a random music

## /chat/kindly

(method=POST) chat with a dumb AI. it always

- with JSON `{ message: "今天天气太差了" }`
- respond with JSON `{ "message": "没有啊，今天天气不错啊" }`

## /douban/search-movie

- query
- page ?= 1

## /douban/movie

- id

## /to/:url

代理到对应的地址。同时修改 CORS 响应头。

> _特殊功能_ 支持传入 `__balanceExtract=xxx` 参数，从而提取文档里的 JSON 数据。
>
> - 这个参数可以传入多次，从而实现递进的搜索
> - 如果某一个是 `/` 开头， `/i` 或者 `/` 结尾，则视为正则表达式搜索定位
>
> 例子：
>
> - 豆瓣电影搜索： `/to/https://search.douban.com/movie/subject_search?search_text=%E6%9C%BA%E5%99%A8%E4%BA%BA&cat=1002&__balanceExtract=window.__DATA__`
> - 豆瓣电影信息： `/to/https://movie.douban.com/subject/4888853/?__balanceExtract=ld%2Bjson&__balanceExtract={`
