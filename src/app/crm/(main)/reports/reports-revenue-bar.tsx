'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { hexToRgba } from '@/lib/utils'

Chart.register(...registerables)

/** Read --accent from computed styles (org custom colour). Falls back to default blue. */
function getAccentColor(element: HTMLElement): string {
  const value = getComputedStyle(element).getPropertyValue('--accent').trim()
  if (value && (value.startsWith('#') || value.startsWith('rgb'))) return value
  return '#3b82f6'
}

interface ReportsRevenueBarProps {
  data: { label: string; value: number }[]
  valueLabel?: string
}

export function ReportsRevenueBar({ data, valueLabel = 'Revenue' }: ReportsRevenueBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !data.length) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const accent = getAccentColor(canvasRef.current)
    const hex = accent.startsWith('#') ? accent : '#3b82f6'
    const bgColor = hexToRgba(hex, 0.5)
    const borderColor = hexToRgba(hex, 0.8)

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => Math.max(0, d.value)),
            backgroundColor: bgColor,
            borderColor,
            borderWidth: 1,
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
            callbacks: {
              label: (item) =>
                `${valueLabel}: ${typeof item.raw === 'number' && valueLabel === 'Revenue' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.raw) : item.raw}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.035)' },
            ticks: { color: '#3d4d65', maxRotation: 45 },
          },
          y: {
            min: 0,
            grid: { color: 'rgba(255,255,255,0.035)' },
            ticks: {
              color: '#3d4d65',
              callback: (v) =>
                typeof v === 'number' ? (valueLabel === 'Revenue' ? '$' + (v >= 1000 ? v / 1000 + 'k' : v) : v) : v,
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
  }, [data, valueLabel])

  return (
    <div style={{ height: 260, width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
