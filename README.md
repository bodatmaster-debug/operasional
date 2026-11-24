# Operasional

Local-first operations dashboard built with Next.js, React, TypeScript, and
Fluent UI React v9.

## Runtime migration status

The application runtime is being migrated to Supabase. Operational tables and
profiles are stored in PostgreSQL, authentication uses Supabase Auth, and API
routes validate the authenticated profile and RLS-backed tenant permissions.
The feature branch `feature/supabase-full-runtime` contains the migration work.

Configure `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then apply the migrations in
`supabase/migrations` to the target project before deployment.
