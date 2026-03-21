# Shiftstats Implementation Spec

Last updated: 2026-03-20

## Status Snapshot (2026-03-20)

Completed now:

- authentication with protected app routes
- PostgreSQL + Prisma schema/migrations + seed path
- shift CRUD routes and pages
- shift history filters on `/shifts`, `/dashboard`, and `/analytics`
- shift history sorting controls on `/shifts`
- query-driven pagination on `/shifts` with preserved list state
- compact mobile quick-filter chips on `/shifts` (all/week/month)
- sticky mobile add-shift CTA on `/shifts`
- mobile-friendly shift history row cards (desktop table retained)
- edit flow returns users to their prior filtered/sorted/paginated list state
- inline delete confirmation for safer mobile row actions
- mobile add/edit form polish: compensation hint + base hourly rate guidance + larger touch targets
- formula correction on read path: `total = (base * hours) + cash + card + otherIncome`
- user settings persistence on `/settings`
- CSV export from shift history with filter-aware export payload
- CSV import from Shiftstats export format on `/shifts/import`
- chart tooltip currency formatting and responsive container warning fix
- regression checks added for filter/sort/pagination/quick-filter URL state
- return-to-list sanitize/edit-link helpers with regression checks
- release preflight command: `npm run check:release`
- delete refresh behavior regression checks in `check:flows`
- standalone production-mode dry run validated with required auth env vars
- local production smoke checks validated on key routes (`/`, `/login`, `/dashboard`, `/shifts`, `/api/auth/session`)
- authenticated smoke script added: `npm run check:smoke`
- password reset smoke script added: `npm run check:smoke:reset`
- one-command local production smoke runner added: `npm run check:smoke:local`
- local smoke runner now applies Prisma migrations automatically before build/start
- analytics mobile readability improvements shipped (compact axis labels, clearer filter summaries, quick takeaways)
- weekday analytics hardened to derive from `shiftDate` with regression checks for stale `dayName` mismatches
- production domain secured: `shift-stats.com`
- goals page + goals API with progress donuts on dashboard/analytics
- pay period settings + pay period filter support on dashboard/analytics
- period-over-period compare overlay chart on analytics
- monthly calendar view (`/calendar`) with day deep-link to filtered shifts
- weekly schedule view (`/schedule`) with prev/next week navigation
- database-backed signup flow (`/signup`) with hashed passwords and user profile name
- account management on `/settings` for profile name and password changes
- calendar/schedule query-state edge checks (invalid date params + navigation links)
- password reset flow with request + token confirmation routes and pages
- password reset flow validated end-to-end in local production smoke checks
- optional email verification for new signups (`AUTH_REQUIRE_EMAIL_VERIFICATION`)
- email verification route validated via smoke flow with verification enabled
- resend verification flow added (`/resend-verification`, `/api/email-verification/request`)
- mobile polish on auth forms (responsive padding, left-aligned helper links on small screens)
- period comparison deltas on dashboard and analytics (earnings, hours, hourly rate vs previous period)

In progress now:

- release hardening and production smoke validation of newly shipped phase features

Next up (roadmap priority):

- run `SMOKE_BASE_URL=https://shift-stats.com npm run check:smoke` against production domain
- execute final manual smoke checks on `https://shift-stats.com` (desktop + mobile)

## Competitive Feature Roadmap (vs ServerLife)

Features identified from ServerLife app screenshot as gaps worth closing.
Ordered by value delivered relative to implementation effort.

### Phase 1 — High value, lower complexity

#### Period comparison deltas

Show current period vs previous period with $ and % change on dashboard and analytics.

- Add a "vs previous period" query that fetches the same span shifted back one period
- Display delta badges (e.g. `-$128.26 (-22.78%)`) next to earnings, hours, and hourly rate summary cards
- Support all existing period filters (week, month, year) for the comparison
- Color-code: green for improvement, red for decline

#### Custom date range filter

Add a "Custom" filter option to shift history, dashboard, and analytics.

- Render a start date + end date picker that replaces the period quick-filter when selected
- Persist custom range in URL query params (`from` / `to`) the same way existing filters work
- Maintain existing `?period=` param for the named presets; use `?from=&to=` for custom

#### Sales amount + tip percentage tracking

Add an optional `salesAmount` field to each shift to derive tip percentage.

