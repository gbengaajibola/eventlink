'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatShortDate } from '@/lib/date'
import { Header } from '@/components/Header'

interface Ticket {
  id: string
  qrCodeToken: string
  isCheckedIn: boolean
  ticketTier: {
    name: string
    event: {
      id: string
      title: string
      startDateTime: string
      venueName: string
      coverImageUrl: string | null
    }
  }
}

interface Event {
  id: string
  title: string
  startDateTime: string
  venueName: string
  coverImageUrl: string | null
  _count: {
    tickets: number
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [upcomingTickets, setUpcomingTickets] = useState<Ticket[]>([])
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    }
  }, [status])

  const fetchData = async () => {
    try {
      const [ticketsRes, eventsRes] = await Promise.all([
        fetch('/api/tickets?status=upcoming'),
        fetch('/api/events?limit=4'),
      ])
      const ticketsData = await ticketsRes.json()
      const eventsData = await eventsRes.json()
      setUpcomingTickets(ticketsData)
      setFeaturedEvents(eventsData.events || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
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
      <Header userEmail={session?.user?.email} showSignOut />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-gray-600 mb-8">
          Here's what's happening with your events.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <section className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Your Upcoming Events</h2>
                <Link href="/tickets" className="text-primary-600 hover:underline text-sm">
                  View all tickets
                </Link>
              </div>

              {upcomingTickets.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  <p className="mb-4">You don't have any upcoming events.</p>
                  <Link href="/events" className="text-primary-600 hover:underline">
                    Browse events
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingTickets.slice(0, 3).map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/tickets/${ticket.id}`}
                      className="bg-white rounded-lg shadow p-4 flex gap-4 hover:shadow-md transition"
                    >
                      <div className="w-24 h-24 bg-gray-200 rounded flex-shrink-0">
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
                        <h3 className="font-semibold text-lg">
                          {ticket.ticketTier.event.title}
                        </h3>
                        <p className="text-gray-500 text-sm">
                          {formatShortDate(ticket.ticketTier.event.startDateTime)} ·{' '}
                          {ticket.ticketTier.event.venueName}
                        </p>
                        <p className="text-primary-600 text-sm mt-1">
                          {ticket.ticketTier.name}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {ticket.isCheckedIn ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            Checked in
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                            Ready
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div>
            <section>
              <h2 className="text-xl font-semibold mb-4">Discover Events</h2>
              <div className="space-y-4">
                {featuredEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="bg-white rounded-lg shadow p-4 block hover:shadow-md transition"
                  >
                    <h3 className="font-semibold mb-1">{event.title}</h3>
                    <p className="text-gray-500 text-sm">
                      {formatShortDate(event.startDateTime)} · {event.venueName}
                    </p>
                  </Link>
                ))}
              </div>
              <Link
                href="/events"
                className="block text-center mt-4 text-primary-600 hover:underline"
              >
                Browse all events
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
