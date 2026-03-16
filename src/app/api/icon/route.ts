import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

/** Serve the DetailOps SVG favicon; no-cache so browser doesn't show old icon. */
export async function GET() {
  const svgPath = path.join(process.cwd(), 'public', 'detailops favicon new.svg')
  const body = await fs.readFile(svgPath)
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}
