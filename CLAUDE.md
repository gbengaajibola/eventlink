# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EventLink is a Next.js 14 event ticketing platform with social networking features (connections, direct messaging, event posts, notifications). It uses:
- **Next.js 14** with App Router and TypeScript
- **Prisma** with PostgreSQL
- **NextAuth v4** (JWT sessions) with credentials and Google OAuth
- **Stripe** for payment processing

## Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database (dev)
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:studio    # Open Prisma Studio (GUI for database)
```

**Stripe webhook during local dev:**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Architecture

### App Router Structure
- `src/app/(auth)/` — Login and register pages (route group, no layout changes)
- `src/app/api/` — REST API routes (server-side only)
- `src/app/dashboard/`, `events/`, `tickets/`, `orders/` — Protected pages

### API Routes
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `src/app/api/auth/register/route.ts` — Email/password registration
- `src/app/api/events/` — List/create events (GET with filters, POST for organizers)
- `src/app/api/events/[id]/` — Event CRUD (PUT/DELETE by organizer)
- `src/app/api/orders/` — Create Stripe checkout session (POST), list user orders (GET)
- `src/app/api/tickets/` — List tickets, transfer tickets, check-in by QR token
- `src/app/api/tickets/[id]/qr/route.ts` — QR code generation endpoint
- `src/app/api/webhooks/stripe/route.ts` — Stripe webhook: creates tickets + notifications on `checkout.session.completed`

### Key Library Files
- `src/lib/auth.ts` — NextAuth config (JWT strategy, Google + credentials providers)
- `src/lib/server-auth.ts` — `requireSession()`, `requireOrganizer()`, and response helpers (`unauthorizedResponse`, `forbiddenResponse`, `notFoundResponse`)
- `src/lib/api-utils.ts` — `handleZodError()`, `handleApiError()`, `generateQRCode()`
- `src/lib/prisma.ts` — Prisma client singleton (global for dev hot-reload safety)
- `src/lib/stripe.ts` — Stripe client instance

### Database (Prisma)
Schema file: `prisma/schema.prisma`

Key models: `User`, `Event`, `TicketTier`, `Order`, `Ticket`, `Connection`, `EventPost`, `DirectMessage`, `Notification`, `EventAttendee`

**Auth models** (`User`, `Account`, `Session`, `VerificationToken`) are managed by `@auth/prisma-adapter` for OAuth. Email/password users are stored in `User.passwordHash` (bcrypt, set via `/api/auth/register`).

**Ticket flow:**
1. User POSTs to `/api/orders` → creates Stripe Checkout Session + `Order(status=PENDING)`
2. Stripe redirects to `/orders/success`
3. Stripe webhook fires `checkout.session.completed` → updates order to `PAID`, creates `Ticket` records with QR tokens, creates `EventAttendee`, sends notification
4. User fetches tickets from `/api/tickets`

**Check-in:** Organizer calls `POST /api/tickets/[id]/checkin` with `qrCodeToken` from ticket QR code.

### Environment Variables
```
DATABASE_URL               # PostgreSQL connection string
NEXTAUTH_SECRET            # Random secret for JWT signing
NEXTAUTH_URL               # http://localhost:3000
GOOGLE_CLIENT_ID / _SECRET # Optional OAuth
STRIPE_SECRET_KEY          # Stripe API key
STRIPE_WEBHOOK_SECRET      # From `stripe listen`, needed for local dev
NEXT_PUBLIC_APP_URL        # For Stripe success/cancel redirect URLs
```
