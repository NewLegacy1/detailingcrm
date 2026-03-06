import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'

const FAVICON_SIZE = 64

/**
 * Serves the DetailOps logo (public/detailopslogo.png) as a favicon.
 * Format matches detailops favicon new.svg: full logo contained in 64x64,
 * centered, transparent background — no crop to a part of the logo.
 */
export async function GET(request: NextRequest) {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'detailopslogo.png')
    const buffer = await fs.readFile(logoPath)
    const resized = await sharp(buffer)
      .resize(FAVICON_SIZE, FAVICON_SIZE, {
        fit: 'contain',
        position: 'center',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()
    return new NextResponse(resized, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.redirect(new URL('/detailopslogo.png', request.url))
  }
}
