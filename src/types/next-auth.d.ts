import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    displayName?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      displayName?: string
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    displayName?: string
  }
}
