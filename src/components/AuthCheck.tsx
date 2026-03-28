'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface AuthCheckProps {
  children: React.ReactNode
}

export function AuthCheck({ children }: AuthCheckProps) {
  const { status } = useSession()

  if (status === 'loading') {
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

  return <>{children}</>
}