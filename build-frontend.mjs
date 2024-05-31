//@ts-check

import esbuild from "esbuild";
import { writeFile } from 'fs/promises'
import { sassPlugin } from 'esbuild-sass-plugin'
import { solidPlugin } from "esbuild-plugin-solid";
import { tailwindPlugin } from 'esbuild-plugin-tailwindcss';

const isDev = process.argv.includes("--dev")

const ctx = await esbuild.context({
  entryPoints: ["frontend/index.tsx"],
  bundle: true,
  outfile: 'index.js',
  write: false,
  minify: !isDev,
  sourcemap: isDev ? 'inline' : false,
  loader: {
    ".svg": "dataurl",
    ".md": "text",
  },
  logLevel: "info",
  plugins: [
    solidPlugin(),
    tailwindPlugin(),
    sassPlugin({}),
    {
      name: 'myOutput',
      setup(build) {
        build.onEnd(async result => {
          const jsFile = result.outputFiles?.find(x => x.path.endsWith('.js'))
          const cssFile = result.outputFiles?.find(x => x.path.endsWith('.css'))
          const text = `<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="app"></div><style>${cssFile?.text}\n</style><script>${jsFile?.text}\n</script>`
          await writeFile('src/static.ts', `export const homepageHTML = ${JSON.stringify(text)};`)
          console.log(new Date().toLocaleTimeString() + ' updated.')

          if (!isDev) process.exit(0)
        })
      }
    }
  ],
})

if (isDev) await ctx.watch()
else await ctx.rebuild()
