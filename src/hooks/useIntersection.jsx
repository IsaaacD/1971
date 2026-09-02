import { useState, useEffect, useRef } from 'react'

export function useIntersection(rootMargin = '200px') {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [rootMargin])

  return { isVisible, ref }
}
