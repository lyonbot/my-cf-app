import { createEffect, createSignal, onCleanup, Signal } from "solid-js";

export async function fetchJson(url: string, opts?: { query?: any, body?: any }) {
  let u = new URL(url, location.href);
  if (opts?.query) Object.entries(opts.query).forEach(([k, v]) => u.searchParams.set(k, v as string));

  let headers = {} as Record<string, string>;
  let init: RequestInit = {
    method: 'GET',
    headers
  }

  if (opts?.body) {
    init.method = 'POST'
    init.body = JSON.stringify(opts.body)
    headers['Content-Type'] = 'application/json'
  }

  const resp = await fetch(u, init)
  return await resp.json()
}

export function modelX(el: HTMLInputElement, x: () => Signal<any>) {
  const [accessor, setter] = x()
  const onChange = (ev: any) => setter(ev.target.value)
  el.addEventListener("change", onChange);

  createEffect(() => el.value = accessor() as any)
  onCleanup(() => el.removeEventListener("change", onChange));
}

export function FormField(props: { label: any, children: any }) {
  return <div class="field">
    <label class="label">{props.label}</label>
    <div class="control">{props.children}</div>
  </div>
}
