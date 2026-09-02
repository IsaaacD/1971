import { useState, useEffect, useRef } from 'react'

export function useData(filePath, defer = false) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { visible, ref } = useIntersection(defer)
  const fetched = useRef(false)

  useEffect(() => {
    if (defer && !visible) return
    if (fetched.current) return

    fetched.current = true
    setLoading(true)

    fetch(filePath)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${filePath}`)
        return res.json()
      })
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [filePath, defer, visible])

  return { data, loading, error, ref }
}

function useIntersection(defer) {
  const [visible, setVisible] = useState(!defer)
  const ref = useRef(null)

  useEffect(() => {
    if (!defer) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [defer])

  return { visible, ref }
}
