# Gigreg Backend

API for the Gigreg frontend (`../gigreg`): listings/builds, requests, bookings, chat, favorites, Stripe Connect, and payouts.

**Note:** Standalone lesson and curriculum routes/controllers have been removed. The product is listings-first. Listing calendar helpers may still use `LessonCalender` naming — that is intentional (listings reuse those helpers).

## Setup

```bash
cd gigreg-backend
cp .env.example .env
# fill MONGO_URI, JWT_SECRET, Stripe, Cloudinary, etc.
npm install
npm run dev
```

Default port: **5001** (`PORT` in `.env`).

Gigreg Vite proxies `/api` → `http://localhost:5001`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Nodemon (development) |
| `npm start` | Production |
| `npm test` | Node test runner |

## Main routes

- `/api/users` — auth & profile
- `/api/listings` — builds / gigs
- `/api/propose` — open requests
- `/api/book` — listing bookings & orders
- `/api/chat` — messaging (incl. listing shares / quotes)
- `/api/favorites`, `/api/category`, `/api/availability`
- `/api/discover` — listings-only feed
- `/api/rating` — teacher ratings only (`POST /teacher`)
- `/api/withdrawal`, `/api/stripe-connect`, `/api/currency`