- Schema: add `salesAmount decimal(10,2)` nullable column to `shifts` table, default `null`
- Form: optional "Sales ($)" input below the tip fields, hidden unless user enables it in Settings
- Display derived `tipPct = totalTips / salesAmount * 100` on shift detail, history rows, and analytics
- Settings toggle: "Track sales / tip percentage"
- Analytics: add a "Tip %" series to the earnings trend chart when sales data is present

#### Averages panel on analytics

Formalize a dedicated averages view alongside the existing totals.

- Show daily, weekly, and monthly averages for: earnings, hours worked, hourly rate, tip %
- Add a toggle (Daily / Weekly / Monthly) to switch the averaging window
- Reuse existing `earningsSeries` data — compute averages client-side from the series

### Phase 2 — Medium complexity

#### Goals with progress tracking

Let users set earnings and hours targets and track progress against them.

- Schema: add `goals` table with `userId`, `period` (daily/weekly/monthly/yearly), `metricType` (takeHome/hours/avgHourly), `targetValue decimal(10,2)`, `createdAt`, `updatedAt`
- UI: Goals page (or Settings section) to create and edit goal targets
- Analytics: donut-chart progress widgets for each active goal showing "So far / Remaining"
- Dashboard: surface incomplete goals for the current week/month as quick-glance cards
- Library: use existing Recharts `PieChart` / `Cell` for donut charts (no new charting dep)

#### Pay period filter

Support a configurable pay period (e.g. weekly Thu–Wed, biweekly) as a first-class filter.

- Settings: let user set pay period type (weekly / biweekly) and start day/anchor date
- Filter toolbar: add "Pay Period" alongside existing Week / Month / Year chips
- Analytics and dashboard respect the pay period boundary when selected
- URL param: `?period=pay`

#### Period-over-period overlay chart

Overlay current and previous period as two series on the earnings trend chart.

- Add a "Compare" toggle to the analytics earnings chart
- When enabled, fetch previous period series alongside current and render as a dashed line
- Tooltip shows both current and previous period values for the hovered date
- Reuse existing Recharts `ComposedChart` — add a second `Line` series with a distinct color

### Phase 3 — Higher complexity

#### Calendar view

Monthly calendar showing each day's total earnings with a visual intensity bar.

- New route: `/calendar`
- Render a standard month grid; each day cell shows total earned and a bar scaled to the month's max
- Clicking a day navigates to a filtered `/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD` view
- Navigation: prev/next month arrows; default to current month
- Add "Calendar" to primary nav (desktop sidebar + mobile bottom nav)

#### Schedule view

Weekly agenda timeline listing upcoming and recent shifts with time, role, and location.

- New route: `/schedule`
- Display a 7-day window (current week by default) with each shift as a card: time range, role, location, earnings
- Navigation: prev/next week arrows
- "Add shift" shortcut from any empty day slot
- Add "Schedule" to primary nav

## Project Identity

- Product name: Shiftstats
- Repository: `https://github.com/ryanlong1004/shift_stats`
- Product type: web app
- Primary use case: log work shifts quickly and surface useful earnings analytics

## Goal

Build a fast personal analytics app for service-industry shift tracking.

The first version must do two things well:

- make shift entry fast on desktop and mobile
- make earnings trends obvious within one screen load

## Locked Technical Decisions

- Framework: Next.js with App Router
- Language: TypeScript
- Styling: Tailwind CSS
- UI primitives: shadcn/ui
- Charts: Recharts
- ORM: Prisma
- Database: PostgreSQL
- Hosting target: Vercel
- Database hosting target: Neon
- Architecture: Next.js full-stack app, not split frontend and backend
- Money handling: decimal values only, never floats

## MVP Boundary

The MVP includes:

- authentication
- shift create, read, update, and delete
- CSV import/export
- dashboard summary cards
- shift history table with filters
- a first chart set
- basic text insights

The MVP does not include:

- tax mode
- recurring templates
- calendar view
- offline support
- PWA support
- AI-generated insights
- goals and targets

## Core Product Rules

- The app must track both `tips only` and `total compensation`.
- `total compensation` means cash tips + card tips + (base pay \* hours worked) + other income.
- Every saved shift must have a normalized `hoursWorked` value.
- A shift can be entered using either total hours or start and end time.
- If start and end time are used, the app computes `hoursWorked` before saving.
- If total hours are entered directly, start and end time are optional metadata.
- Analytics must always be scoped to the signed-in user.

