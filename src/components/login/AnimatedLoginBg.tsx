'use client'

import { useEffect, useRef } from 'react'

interface Spark {
  x: number
  y: number
  speed: number
  size: number
  opacity: number
  drift: number
  trail: number
}

interface GridLine {
  y: number
  speed: number
  opacity: number
  width: number
}

export function AnimatedLoginBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const sparks: Spark[] = []
    const gridLines: GridLine[] = []

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    function spawnSpark() {
      if (!canvas) return
      sparks.push({
        x: Math.random() * canvas.width,
        y: -10,
        speed: 4 + Math.random() * 8,
        size: 1 + Math.random() * 2,
        opacity: 0.6 + Math.random() * 0.4,
        drift: (Math.random() - 0.5) * 0.4,
        trail: 8 + Math.random() * 16,
      })
    }

    function spawnGridLine() {
      if (!canvas) return
      gridLines.push({
        y: -2,
        speed: 0.6 + Math.random() * 1.2,
        opacity: 0.06 + Math.random() * 0.1,
        width: canvas.width,
      })
    }

    let sparkTimer = 0
    let gridTimer = 0

    function draw() {
      if (!canvas || !ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      sparkTimer++
      if (sparkTimer >= 2) {
        spawnSpark()
        if (Math.random() < 0.3) spawnSpark()
        sparkTimer = 0
      }

      gridTimer++
      if (gridTimer >= 90) {
        spawnGridLine()
        gridTimer = 0
      }

      // Draw grid lines
      for (let i = gridLines.length - 1; i >= 0; i--) {
        const gl = gridLines[i]
        gl.y += gl.speed
        ctx.beginPath()
        ctx.moveTo(0, gl.y)
        ctx.lineTo(gl.width, gl.y)
        ctx.strokeStyle = `rgba(0, 184, 245, ${gl.opacity})`
        ctx.lineWidth = 1
        ctx.stroke()
        if (gl.y > canvas.height + 10) gridLines.splice(i, 1)
      }

      // Draw sparks with trails
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.drift
        s.y += s.speed

        // Trail
        const grad = ctx.createLinearGradient(s.x, s.y - s.trail, s.x, s.y)
        grad.addColorStop(0, `rgba(0, 184, 245, 0)`)
        grad.addColorStop(0.6, `rgba(0, 184, 245, ${s.opacity * 0.3})`)
        grad.addColorStop(1, `rgba(0, 184, 245, ${s.opacity})`)
        ctx.beginPath()
        ctx.moveTo(s.x, s.y - s.trail)
        ctx.lineTo(s.x, s.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = s.size * 0.8
        ctx.stroke()

        // Spark head glow
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3)
        glow.addColorStop(0, `rgba(180, 230, 255, ${s.opacity})`)
        glow.addColorStop(0.4, `rgba(0, 184, 245, ${s.opacity * 0.6})`)
        glow.addColorStop(1, `rgba(0, 184, 245, 0)`)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        if (s.y > canvas.height + 20) sparks.splice(i, 1)
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
