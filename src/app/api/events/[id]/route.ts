import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { handleZodError, handleApiError } from '@/lib/api-utils'
import QRCode from 'qrcode'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        organizer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        ticketTiers: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            quantityTotal: true,
            quantitySold: true,
            saleStartDate: true,
            saleEndDate: true,
            tierType: true,
          },
        },
        _count: {
          select: { tickets: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    return handleApiError(error, 'fetch event')
  }
}

const updateEventSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  category: z.enum(['MUSIC', 'SPORTS', 'TECH', 'ARTS', 'FOOD', 'NETWORKING', 'OTHER']).optional(),
  startDateTime: z.string().datetime().optional(),
  endDateTime: z.string().datetime().optional(),
  venueName: z.string().min(1).optional(),
  venueAddress: z.string().min(1).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).optional(),
  refundPolicy: z.enum(['NO_REFUNDS', 'FULL_REFUND_7_DAYS', 'FULL_REFUND_3_DAYS', 'FULL_REFUND_1_DAY']).optional(),
  postEventDays: z.number().min(1).max(30).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.organizerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateEventSchema.parse(body)

    const updateData: Prisma.EventUpdateInput = { ...data }
    if (data.startDateTime) updateData.startDateTime = new Date(data.startDateTime)
    if (data.endDateTime) updateData.endDateTime = new Date(data.endDateTime)

    const updatedEvent = await prisma.event.update({
      where: { id: params.id },
      data: updateData,
      include: {
        ticketTiers: true,
        organizer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    return handleApiError(error, 'update event')
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = await prisma.event.findUnique({
      where: { id: params.id },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.organizerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.event.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'delete event')
  }
}