## User Stories

### MVP User Stories

- As a user, I can sign in and see only my own shifts.
- As a user, I can add a shift in under 30 seconds.
- As a user, I can edit a bad entry without re-entering everything.
- As a user, I can delete a shift.
- As a user, I can see how much I earned this week and this month.
- As a user, I can see my average hourly earnings.
- As a user, I can filter my history by date range and location or role.
- As a user, I can see my best shifts and performance trends.

## Auth Decision

- MVP auth choice: Auth.js
- User model is required from day one
- All app routes except sign-in should require authentication
- Local development can use the simplest provider setup that does not block delivery

If Auth.js setup becomes the only blocker to shipping Phase 1 locally, the fallback is:

- keep the data model user-scoped
- implement a temporary single-user development path
- replace it with full Auth.js before deployment

## Route Map

### Public Routes

- `/` -> marketing-light landing page or redirect to dashboard if authenticated
- `/login` -> sign-in page

### Protected Routes

- `/dashboard` -> default post-login home
- `/shifts` -> full shift history table
- `/shifts/new` -> add shift form
- `/shifts/[id]/edit` -> edit shift form
- `/analytics` -> deeper charts and insight summaries
- `/settings` -> user preferences and tracking settings

## Navigation Model

Desktop navigation:

- top bar
- left sidebar for app sections

Mobile navigation:

- top bar
- bottom nav for primary destinations

Primary nav items:

- Dashboard
- Shifts
- Add Shift
- Analytics
- Settings

## Data Model

### users

| Field     | Type     | Required | Notes        |
| --------- | -------- | -------- | ------------ |
| id        | string   | yes      | primary key  |
| email     | string   | yes      | unique       |
| name      | string   | no       | display name |
| createdAt | datetime | yes      | default now  |
| updatedAt | datetime | yes      | auto update  |

### shifts

| Field       | Type          | Required | Notes                        |
| ----------- | ------------- | -------- | ---------------------------- |
| id          | string        | yes      | primary key                  |
| userId      | string        | yes      | foreign key to users         |
| shiftDate   | date          | yes      | local working date           |
| inputMode   | enum          | yes      | `hours` or `timeRange`       |
| startTime   | string        | no       | `HH:mm`, local time          |
| endTime     | string        | no       | `HH:mm`, local time          |
| hoursWorked | decimal(5,2)  | yes      | normalized and stored        |
| cashTips    | decimal(10,2) | yes      | default `0.00`               |
| cardTips    | decimal(10,2) | yes      | default `0.00`               |
| basePay     | decimal(10,2) | yes      | default `0.00`               |
| otherIncome | decimal(10,2) | yes      | default `0.00`               |
| totalEarned | decimal(10,2) | yes      | denormalized for query speed |
| location    | string        | no       | short text                   |
| role        | string        | no       | short text                   |
| notes       | string        | no       | free text                    |
| createdAt   | datetime      | yes      | default now                  |
| updatedAt   | datetime      | yes      | auto update                  |

### userSettings

| Field           | Type     | Required | Notes                     |
| --------------- | -------- | -------- | ------------------------- |
| id              | string   | yes      | primary key               |
| userId          | string   | yes      | unique foreign key        |
| currencyCode    | string   | yes      | default `USD`             |
| timezone        | string   | yes      | default user locale guess |
| trackBasePay    | boolean  | yes      | default `true`            |
| splitTipsByType | boolean  | yes      | default `true`            |
| createdAt       | datetime | yes      | default now               |
| updatedAt       | datetime | yes      | auto update               |

## Initial Sample Data

Use the attached screenshot as the first seed dataset for development, mockups, and acceptance checks.

### Source Rows

| Date       |  Total | Hours | Hourly | Day      |
| ---------- | -----: | ----: | -----: | -------- |
| 2026-03-14 | 363.00 |  8.45 |  42.96 | Saturday |
| 2026-03-15 | 255.00 |  6.38 |  39.97 | Sunday   |
| 2026-03-12 | 222.00 |  5.82 |  38.14 | Thursday |
| 2026-03-10 |  91.00 |  5.12 |  17.77 | Tuesday  |

### Mapping Rules

