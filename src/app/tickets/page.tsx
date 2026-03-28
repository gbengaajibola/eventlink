'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatMediumDate } from '@/lib/date'
import { Header } from '@/components/Header'

interface Ticket {
  id: string
  qrCodeToken: string
  isCheckedIn: boolean
  checkedInAt: string | null
  ticketTier: {
    name: string
    event: {
      id: string
      title: string
      startDateTime: string
      endDateTime: string
      venueName: string
      venueAddress: string
      coverImageUrl: string | null
      category: string
    }
  }
  order: {
    id: string
    status: string
    createdAt: string
  }
}

export default function TicketsPage() {
  const { data: session, status } = useSession()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTickets()
    }
  }, [status, filter])

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/tickets?status=${filter}`)
      const data = await res.json()
      setTickets(data)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Link href="/login" className="text-primary-600 hover:underline">
            Log in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Tickets</h1>

        <div className="flex gap-2 mb-6">
          {(['all', 'upcoming', 'past'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="mb-4">You don't have any tickets yet.</p>
            <Link href="/events" className="text-primary-600 hover:underline">
              Browse events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="bg-white rounded-lg shadow p-6 flex gap-6 hover:shadow-md transition"
              >
                <div className="w-32 h-32 bg-gray-200 rounded flex-shrink-0">
                  {ticket.ticketTier.event.coverImageUrl ? (
                    <img
                      src={ticket.ticketTier.event.coverImageUrl}
                      alt={ticket.ticketTier.event.title}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Event
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm text-gray-500">
                        {ticket.ticketTier.event.category}
                      </span>
                      <h2 className="text-xl font-semibold mt-1">
                        {ticket.ticketTier.event.title}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        {formatMediumDate(ticket.ticketTier.event.startDateTime)}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {ticket.ticketTier.event.venueName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-gray-100 rounded text-sm mb-2">
                        {ticket.ticketTier.name}
                      </span>
                      {ticket.isCheckedIn ? (
                        <p className="text-green-600 text-sm font-medium">
                          ✓ Checked in
                        </p>
                      ) : (
                        <p className="text-primary-600 text-sm font-medium">
                          Ready to use
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
