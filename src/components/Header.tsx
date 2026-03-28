import Link from 'next/link'

interface HeaderProps {
  logoHref?: string
  userEmail?: string
  showSignOut?: boolean
}

export function Header({ logoHref = '/', userEmail, showSignOut }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href={logoHref} className="text-2xl font-bold text-primary-600">
          EventLink
        </Link>
        <nav className="flex gap-4 items-center">
          {userEmail && <span className="text-gray-600">{userEmail}</span>}
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link href="/tickets" className="text-gray-600 hover:text-gray-900">
            My Tickets
          </Link>
          {showSignOut && (
            <Link href="/api/auth/signout" className="text-gray-600 hover:text-gray-900">
              Sign out
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}