The screenshot data is a simplified historical format. It does not include cash tips, card tips, or base pay breakdowns.

For the first development seed:

- `shiftDate` comes directly from the sample row date
- `inputMode` should be `hours`
- `hoursWorked` comes directly from the sample row hours value
- `totalEarned` comes directly from the sample row total value
- `cashTips` should default to `0.00`
- `cardTips` should default to `0.00`
- `basePay` should default to `0.00`
- `otherIncome` should temporarily equal `totalEarned`
- `location`, `role`, and `notes` should be blank unless manually enriched later

This preserves the screenshot totals without inventing a tips-versus-wage split.

### Expected Aggregate Values From Sample Data

Use these values to validate the first dashboard implementation:

- total shifts: `4`
- total earned: `931.00`
- total hours worked: `25.77`
- average shift earnings: `232.75`
- weighted average hourly rate: `36.13`
- best shift total: `363.00` on `2026-03-14`
- best weekday by hourly rate: `Saturday`

### Seed Data File

The repo should treat `sample-data/initial-shifts.csv` as the canonical starter dataset for local development until real user-entered data exists.

## Validation Rules

- `shiftDate` is required
- one input mode must be selected: `hours` or `timeRange`
- if input mode is `hours`, `hoursWorked` is required and must be greater than `0`
- if input mode is `timeRange`, `startTime` and `endTime` are required
- all money fields default to `0.00` and cannot be negative in MVP
- `hoursWorked` cannot exceed `24.00`
- `location` max length: `100`
- `role` max length: `100`
- `notes` max length: `1000`

## Calculation Rules

### Normalization

- `totalTips = cashTips + cardTips`
- `baseCompensation = basePay * hoursWorked`
- `totalCompensation = cashTips + cardTips + baseCompensation + otherIncome`
- `totalEarned` should store `totalCompensation`
- `hourlyRate = totalEarned / hoursWorked`

### Time Handling

- `hoursWorked` is the canonical duration field used for analytics
- if the user provides a time range, compute decimal hours from the difference
- computed hours should round to two decimal places
- overnight shifts are not supported in MVP unless explicitly implemented later

### Numeric Handling

- use Prisma decimals in persistence
- use a decimal-safe utility for calculations in application code
- format currency only at the presentation layer

## Dashboard Spec

### Summary Cards

The dashboard must show these six cards:

- total earned this week
- total earned this month
- average hourly rate
- best shift value
- total hours worked in current filter context
- number of shifts in current filter context

### Recent Activity

- show the 5 most recent shifts
- include quick actions for edit and add shift

### Dashboard Charts

The dashboard view should include:

- earnings over time line chart
- earnings per shift bar chart
- hourly rate trend line chart

The deeper analytics page should include:

- hours worked per week bar chart
- cash versus card tips chart
- weekday performance heatmap

### Dashboard Insight Text

The dashboard should generate at least 3 short insights from current data:

- average shift earnings
- best weekday by hourly rate
- best single shift in the selected period

## Shift History Spec

### Table Columns

- date
- hours
- total earned
- hourly rate
- cash tips
- card tips
- base pay
- location
- role
- notes
- actions

### Filters

- current week
- current month
- custom date range
- location
- role

### Sorting

- default sort: `shiftDate desc`, then `createdAt desc`

## Analytics Spec

The analytics page must include these grouped views:

### Trend Views

- daily earnings trend
- weekly earnings totals
- hourly rate trend
- moving 7-shift average

### Breakdown Views

- earnings by location
- earnings by role
- cash versus card ratio
- best weekday by average hourly rate

### Comparison Views

- current month versus previous month
- last 4 weeks versus previous 4 weeks

## Insight Formulas

- `averageShiftEarnings = totalEarned sum / shift count`
- `averageHourlyRate = totalEarned sum / hoursWorked sum`
- `bestWeekday = weekday with highest average hourlyRate`
- `bestShift = shift with highest totalEarned`
- `monthOverMonthChange = (currentMonth - previousMonth) / previousMonth`
- `consistencyScore = standard deviation of totalEarned` for later phases, not MVP UI

## Form Spec

### Add Shift Form Fields

- shift date
- input mode toggle
- total hours or start time and end time
- cash tips
- card tips
- base pay
- other income
- location
- role
- notes

### Form Behavior

