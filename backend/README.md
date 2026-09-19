# Planova backend

The backend is dependency-free and runs on Node 20 or newer. It keeps all operational data in `backend/database/data.json`, which is created automatically on first start and intentionally excluded from Git.

## Run

1. Copy `.env.example` to `.env` and replace `JWT_SECRET` with a long random value.
2. Run `node backend/server.js` from the project root.
3. Open `http://localhost:3000`.

The server delivers the existing HTML exactly from its original files. At response time it removes only the authentication preview mock and adds a non-visual API bridge that forwards the token already stored by the sign-in screen. No UI source file is changed.

## API

- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/dashboard/stats|modules|activity|charts|summary`
- `GET /api/events`, `GET /api/events/:id`, `GET /api/events/:id/budget`
- `POST /api/events`, `PATCH /api/events/:id`, `DELETE /api/events/:id`

Dashboard and event reads require `Authorization: Bearer <token>`. Event creation and editing require `Admin` or `Core Team`; deletion requires `Admin`. Dashboard read responses retain the existing frontend's direct JSON shape, while mutations return `{ success, data }` and failures return `{ success: false, message }`.

## Verify

Run `node --test backend/tests/api.test.js`. The suite covers signup, password validation, login, authenticated dashboard access, event creation, duplicate-account errors, and removal of the preview-only mock from the served page.
