import { useEffect, useState } from 'react'

let inAppDepth = 0

export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const raw = hash.replace(/^#\/?/, '')
  const [path, qs = ''] = raw.split('?')
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) }
}

export function go(path: string) {
  inAppDepth++
  window.location.hash = path
}

/** Replace the current entry (e.g. editor → issued document) so "back" skips it. */
export function replace(path: string) {
  const url = new URL(window.location.href)
  url.hash = path
  window.location.replace(url.toString())
}

export function back(fallback = '/') {
  if (inAppDepth > 0) {
    inAppDepth--
    window.history.back()
  } else {
    window.location.hash = fallback
  }
}