- show computed total earned before submit
- show computed hourly rate before submit
- preserve user input on validation errors
- support both desktop and mobile widths without modal-only UX

## Component Inventory

### App Shell

- `AppShell`
- `SidebarNav`
- `MobileBottomNav`
- `TopBar`

### Shift Entry

- `ShiftForm`
- `InputModeToggle`
- `MoneyInput`
- `DurationInput`
- `TimeRangeInput`
- `ShiftPreviewCard`

### Dashboard

- `SummaryCardGrid`
- `SummaryCard`
- `RecentShiftsList`
- `InsightPanel`
- `EarningsLineChart`
- `ShiftBarChart`
- `HourlyRateLineChart`

### History And Analytics

- `ShiftFilters`
- `ShiftHistoryTable`
- `WeekdayHeatmap`
- `TipsSplitChart`
- `HoursPerWeekChart`
- `AnalyticsSection`

## Server Responsibilities

### Server Actions Or Route Handlers

- create shift
- update shift
- delete shift
- list shifts with filters
- fetch dashboard summary
- fetch analytics aggregates
- update user settings

### Data Access Rules

- every query must filter by authenticated `userId`
- aggregate queries should run in the database where practical
- expensive derived datasets should be computed server-side, not in the client

## Initial Prisma Shape

The implementation should start with these models:

- `User`
- `Shift`
- `UserSettings`

Implementation notes:

- store money as `Decimal` with two decimal places in the database
- index `Shift.userId`
- index `Shift.shiftDate`
- add a composite index on `Shift.userId + Shift.shiftDate`
- keep `totalEarned` persisted for simple aggregates and ordering

## App State Strategy

- server components should own page-level data fetching by default
- client components should be used only for interactive form logic, charts, and filters
- avoid global client state unless there is a clear repeated need
- query string parameters should drive history and analytics filters where practical

## Formatting Rules

- currency display should use user settings currency code
- dates should render in the user timezone
- hours should display to at most two decimals
- empty money fields should display as `$0.00` in the default locale

## Environment Variables

Expected initial environment variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- auth provider variables as required by chosen Auth.js provider setup

Possible later environment variables:

- analytics or telemetry keys
- email provider credentials

## Delivery Plan

### Phase 1: Foundation

- initialize Next.js app
- configure Tailwind and shadcn/ui
- configure Prisma and PostgreSQL
- add Auth.js
- create Prisma schema
- run initial migration
- build app shell
- implement add, edit, delete, and list shifts
- implement dashboard summary cards

### Phase 2: Reporting

- implement history filters
- implement history table
- implement dashboard charts
- implement analytics page
- implement first text insights

### Phase 3: Refinement

- add settings page
- add month-over-month comparisons
- add location and role breakdowns
- improve mobile UX and loading states
- add pagination controls for long shift history tables
- improve row-level edit/delete ergonomics on mobile

### Phase 4: Expansion

- import and export
- goals
- calendar view
- PWA
- AI insight generation

## Acceptance Criteria

### Phase 1 Acceptance

- a signed-in user can create a shift
- a signed-in user can edit and delete a shift
- saved shifts persist to PostgreSQL
- dashboard cards update from real database data
- all queries are user-scoped
- local development runs cleanly with documented setup

### Phase 2 Acceptance

- shift history filters update results correctly
- chart data matches filtered results
- at least 3 text insights render from actual data
- analytics views load without client-side full-page recomputation

## Immediate Build Order

1. generate the Next.js app scaffold
2. add Tailwind, shadcn/ui, Prisma, and Auth.js
3. define the Prisma schema and migration
4. build the app shell and protected routes
5. implement the shift form and CRUD flow
6. implement dashboard summaries
7. implement tables, filters, and charts

## Immediate Next Build Order (Updated)

1. add regression checks for delete refresh behavior
2. expand analytics mobile readability pass (labels, spacing, chart summaries)
3. run deployment dry run with `npm run check:release`
4. deploy to staging/prod-like URL and execute manual smoke checks
5. finalize go-live checklist signoff

## Current Workspace Notes

- local path: `/home/rlong/Sandbox/shiftstats`
- git remote: `origin -> https://github.com/ryanlong1004/shift_stats.git`
- local `.venv` is project-specific and separate from `deadpool`
- `.gitignore` already ignores `.venv/`

These notes are operational only. The application itself should be built with the Next.js stack defined above.
