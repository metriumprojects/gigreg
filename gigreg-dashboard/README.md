# Gigreg Admin Dashboard

Admin panel for Gigreg — **listings** and **categories** only.

## Setup

```bash
cd gigreg-dashboard
npm install
npm run dev
```

Runs on **http://localhost:5180** and talks to **gigreg-backend** at `http://localhost:5001/api`.

## Features

- Admin login (`/api/dashboard/admin-login`)
- Dashboard stats + commission settings
- Listings: search, status filter, edit, delete, view on Gigreg frontend
- Categories: full create / update / delete with image

## Run with API + frontend

```bash
# terminal 1
cd gigreg-backend && npm run dev

# terminal 2
cd gigreg && npm run dev

# terminal 3
cd gigreg-dashboard && npm run dev
```
