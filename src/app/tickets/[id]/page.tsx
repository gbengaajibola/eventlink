'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatLongDate } from '@/lib/date'
import { Header } from '@/components/Header'

interface Ticket {
  id: string
  qrCodeToken: string
  isCheckedIn: boolean
  checkedInAt: string | null
  ticketTier: {
    name: string
    description: string | null
    event: {
      id: string
      title: string
      description: string | null
      startDateTime: string
      endDateTime: string
      venueName: string
      venueAddress: string
      coverImageUrl: string | null
      category: string
      organizer: {
        id: string
        displayName: string
      }
    }
  }
  order: {
    id: string
    status: string
    totalAmount: number
    createdAt: string
  }
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session, status } = useSession()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [transferEmail, setTransferEmail] = useState('')
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTicket()
    }
  }, [status, id])

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`)
      const data = await res.json()
      setTicket(data)
      setQrCode(data.qrCodeDataURL || '')
    } catch (error) {
      console.error('Failed to fetch ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferEmail) return
    setTransferring(true)
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: transferEmail }),
      })
      if (res.ok) {
        alert('Ticket transferred successfully!')
        fetchTicket()
      } else {
        const data = await res.json()
        alert(data.error || 'Transfer failed')
      }
    } catch (error) {
      console.error('Transfer error:', error)
    } finally {
      setTransferring(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Ticket not found
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header logoHref="/tickets" />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/tickets" className="text-primary-600 hover:underline mb-4 inline-block">
          ← Back to tickets
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Event header */}
          <div className="bg-primary-600 text-white p-6">
            <span className="text-sm opacity-80">{ticket.ticketTier.event.category}</span>
            <h1 className="text-2xl font-bold mt-1">{ticket.ticketTier.event.title}</h1>
            <p className="mt-2">{formatLongDate(ticket.ticketTier.event.startDateTime)}</p>
          </div>

          <div className="p-6">
            <div className="flex gap-6">
              {/* QR Code */}
              <div className="text-center">
                <div className="bg-white p-2 border rounded-lg inline-block">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                      Loading...
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Show this at the venue</p>
              </div>

              {/* Ticket details */}
              <div className="flex-1 space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg">{ticket.ticketTier.name}</h3>
                  {ticket.ticketTier.description && (
                    <p className="text-gray-600 text-sm">{ticket.ticketTier.description}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500">Venue</p>
                  <p className="font-medium">{ticket.ticketTier.event.venueName}</p>
                  <p className="text-gray-600 text-sm">{ticket.ticketTier.event.venueAddress}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Organizer</p>
                  <p className="font-medium">{ticket.ticketTier.event.organizer.displayName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {ticket.isCheckedIn ? (
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      ✓ Checked in {ticket.checkedInAt && `at ${new Date(ticket.checkedInAt).toLocaleTimeString()}`}
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                      Ready to use
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Transfer section */}
            {!ticket.isCheckedIn && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-3">Transfer Ticket</h4>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Recipient email"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <button
                    onClick={handleTransfer}
                    disabled={!transferEmail || transferring}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    {transferring ? 'Transferring...' : 'Transfer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
