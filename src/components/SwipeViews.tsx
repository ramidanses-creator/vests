import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  activeIndex: number
  count: number
  onChange: (index: number) => void
  renderPanel: (index: number) => ReactNode
}

const SNAP_MS = 220

export function SwipeViews({ activeIndex, count, onChange, renderPanel }: Props) {
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
        g.dx = dx
        setDragPx(dx)
      }
    }

    function onTouchEnd() {
      const g = gesture.current
      if (g.axis === 'x' && width > 0) {
        const threshold = width * 0.22
        if (g.dx <= -threshold) {
          snapTo(-width, () => onChange((activeIndex + 1) % count))
        } else if (g.dx >= threshold) {
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
  }, [activeIndex, count, onChange, width])

  const prevIndex = (activeIndex - 1 + count) % count
  const nextIndex = (activeIndex + 1) % count

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
        <div style={{ flex: '0 0 100%', minWidth: 0 }}>{renderPanel(prevIndex)}</div>
        <div style={{ flex: '0 0 100%', minWidth: 0 }}>{renderPanel(activeIndex)}</div>
        <div style={{ flex: '0 0 100%', minWidth: 0 }}>{renderPanel(nextIndex)}</div>
      </div>
    </div>
  )
}
