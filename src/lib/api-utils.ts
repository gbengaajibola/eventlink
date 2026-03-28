import { z } from 'zod'
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export function handleZodError(error: z.ZodError) {
  return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
}

export function handleApiError(error: unknown, operation: string) {
  console.error(`${operation} error:`, error)
  return NextResponse.json({ error: `Failed to ${operation}` }, { status: 500 })
}

export async function generateQRCode(token: string, width = 300, margin = 2): Promise<string> {
  return QRCode.toDataURL(token, {
    width,
    margin,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}