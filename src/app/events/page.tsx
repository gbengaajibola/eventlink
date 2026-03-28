'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatMediumDate } from '@/lib/date'
import { Header } from '@/components/Header'

interface Event {
  id: string
  title: string
  description: string | null
  category: string
  startDateTime: string
  endDateTime: string
  venueName: string
  venueAddress: string
  coverImageUrl: string | null
  status: string
  organizer: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
  ticketTiers: {
    id: string
    name: string
    price: number
    quantityTotal: number
    quantitySold: number
    tierType: string
  }[]
}

interface EventsResponse {
  events: Event[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'MUSIC', label: 'Music' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'TECH', label: 'Tech' },
  { value: 'ARTS', label: 'Arts' },
  { value: 'FOOD', label: 'Food' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'OTHER', label: 'Other' },
]

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<EventsResponse['pagination'] | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [category, page])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      params.set('page', page.toString())
      params.set('limit', '12')

      const res = await fetch(`/api/events?${params}`)
      const data: EventsResponse = await res.json()
      setEvents(data.events)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchEvents()
  }

  const getLowestPrice = (tiers: Event['ticketTiers']) => {
    if (!tiers.length) return null
    const prices = tiers.map(t => t.price).filter(p => p > 0)
    if (!prices.length) return 'Free'
    return `$${Math.min(...prices)}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Browse Events</h1>

        <form onSubmit={handleSearch} className="mb-8 flex gap-4">
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
          />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Search
          </button>
        </form>

        {loading ? (
          <div className="text-center py-12">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No events found. Try a different search.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                >
                  <div className="h-48 bg-gray-200 relative">
                    {event.coverImageUrl ? (
                      <img
                        src={event.coverImageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-1 bg-white rounded text-xs font-medium">
                      {event.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h2 className="text-xl font-semibold mb-1">{event.title}</h2>
                    <p className="text-gray-500 text-sm mb-2">
                      {formatMediumDate(event.startDateTime)}
                    </p>
                    <p className="text-gray-600 text-sm mb-2">{event.venueName}</p>
                    <p className="text-primary-600 font-semibold">
                      {getLowestPrice(event.ticketTiers)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 border rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
