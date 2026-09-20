import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  activeIndex: number
  count: number
  onChange: (index: number) => void
  renderPanel: (index: number) => ReactNode
  /** When false, swiping stops at the first/last index instead of wrapping around. */
  loop?: boolean
}

const SNAP_MS = 220

export function SwipeViews({ activeIndex, count, onChange, renderPanel, loop = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [dragPx, setDragPx] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const gesture = useRef<{ startX: number; startY: number; dx: number; axis: 'x' | 'y' | null }>({
    startX: 0,
    startY: 0,
    dx: 0,
    axis: null,
  })

  const hasPrev = loop || activeIndex > 0
  const hasNext = loop || activeIndex < count - 1
  const prevIndex = hasPrev ? (activeIndex - 1 + count) % count : activeIndex
  const nextIndex = hasNext ? (activeIndex + 1) % count : activeIndex

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(el.offsetWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function snapTo(target: number, after?: () => void) {
      setTransitioning(true)
      setDragPx(target)
      window.setTimeout(() => {
        setTransitioning(false)
        setDragPx(0)
        after?.()
      }, SNAP_MS)
    }

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      gesture.current = { startX: t.clientX, startY: t.clientY, dx: 0, axis: null }
    }

    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0]
      const g = gesture.current
      const dx = t.clientX - g.startX
      const dy = t.clientY - g.startY
      if (g.axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      }
      if (g.axis === 'x') {
        e.preventDefault()
        // Reversed: dragging left moves to the previous view, dragging right to the next.
        let nextDx = -dx
        if (nextDx < 0 && !hasNext) nextDx = nextDx / 3
        if (nextDx > 0 && !hasPrev) nextDx = nextDx / 3
        g.dx = nextDx
        setDragPx(nextDx)
      }
    }

    function onTouchEnd() {
      const g = gesture.current
      if (g.axis === 'x' && width > 0) {
        const threshold = width * 0.22
        if (g.dx <= -threshold && hasNext) {
          snapTo(-width, () => onChange((activeIndex + 1) % count))
        } else if (g.dx >= threshold && hasPrev) {
          snapTo(width, () => onChange((activeIndex - 1 + count) % count))
        } else {
          snapTo(0)
        }
      }
      gesture.current.axis = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [activeIndex, count, onChange, width, hasPrev, hasNext])

  return (
    <div ref={containerRef} className="overflow-hidden" style={{ touchAction: 'pan-y' }}>
      <div
        dir="ltr"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          transform: `translateX(${-width + dragPx}px)`,
          transition: transitioning ? `transform ${SNAP_MS}ms ease-out` : 'none',
        }}
      >
        <div style={{ flex: '0 0 100%', minWidth: 0 }}>{hasPrev ? renderPanel(prevIndex) : null}</div>
        <div style={{ flex: '0 0 100%', minWidth: 0 }}>{renderPanel(activeIndex)}</div>
        <div style={{ flex: '0 0 100%', minWidth: 0 }}>{hasNext ? renderPanel(nextIndex) : null}</div>
      </div>
    </div>
  )
}
