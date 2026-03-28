# EventLink

Event ticketing platform with social networking — buy tickets and connect with fellow attendees before the event.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Prisma** + **PostgreSQL**
- **NextAuth v4** (JWT, credentials + Google OAuth)
- **Stripe** (payments)
- **Tailwind CSS**

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in the required values in `.env`.

### 3. Configure the database

```bash
npm run db:push       # Push schema to Postgres
npm run db:generate   # Generate Prisma client
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Stripe webhooks (local development)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio |

## Features

- Event creation & discovery with category/date/price filters
- Ticket purchasing via Stripe Checkout
- QR code tickets with check-in scanning
- Ticket transfers between users
- User connections and direct messaging
- Event posts with likes and comments
- Real-time event chat
- Push notifications
