'use client'

import { useState, useEffect, use } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatLongDate } from '@/lib/date'
import { Header } from '@/components/Header'

interface TicketTier {
  id: string
  name: string
  description: string | null
  price: number
  quantityTotal: number
  quantitySold: number
  saleStartDate: string | null
  saleEndDate: string | null
  tierType: string
}

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
  ticketTiers: TicketTier[]
  _count: {
    tickets: number
  }
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTiers, setSelectedTiers] = useState<Record<string, number>>({})
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((res) => res.json())
      .then((data) => setEvent(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleQuantityChange = (tierId: string, quantity: number) => {
    setSelectedTiers((prev) => ({
      ...prev,
      [tierId]: Math.max(0, quantity),
    }))
  }

  const getTotalQuantity = () => {
    return Object.values(selectedTiers).reduce((a, b) => a + b, 0)
  }

  const getTotalPrice = () => {
    if (!event) return 0
    return event.ticketTiers.reduce((total, tier) => {
      return total + tier.price * (selectedTiers[tier.id] || 0)
    }, 0)
  }

  const handlePurchase = async () => {
    if (!session) {
      signIn()
      return
    }

    const items = Object.entries(selectedTiers)
      .filter(([, qty]) => qty > 0)
      .map(([tierId, quantity]) => ({ ticketTierId: tierId, quantity }))

    if (items.length === 0) return

    setPurchasing(true)
    setError('')

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, items }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create order')
        return
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Event not found
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header logoHref="/events" />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {event.coverImageUrl && (
              <img
                src={event.coverImageUrl}
                alt={event.title}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}

            <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
              {event.category}
            </span>

            <h1 className="text-4xl font-bold mb-4">{event.title}</h1>

            <div className="space-y-4 text-gray-600 mb-8">
              <p className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatLongDate(event.startDateTime)}
              </p>
              <p className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.venueName} - {event.venueAddress}
              </p>
              <p className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Organized by {event.organizer.displayName}
              </p>
            </div>

            {event.description && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3">About</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Get Tickets</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                {event.ticketTiers.map((tier) => {
                  const available = tier.quantityTotal - tier.quantitySold
                  return (
                    <div key={tier.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{tier.name}</h3>
                          {tier.description && (
                            <p className="text-sm text-gray-500">{tier.description}</p>
                          )}
                        </div>
                        <span className="text-lg font-bold">
                          {tier.price === 0 ? 'Free' : `$${tier.price}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {available} available
                        </span>
                        {available > 0 && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuantityChange(tier.id, (selectedTiers[tier.id] || 0) - 1)}
                              className="w-8 h-8 border rounded flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">
                              {selectedTiers[tier.id] || 0}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(tier.id, (selectedTiers[tier.id] || 0) + 1)}
                              className="w-8 h-8 border rounded flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {getTotalQuantity() > 0 && (
                <div className="border-t pt-4 mb-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total</span>
                    <span>${getTotalPrice()}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handlePurchase}
                disabled={getTotalQuantity() === 0 || purchasing}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchasing
                  ? 'Processing...'
                  : !session
                  ? 'Log in to Purchase'
                  : getTotalQuantity() === 0
                  ? 'Select Tickets'
                  : 'Get Tickets'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Secure checkout powered by Stripe
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
