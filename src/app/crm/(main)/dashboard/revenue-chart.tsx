'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { hexToRgba } from '@/lib/utils'

Chart.register(...registerables)

interface RevenueChartProps {
  chartData: { date: string; revenue: number }[]
  /** When true, shorter height and cleaner axis labels for mobile */
  mobile?: boolean
}

/** Format YYYY-MM-DD as "Jan 29", "Feb 5" etc. */
function formatChartLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Read --accent from computed styles (org custom colour). Falls back to default blue. */
function getAccentColor(element: HTMLElement): string {
  const value = getComputedStyle(element).getPropertyValue('--accent').trim()
  if (value && (value.startsWith('#') || value.startsWith('rgb'))) return value
  return '#3b82f6'
}

export function RevenueChart({ chartData, mobile = false }: RevenueChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !chartData.length) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const accent = getAccentColor(canvasRef.current)
    const fillOpacity = mobile ? 0.32 : 0.22
    const accentRgbaFill = hexToRgba(accent.startsWith('#') ? accent : '#3b82f6', fillOpacity)
    const accentRgba0 = hexToRgba(accent.startsWith('#') ? accent : '#3b82f6', 0)

    const labels = chartData.map((d) => formatChartLabel(d.date))
    const values = chartData.map((d) => Math.max(0, Number(d.revenue)))

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: accent.startsWith('#') ? accent : '#3b82f6',
            borderWidth: 1.5,
            backgroundColor: (function () {
              const g = ctx.createLinearGradient(0, 0, 0, 300)
              g.addColorStop(0, accentRgbaFill)
              g.addColorStop(1, accentRgba0)
              return g
            })(),
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#131a28',
            titleColor: '#eef2ff',
            bodyColor: '#eef2ff',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            bodyFont: { family: "'Geist Mono', monospace" },
            callbacks: {
              label: (item) =>
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(Number(item.raw)),
            },
          },
        },
        scales: {
          x: {
            grid: { display: !mobile, color: 'rgba(255,255,255,0.035)' },
            ticks: {
              color: '#3d4d65',
              maxTicksLimit: mobile ? 6 : 8,
              font: { size: mobile ? 10 : 11 },
            },
          },
          y: {
            min: 0,
            grid: { color: 'rgba(255,255,255,0.035)' },
            ticks: {
              color: '#3d4d65',
              callback: (v) =>
                typeof v === 'number' ? '$' + (v >= 1000 ? v / 1000 + 'k' : v) : v,
            },
          },
        },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [chartData, mobile])

  return (
    <div style={{ height: mobile ? 200 : 240, width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
