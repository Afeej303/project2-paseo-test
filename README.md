# Industrial Repair Technician Platform

Industrial Repair Technician Platform - Connecting factories with verified technicians.

## Setup
1. Root: `npm install`
2. Frontend: `cd frontend && npm install`

## Environment
Copy `.env.example` to `.env` and configure:
- `PORT` (default 3000)
- `MONGODB_URI`
- `JWT_SECRET`
- `CORS_ORIGIN` (default `http://localhost:5173`)
- `ALLOW_ADMIN_BOOTSTRAP` (true/false)

## Run
- Prod: `npm start`
- Dev (in-memory Mongo): `npm run dev:memory`
- Dev (existing Mongo): `npm run dev`

## Testing
- Backend tests: `npm test`
- Lint: `npm run lint`
