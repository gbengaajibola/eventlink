import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { handleApiError, generateQRCode } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'upcoming' | 'past'

    const tickets = await prisma.ticket.findMany({
      where: { userId: session.user.id },
      include: {
        ticketTier: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startDateTime: true,
                endDateTime: true,
                venueName: true,
                venueAddress: true,
                coverImageUrl: true,
                category: true,
              },
            },
          },
        },
        order: {
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Filter by status
    const now = new Date()
    let filteredTickets = tickets
    if (status === 'upcoming') {
      filteredTickets = tickets.filter(
        t => new Date(t.ticketTier.event.startDateTime) >= now && t.order.status === 'PAID'
      )
    } else if (status === 'past') {
      filteredTickets = tickets.filter(
        t => new Date(t.ticketTier.event.startDateTime) < now || t.order.status !== 'PAID'
      )
    }

    return NextResponse.json(filteredTickets)
  } catch (error) {
    return handleApiError(error, 'fetch tickets')
  }
}

export async function GET_ID(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        ticketTier: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                description: true,
                startDateTime: true,
                endDateTime: true,
                venueName: true,
                venueAddress: true,
                coverImageUrl: true,
                category: true,
                organizer: {
                  select: { id: true, displayName: true },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        user: {
          select: { id: true, displayName: true, email: true },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const qrCodeDataURL = await generateQRCode(ticket.qrCodeToken)

    return NextResponse.json({
      ...ticket,
      qrCodeDataURL,
    })
  } catch (error) {
    return handleApiError(error, 'fetch ticket')
  }
}

export async function PUT_TRANSFER(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipientEmail } = await request.json()

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        ticketTier: {
          include: { event: true },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if ticket is already checked in
    if (ticket.isCheckedIn) {
      return NextResponse.json({ error: 'Cannot transfer checked-in ticket' }, { status: 400 })
    }

    // Find recipient
    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail },
    })

    if (!recipient) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Transfer ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        transferredToId: recipient.id,
        qrCodeToken: crypto.randomUUID(), // Invalidate old QR
      },
    })

    // Create notification for recipient
    await prisma.notification.create({
      data: {
        userId: recipient.id,
        type: 'TICKET_PURCHASED',
        title: 'Ticket Transferred',
        body: `${session.user.name || 'Someone'} transferred a ticket to ${ticket.ticketTier.event.title}.`,
        payload: { ticketId: ticket.id },
      },
    })

    return NextResponse.json(updatedTicket)
  } catch (error) {
    return handleApiError(error, 'transfer ticket')
  }
}

export async function POST_CHECKIN(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { qrCodeToken } = await request.json()

    const ticket = await prisma.ticket.findFirst({
      where: { qrCodeToken },
      include: {
        ticketTier: {
          include: { event: true },
        },
        user: {
          select: { id: true, displayName: true, email: true },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Invalid ticket' }, { status: 404 })
    }

    // Verify organizer owns the event
    if (ticket.ticketTier.event.organizerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (ticket.isCheckedIn) {
      return NextResponse.json(
        { error: 'Already checked in', checkedInAt: ticket.checkedInAt },
        { status: 400 }
      )
    }

    // Check in
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        isCheckedIn: true,
        checkedInAt: new Date(),
      },
      include: {
        ticketTier: {
          include: { event: true },
        },
        user: {
          select: { id: true, displayName: true, email: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    })
  } catch (error) {
    return handleApiError(error, 'check in')
  }
}
