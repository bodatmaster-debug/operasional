# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
The app supports Admin, Supervisor, and User accounts. Admin manages local accounts and may add SPPG and Yayasan records; Supervisor may add SPPG and Yayasan records; User has read-only access to the directory.

## Product Purpose

Manage SPPG and Yayasan records, operational assets, and maintenance in one dashboard. Success means each role can find and maintain the operational information it is authorized to handle.

## Positioning

Product positioning beyond its SPPG/Yayasan operations focus is undecided.

## Operating Context

The app is for day-to-day operations management. Detailed workflows and user environments have not yet been specified.

## Capabilities and Constraints

- The initial scope is SPPG/Yayasan records, assets, and maintenance.
- Local authentication uses a first-run Admin setup; accounts are created by an authenticated Admin. Directory creation permissions are enforced by the server, not only hidden in the interface.
- The requested client stack is React, TypeScript, and Fluent UI React v9. Next.js App Router is selected as the full-stack framework so local APIs and the interface can share one app.
- Runtime data is local SQLite; Supabase is not an active runtime data source.
- The database must start empty. Do not create seed or example operational records.
- Operational rules must follow `docs/standar-operasional-bgn.md` and the referenced workbook. Conditional standards must retain their context and uncertainties.
- The app is for one local instance, bound to `127.0.0.1`; do not expose its API or data to a network.

## Evidence on Hand

- No application records or sample datasets were provided for the new app.
- The operational reference workbook and its notes currently live in the neighboring `dashboard` project; their details must be reviewed before implementing operational rules.

## Product Principles

- Keep operational records grounded in actual local data; never present sample values as production facts.
- Preserve the source and context of operational standards, and mark ambiguous facts as needing verification.
- Enforce role-specific access on the server as well as in the interface.
- Keep operational data local and preserve user records during database changes.
