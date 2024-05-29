export function OtherAPIPage() {
  return <div>
    <h2>/unsplash</h2>
    <p>Search for images from unsplash</p>
    <ul>
      <li>query</li>
      <li>page ?= 1</li>
      <li>pick ?= 0 -- redirect to a random image</li>
    </ul>

    <h2>/shutter-stock-video</h2>
    <p>Search for videos from shutter-stock</p>
    <ul>
      <li>query</li>
      <li>page ?= 1</li>
      <li>pick ?= 0 -- redirect to a random image</li>
    </ul>
  </div>
}