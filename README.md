# Operasional

Local-first operations dashboard built with Next.js, React, TypeScript, and
Fluent UI React v9.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The development server binds to `127.0.0.1`. Operational data and role-based
access are stored locally in SQLite. On first run, create the initial Admin
account; later runs require login. Admin can create local accounts, Admin and
Supervisor can add directory records, and User accounts are read-only.
Self-service registrations remain pending until an Admin reviews and assigns a
role.

The database starts without operational records. SPPG region options are loaded
from the documented GitHub mirror and require an internet connection.

## Google sign-in

Google sign-in is optional. To enable it locally, create a Google OAuth Web
client with `http://127.0.0.1:3001` as an authorized JavaScript origin, then
set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in the root `.env.local` file and restart the
development server. The client ID is public; no client secret is needed.

The server validates Google's signed ID token, audience, issuer, and verified
email. Google registrations still require Admin approval. Existing local
accounts are not linked automatically by matching email.

## Stack

- Next.js App Router with React and TypeScript
- Fluent UI React v9 and Fluent system icons
- Recharts and date-fns for future dashboard visualizations and dates
- React Hook Form and Zod for future validated forms

SQLite is the active local runtime data store. No Supabase connection or seed
data is configured.
