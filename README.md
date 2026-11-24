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

Google sign-in uses Supabase OAuth for the primary login button. Set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the
root `.env.local` file, then restart the development server. Add
`http://127.0.0.1:3000/auth/callback` to the Supabase Auth redirect URL allowlist
and configure the Google provider's Supabase callback URL in Google Cloud.

The callback exchanges the PKCE code, checks the signed-in user and
`public.user_profiles` status, then issues a local SQLite session for existing
local APIs. Only active, non-revoked, non-banned profiles can enter the app;
non-admin profiles also need recorded EULA acceptance. New Supabase Auth users
remain pending until an Admin approves them. Accounts are never linked by email
alone; existing local Google accounts can continue through the legacy Google
sign-in button on the login screen.

Local Google registration still uses Google Identity Services. To enable it,
create a Google OAuth Web client with `http://127.0.0.1:3000` as an authorized
JavaScript origin and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`. The
client ID is public; no client secret is needed. Google registrations require
Admin approval.

## Stack

- Next.js App Router with React and TypeScript
- Fluent UI React v9 and Fluent system icons
- Recharts and date-fns for future dashboard visualizations and dates
- React Hook Form and Zod for future validated forms

Supabase SSR clients are configured, and the schema migrations in `supabase/`
create the operational PostgreSQL tables. The current local operational data
snapshot was imported into the configured Supabase project; local account
credentials, sessions, pending registrations, and email-change verification
data were intentionally excluded.

SQLite and local authentication remain the active application runtime. The
Supabase Auth profile and role/tenant RLS migration has been applied to the
configured Supabase project. New Auth accounts receive a `user`/`pending`
profile, and existing Auth accounts are backfilled during migration. The
first confirmed account was promoted to the initial active Admin. These
database policies do not switch the application's API routes or login flow
from SQLite to Supabase.

The `storage_buckets` migration prepares private `organization-assets` and
`user-avatars` buckets with a 5 MiB limit and image MIME allowlists. No
`storage.objects` policies are added yet, so uploads and downloads remain
blocked until tenant-aware Storage policies are implemented. The application
does not upload files to these buckets yet.
