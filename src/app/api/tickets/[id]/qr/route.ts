import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { handleApiError, generateQRCode } from '@/lib/api-utils'

export async function GET(
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
                startDateTime: true,
                venueName: true,
              },
            },
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const qrCodeDataURL = await generateQRCode(ticket.qrCodeToken)

    return NextResponse.json({
      qrCode: qrCodeDataURL,
      token: ticket.qrCodeToken,
    })
  } catch (error) {
    return handleApiError(error, 'generate QR code')
  }
}
