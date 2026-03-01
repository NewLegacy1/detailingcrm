'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const SLIDES = [
  {
    image: '/auth-hero-1.jpg',
    quote: 'Our bookings went up 120% and our margins went from 30% to 50% because of how easy it is to manage the team.',
    author: 'Will, Fratelli Car Detailing',
  },
  {
    image: '/auth-hero-2.jpg',
    quote: 'I used to spend 2 hours a day chasing clients. Now DetailOps handles it all and I just show up and detail.',
    author: 'Marcus, Prestige Mobile Detailing',
  },
  {
    image: '/auth-hero-3.jpg',
    quote: 'Went from 8 jobs a week to 22 in my first month. The booking page alone is worth every penny.',
    author: 'Imran, ShowRoom AutoCare',
  },
  {
    image: '/auth-hero-4.jpg',
    quote: 'My customers love the booking page. I look way more professional and it basically runs itself.',
    author: 'Jordan, Elite Detail Co.',
  },
]

export function AuthHeroPanel() {
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % SLIDES.length)
        setFading(false)
      }, 600)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const slide = SLIDES[current]

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Background images — crossfade by rendering all, only active is visible */}
      {SLIDES.map((s, i) => (
        <div
          key={s.image}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current && !fading ? 1 : 0 }}
        >
          <Image
            src={s.image}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 0px, 495px"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 50%, rgba(0,0,0,0.78) 100%)',
        }}
      />

      {/* Top — tagline (static) */}
      <div className="absolute top-0 left-0 right-0 z-20 p-9 pb-7">
        <h2 className="text-[2rem] font-bold text-[#e8edf5] leading-tight tracking-tight mb-2.5">
          Run Your Detail Business
          <br />
          with <span className="font-light text-[#00b8f5] italic">Precision</span>
        </h2>
        <p className="text-[0.82rem] text-[#94a3b8] leading-relaxed max-w-[300px]">
          Schedule jobs, manage crews, track payments, and grow your mobile detailing operation — all in one place.
        </p>
      </div>

      {/* Bottom — testimonial (fades with slide) */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 p-9 pt-7 border-t border-[rgba(0,184,245,0.2)] transition-opacity duration-500"
        style={{ opacity: fading ? 0 : 1 }}
      >
        <blockquote className="border-l-2 border-[#00b8f5] pl-4 py-1">
          <p className="text-[0.88rem] text-[#cbd5e1] italic leading-relaxed">
            &ldquo;{slide.quote}&rdquo;
          </p>
          <cite className="text-[0.75rem] text-[#00b8f5] not-italic mt-2 block">
            — {slide.author}
          </cite>
        </blockquote>

        {/* Dot indicators */}
        <div className="flex gap-1.5 mt-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFading(true); setTimeout(() => { setCurrent(i); setFading(false) }, 600) }}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === current ? '20px' : '6px',
                background: i === current ? '#00b8f5' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
