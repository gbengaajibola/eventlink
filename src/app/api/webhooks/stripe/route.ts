import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { userId, eventId, items, promoCode } = session.metadata!

    try {
      // Update order status
      const order = await prisma.order.update({
        where: { stripeSessionId: session.id },
        data: {
          status: 'PAID',
          stripePaymentId: session.payment_intent as string,
        },
        include: {
          event: true,
          user: true,
        },
      })

      // Parse items
      const ticketItems = JSON.parse(items)

      // Create tickets for each item
      for (const item of ticketItems) {
        const tier = await prisma.ticketTier.findUnique({
          where: { id: item.ticketTierId },
        })

        if (!tier) continue

        // Create tickets
        const ticketData = []
        for (let i = 0; i < item.quantity; i++) {
          ticketData.push({
            orderId: order.id,
            eventId,
            ticketTierId: item.ticketTierId,
            userId,
            qrCodeToken: uuidv4(),
          })
        }

        await prisma.ticket.createMany({
          data: ticketData,
        })

        // Update quantity sold
        await prisma.ticketTier.update({
          where: { id: item.ticketTierId },
          data: {
            quantitySold: { increment: item.quantity },
          },
        })
      }

      // Create event attendee record
      await prisma.eventAttendee.upsert({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
        update: {},
        create: {
          eventId,
          userId,
        },
      })

      // Create notification
      await prisma.notification.create({
        data: {
          userId,
          type: 'TICKET_PURCHASED',
          title: 'Ticket Purchased!',
          body: `Your tickets for ${order.event.title} have been confirmed.`,
          payload: { orderId: order.id, eventId },
        },
      })

      console.log(`Order ${order.id} completed successfully`)
    } catch (error) {
      console.error('Error processing checkout completion:', error)
      return NextResponse.json({ error: 'Processing error' }, { status: 500 })
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      await prisma.order.update({
        where: { stripeSessionId: session.id },
        data: { status: 'CANCELLED' },
      })
    } catch (error) {
      console.error('Error handling expired session:', error)
    }
  }

  return NextResponse.json({ received: true })
}
