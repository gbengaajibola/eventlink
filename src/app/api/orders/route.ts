import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { handleZodError, handleApiError } from '@/lib/api-utils'
import { stripe } from '@/lib/stripe'

const createOrderSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  items: z.array(z.object({
    ticketTierId: z.string(),
    quantity: z.number().min(1).max(10),
  })).min(1, 'At least one item is required'),
  promoCode: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, items, promoCode } = createOrderSchema.parse(body)

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTiers: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Event is not available' }, { status: 400 })
    }

    let totalAmount = 0
    const orderItems: { tierId: string; quantity: number; price: number }[] = []

    for (const item of items) {
      const tier = event.ticketTiers.find(t => t.id === item.ticketTierId)
      if (!tier) {
        return NextResponse.json(
          { error: `Ticket tier not found: ${item.ticketTierId}` },
          { status: 400 }
        )
      }

      const available = tier.quantityTotal - tier.quantitySold
      if (item.quantity > available) {
        return NextResponse.json(
          { error: `Not enough tickets available for ${tier.name}` },
          { status: 400 }
        )
      }

      totalAmount += Number(tier.price) * item.quantity
      orderItems.push({
        tierId: item.ticketTierId,
        quantity: item.quantity,
        price: Number(tier.price),
      })
    }

    let discountAmount = 0
    if (promoCode) {
      // TODO: Implement promo codes in database
      discountAmount = 0
    }

    const finalAmount = totalAmount - discountAmount

    const lineItems = orderItems.map(item => {
      const tier = event.ticketTiers.find(t => t.id === item.tierId)!
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.title} - ${tier.name}`,
            description: tier.description || undefined,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }
    })

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${eventId}`,
      customer_email: session.user.email || undefined,
      metadata: {
        userId: session.user.id,
        eventId,
        items: JSON.stringify(items),
        promoCode: promoCode || '',
      },
    })

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        eventId,
        totalAmount: finalAmount,
        status: 'PENDING',
        stripeSessionId: stripeSession.id,
        promoCode,
        discountAmount,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      sessionId: stripeSession.id,
      url: stripeSession.url,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    return handleApiError(error, 'create order')
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDateTime: true,
            venueName: true,
            coverImageUrl: true,
          },
        },
        tickets: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    return handleApiError(error, 'fetch orders')
  }
}
