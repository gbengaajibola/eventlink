import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }
  return session
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFoundResponse(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export async function requireOrganizer(entity: { organizerId: string }, session: Awaited<ReturnType<typeof requireSession>>) {
  if (!session) return null
  if (entity.organizerId !== session.user.id) {
    return false
  }
  return true
}