# Shiftstats

Shiftstats is a Next.js app for logging work shifts and turning them into useful earnings analytics.

## Current State

- Next.js App Router scaffold is in place
- Tailwind CSS is configured
- Prisma schema and seed script scaffolding are included
- sample development data lives in `sample-data/initial-shifts.csv`
- implementation details are tracked in `ROADMAP.md`

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

Run release preflight checks:

```bash
npm run check:release
```

Run authenticated smoke checks (against local or staging URL):

```bash
SMOKE_BASE_URL=http://localhost:3003 npm run check:smoke
```

Run a full local production smoke flow in one command (build + start + authenticated checks + cleanup):

```bash
npm run check:smoke:local
```

Run production mode locally (standalone server):

```bash
npm run build
npm run start
```

For local production-mode auth routes, set runtime auth vars in the shell:

```bash
AUTH_SECRET=replace-with-a-generated-secret AUTH_TRUST_HOST=true npm run start
```

## Environment

Create a local environment file from `.env.example` once database details are available.

For local database development, create `.env.local` with:

```bash
DATABASE_URL="postgresql://shiftstats:shiftstats@localhost:5432/shiftstats?schema=public"
AUTH_SECRET="replace-with-a-generated-secret"
AUTH_DEMO_EMAIL="demo@shift-stats.com"
AUTH_DEMO_PASSWORD="demo"
AUTH_TRUST_HOST="true"
```

Prisma CLI loads variables from `.env`, so mirror the database URL there before running migrations:

```bash
cp .env.local .env
```

Minimum auth-related variables:

```bash
AUTH_SECRET="replace-with-a-generated-secret"
AUTH_DEMO_EMAIL="demo@shift-stats.com"
AUTH_DEMO_PASSWORD="demo"
AUTH_TRUST_HOST="true"
```

In development, if the demo email and password are not set, the app falls back to those same demo credentials automatically.

## Prisma

Start local Postgres first:

```bash
npm run db:up
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run a local development migration:

```bash
npm run prisma:migrate
```

Seed the database from the sample CSV:

```bash
npm run db:seed
```

If formulas change or legacy totals need correction, recompute stored totals:

```bash
npm run db:recompute-totals
```

Stop the local database:

```bash
npm run db:down
```

## Sample Data

The starter dataset comes from the screenshot-derived rows in `sample-data/initial-shifts.csv`.

It currently preserves totals by mapping each row into the richer shift schema with `otherIncome = totalEarned` and zeroed tip and base-pay fields.

## CSV Import and Export

Shift history supports both CSV export and import.

- Export from the shifts page using `Export CSV`
- Import from `/shifts/import`

The importer currently expects the Shiftstats export format, including these headers:

```text
Date,Hours Worked,Total Earned,Hourly Rate,Cash Tips,Card Tips,Base Pay,Other Income,Location,Role
```

Notes are also supported if a `Notes` column is present.

## Docker

The app is configured for container deployment with:

- `next.config.ts` using `output: "standalone"`
- a production `Dockerfile`
- a `.dockerignore`

Build the image:

```bash
docker build -t shiftstats .
```

Run the container:

```bash
docker run --rm -p 3000:3000 \
	-e AUTH_SECRET=replace-with-a-generated-secret \
   -e AUTH_DEMO_EMAIL=demo@shift-stats.com \
   -e AUTH_DEMO_PASSWORD=demo \
	-e AUTH_TRUST_HOST=true \
	shiftstats
```

To use database-backed reads and writes in a container, also pass `DATABASE_URL`.

## Go-Live Checklist

Before deploying to a live URL:

1. Run `npm run check:release` locally.
2. Run `SMOKE_BASE_URL=<staging-url> npm run check:smoke` against your staging deployment.
3. Confirm env vars are set in your hosting platform:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_DEMO_EMAIL`
   - `AUTH_DEMO_PASSWORD`
   - `AUTH_TRUST_HOST`
4. Run Prisma migrations in production using:

```bash
npm run prisma:migrate:deploy
```

5. Verify core live flows on mobile and desktop:
   - sign in
   - add shift
   - edit shift and return to filtered list
   - delete shift
   - filter + sort + pagination interactions on `/shifts`

## Custom Domain (shift-stats.com)

Configure the production domain in your hosting provider (Vercel):

1. Add both `shift-stats.com` and `www.shift-stats.com` in Project -> Settings -> Domains.
2. Pick a canonical domain (recommended: `shift-stats.com`) and redirect the other.

DNS records (at your registrar):

- `A` record: host `@` -> `76.76.21.21`
- `CNAME` record: host `www` -> `cname.vercel-dns.com`

After DNS propagates, run a domain smoke check:

```bash
SMOKE_BASE_URL=https://shift-stats.com \
AUTH_DEMO_EMAIL=demo@shift-stats.com \
AUTH_DEMO_PASSWORD=demo \
npm run check:smoke
```
