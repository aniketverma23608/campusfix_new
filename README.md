# ai_campusfix

CampusFix is a full-stack campus issue workflow for students, facilities workers, and administrators.

## What works

- Students register/sign in, submit hostel or college problems, add a location and optional attachment, and track only their own reports.
- The server categorizes and prioritizes each report with Gemini when `GEMINI_API_KEY` is set. It uses a small local classifier when no key is configured or Gemini is unavailable.
- Administrators see campus-wide reports, create worker accounts, assign issues, review worker proof, approve resolutions, or request changes with a note.
- Workers see only assigned reports, start the repair, and upload an image or video as proof. The database stores the report, assignment, status, and audit history.
- Notifications are saved in MongoDB and delivered live over Socket.IO while users are connected.

## Prerequisites

- Node.js 20+
- Docker Desktop for local MongoDB, or another MongoDB connection string
- A Gemini API key for AI classification (optional; local categorization is used without it)

## Start locally

1. Copy `.env.example` to `.env` and set a random `JWT_SECRET` (at least 32 characters) and a strong `ADMIN_PASSWORD` (at least 12 characters). Add `GEMINI_API_KEY` to enable Gemini classification.
2. Start MongoDB with `docker compose up -d mongodb`, or point `MONGODB_URI` in `.env` at your MongoDB instance.
3. From this folder run `npm install` and then `npm run dev`.
4. Open `http://localhost:5173`. The initial admin account is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` on first server start.
5. Register a student account. Sign in as the seeded admin to add workers and assign reports.

## Roles

- Public registration always creates a student account. It cannot create admin or worker privileges.
- The first admin is seeded from environment variables. Admins create worker accounts inside the dashboard.
- Students can submit and view their own reports. Workers can view reports assigned to them. Admins can view and manage all campus reports.

## File evidence

Report attachments and worker proof are stored under `uploads/` with randomized filenames and a 10 MB default limit. Set `MAX_UPLOAD_MB` to change the limit. For a public deployment, replace local upload storage with private object storage and configure backups and retention.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/complaints`, `POST /api/complaints`, `PATCH /api/complaints/:id/assign`
- `PATCH /api/complaints/:id/start`, `POST /api/complaints/:id/proof`, `PATCH /api/complaints/:id/review`
- `GET/POST /api/admin/workers`, `GET /api/admin/analytics`
- `GET /api/health`

All protected requests use a bearer token. Admin and worker permissions are checked on the API; hiding a button in the UI is not used as access control.
