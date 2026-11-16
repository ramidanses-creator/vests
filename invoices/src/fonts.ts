// Rubik ships with the app (Hebrew + Latin only) instead of loading from Google Fonts,
// so it also works offline and can be embedded in generated PDFs.
import hebrew from '@fontsource-variable/rubik/files/rubik-hebrew-wght-normal.woff2?url'
import latinExt from '@fontsource-variable/rubik/files/rubik-latin-ext-wght-normal.woff2?url'
import latin from '@fontsource-variable/rubik/files/rubik-latin-wght-normal.woff2?url'

export const FONT_FAMILY = 'Rubik Variable'

const FACES = [
  { url: hebrew, range: 'U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F' },
  { url: latin, range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
  { url: latinExt, range: 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20A9,U+20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF' },
]

function css(src: (url: string) => string): string {
  return FACES.map(
    (f) =>
      `@font-face{font-family:'${FONT_FAMILY}';font-style:normal;font-weight:300 900;font-display:swap;src:url(${src(f.url)}) format('woff2');unicode-range:${f.range}}`,
  ).join('\n')
}

export function installFonts() {
  const style = document.createElement('style')
  style.textContent = css((u) => u)
  document.head.appendChild(style)
}

let embedded: Promise<string> | undefined

/** The same @font-face rules with the font files inlined, for drawing documents into PDFs. */
export function embeddedFontCss(): Promise<string> {
  embedded ??= Promise.all(
    FACES.map(async (f) => {
      const blob = await (await fetch(f.url)).blob()
      return [f.url, await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result as string)
        r.onerror = () => rej(r.error)
        r.readAsDataURL(blob)
      })] as const
    }),
  ).then((pairs) => {
    const map = new Map(pairs)
    return css((u) => map.get(u)!)
  })
  embedded.catch(() => (embedded = undefined))
  return embedded
}
