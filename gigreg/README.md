# Gigreg

Build-only frontend for SkillSlide listings/gigs. No lessons or curriculum.

## Run

```bash
# from repo root — start API
npm run dev

# from gigreg
npm install
npm run dev
```

App runs at `http://localhost:5174` and uses the same backend `/api` as SkillSlide.

## What’s included

- Browse build listings (`/`)
- Listing detail (`/listing/:slug`)
- Create / update listing
- Auth, chat, profile (listing tabs), payments, withdraw

## What’s removed from routing

- Discover / Learn home
- Lessons and curriculum booking/CRUD
- Teach / student requests
