import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { handleZodError, handleApiError } from '@/lib/api-utils'

const eventFilterSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filters = eventFilterSchema.parse({
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      minPrice: searchParams.get('minPrice'),
      maxPrice: searchParams.get('maxPrice'),
      status: searchParams.get('status') || 'PUBLISHED',
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    })

    const where: Prisma.EventWhereInput = {}

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.category) {
      where.category = filters.category
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { venueName: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters.startDate || filters.endDate) {
      where.startDateTime = {}
      if (filters.startDate) {
        where.startDateTime.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.startDateTime.lte = new Date(filters.endDate)
      }
    }

    if (filters.minPrice || filters.maxPrice) {
      where.ticketTiers = {
        some: {
          price: {
            gte: filters.minPrice || 0,
            lte: filters.maxPrice || 999999,
          },
        },
      }
    }

    const skip = (filters.page - 1) * filters.limit

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          ticketTiers: {
            select: {
              id: true,
              name: true,
              price: true,
              quantityTotal: true,
              quantitySold: true,
              tierType: true,
            },
          },
          _count: {
            select: { tickets: true },
          },
        },
        orderBy: { startDateTime: 'asc' },
        skip,
        take: filters.limit,
      }),
      prisma.event.count({ where }),
    ])

    return NextResponse.json({
      events,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    return handleApiError(error, 'fetch events')
  }
}

const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: z.enum(['MUSIC', 'SPORTS', 'TECH', 'ARTS', 'FOOD', 'NETWORKING', 'OTHER']).default('OTHER'),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  venueName: z.string().min(1, 'Venue name is required'),
  venueAddress: z.string().min(1, 'Venue address is required'),
  coverImageUrl: z.string().url().optional(),
  refundPolicy: z.enum(['NO_REFUNDS', 'FULL_REFUND_7_DAYS', 'FULL_REFUND_3_DAYS', 'FULL_REFUND_1_DAY']).default('FULL_REFUND_7_DAYS'),
  postEventDays: z.number().min(1).max(30).default(7),
  ticketTiers: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().min(0),
    quantityTotal: z.number().min(1),
    saleStartDate: z.string().datetime().optional(),
    saleEndDate: z.string().datetime().optional(),
    tierType: z.enum(['GENERAL', 'VIP', 'EARLY_BIRD']).default('GENERAL'),
  })).min(1, 'At least one ticket tier is required'),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createEventSchema.parse(body)

    const event = await prisma.event.create({
      data: {
        ...data,
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
        organizerId: session.user.id,
        ticketTiers: {
          create: data.ticketTiers.map((tier) => ({
            ...tier,
            price: tier.price,
            saleStartDate: tier.saleStartDate ? new Date(tier.saleStartDate) : null,
            saleEndDate: tier.saleEndDate ? new Date(tier.saleEndDate) : null,
          })),
        },
      },
      include: {
        ticketTiers: true,
        organizer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    return handleApiError(error, 'create event')
  }
}
