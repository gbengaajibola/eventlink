import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4">
          EventLink - Get Tickets &amp; Connect
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white lg:static lg:h-auto lg:w-auto lg:bg-none">
          <Link
            href="/events"
            className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            Browse Events
          </Link>
        </div>
      </div>

      <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:lg:h-[360px]">
        <h1 className="text-4xl font-bold mb-8">Welcome to EventLink</h1>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Buy Tickets. Meet Attendees. Have Fun.</h2>
        <p className="text-gray-600 mb-8 max-w-xl">
          EventLink combines ticketing with a social network. Once you buy a ticket,
          you get access to a private community for that event - connect with other
          attendees before the big day!
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Sign Up
          </Link>
          <Link href="/login" className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            Log In
          </Link>
        </div>
      </div>
    </main>
  )
}
