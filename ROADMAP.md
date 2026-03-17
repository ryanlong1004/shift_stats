# Shiftstats Roadmap

Last updated: 2026-03-16

## Product Summary

Shiftstats is a web app for logging individual work shifts and turning them into useful earnings analytics.

Repository target:

- GitHub: `https://github.com/ryanlong1004/shift_stats`

Core user value:

- Enter a shift quickly.
- See true earnings, not just raw tips.
- Understand performance by day, week, month, role, and location.
- Spot trends and patterns in under 10 seconds.

The product should optimize for speed of data entry, clarity of reporting, and practical usefulness over flashy features.

## Product Vision

Each shift record captures:

- shift date
- start and end time, or total hours worked
- cash tips
- card tips
- base pay
- other income if needed later
- notes
- location
- role or section

From that data, the app should calculate:

- total tips
- total compensation
- earnings per hour
- total earnings by day, week, month
- total hours worked
- average per shift
- best and worst shifts
- rolling averages
- trends over time

## Primary Product Decision

Track both of these metrics throughout the app:

- tips only
- total compensation

Reason:

- users care about tip performance
- users also care about true hourly earnings including wage

## MVP Scope

The MVP should stay narrow and solve the daily logging and review workflow well.

### 1. Shift Entry

Users can create a shift with:

- date
- start time and end time, or hours worked
- cash tips
- card tips
- base pay
- notes
- location
- role or section

The app calculates:

- total hours
- total earnings
- earnings per hour

### 2. Dashboard

Initial summary cards:

- total earned this week
- total earned this month
- average dollars per hour
- best shift
- total hours worked
- number of shifts

### 3. Shift History

A table should show:

- date
- hours
- total made
- dollars per hour
- location or role
- notes

Initial filters:

- week
- month
- custom date range
- location or role

### 4. Charts

First chart set:

- line chart of earnings over time
- bar chart of earnings per shift
- bar chart of hours worked per week
- line chart of hourly rate trend
- pie or bar chart of cash versus card tips
- weekday heatmap to identify strongest days

### 5. Insight Text

The app should generate short readable summaries such as:

- Your average shift earns $142.36.
- Fridays are your best day, averaging $29.10 per hour.
- Your highest-earning shift was March 8: $248 in 6.5 hours.
- You made 18% more this month than last month.

This layer should make the product feel intelligent without adding AI complexity in the MVP.

## Key Screens

### 1. Login

- simple and clean
- minimal friction

### 2. Dashboard

- summary cards
- charts
- recent shifts
- quick-add shift button

### 3. Add Shift

- fast input flow
- optimized for phone and desktop

### 4. Shift History

- filterable table
- edit and delete support

### 5. Analytics

- daily, weekly, monthly trends
- month-over-month comparisons
- best weekday
- average by location
- average by role

### 6. Settings

- preferred currency
- whether to track base wage
- whether to track cash and card separately
- timezone
- export data

## Recommended Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts

Why this stack:

- fast to build
- strong UI ecosystem
- good deployment path
- good type safety for money and analytics logic

### Backend

Recommended MVP architecture:

- Next.js full-stack
- server actions or route handlers
- Prisma ORM
- PostgreSQL

Alternative architecture:

- Next.js frontend
- FastAPI or Django backend
- PostgreSQL

Decision:

- use the Next.js full-stack approach unless a separate backend becomes necessary later

### Auth

Preferred options:

- Auth.js
- Clerk
- Supabase Auth

Initial recommendation:

- start with the simplest option that does not slow MVP delivery

### Hosting

- Vercel for the app
- Neon or Supabase for PostgreSQL

## Initial Data Model

### users

- id
- email
- name
- created_at

### shifts

- id
- user_id
- shift_date
- start_time nullable
- end_time nullable
- hours_worked decimal
- cash_tips decimal
- card_tips decimal
- base_pay decimal
- other_income decimal
- total_earned decimal
- location nullable
- role nullable
- notes nullable
- created_at
- updated_at

### Derived Calculations

These do not need to be stored at first:

- tips_only = cash_tips + card_tips
- total_compensation = cash_tips + card_tips + base_pay + other_income
- hourly_rate = total_compensation / hours_worked

Rule:

- use decimals, not floats, for money values

## Metrics Worth Shipping

Priority metrics:

- average earnings per hour
- average tips per shift
- total tips by week and month
- total hours by week and month
- best weekday
- best month
- longest shift
- most profitable short shift
- moving 7-shift average
- projected weekly earnings based on recent average
- earnings by location
- earnings by role
- cash versus card ratio

## UX Direction

### Layout

- top navigation
- left sidebar on desktop
- bottom navigation on mobile
- dashboard as the default landing screen after login

### Visual Style

- clean and practical
- dark and light mode support
- cards for summaries
- clear currency formatting
- restrained use of color
- charts with strong tooltips and readable axes

### UX Priority

The product should feel:

- fast to enter data
- easy to review trends
- useful in under 10 seconds

## Example User Flow

1. User signs in.
2. User clicks Add Shift.
3. User enters date, hours, cash tips, card tips, and base pay.
4. The app computes total earned and hourly rate.
5. The dashboard updates charts, summaries, and insights.

## Delivery Plan

### Phase 1

- auth
- database setup
- create, read, update, delete shifts
- dashboard summary cards

### Phase 2

- charts
- filters
- shift history table

### Phase 3

- advanced analytics
- goal tracking
- export and import

### Phase 4

- mobile polish
- PWA support
- AI-generated insights

## Post-MVP Features

These should stay out of the first release unless they become necessary:

- CSV export
- spreadsheet import
- recurring shift templates
- calendar view
- tax estimate mode
- goal tracking
- quick mobile entry polish
- offline support
- event tags such as holiday, weather, or private party
- AI-generated insights from shift history

## Product Naming

Current name candidates:

- TipTrack
- ShiftTips
- TipLedger
- TipPulse
- ShiftStats
- EarnPerHour

Strongest options so far:

- TipPulse
- ShiftStats

## Confirmed Workspace Notes

- workspace path: `/home/rlong/Sandbox/shiftstats`
- current workspace contains `.venv/`, `.vscode/settings.json`, and `.gitignore`
- the local Python environment is project-specific and not shared with `deadpool`
- `.gitignore` currently ignores `.venv/`

These notes are operational only. The actual app stack is expected to be Next.js-based.

## Immediate Next Planning Tasks

Before writing code, lock these down:

1. final shift field list for the database and form
2. exact dashboard widgets for the MVP
3. exact chart list for the MVP
4. auth choice
5. first-pass page structure
6. Prisma schema and route or server action plan

## Current Build Recommendation

Build the first version with:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- Prisma
- PostgreSQL
- Vercel
- Neon

This is the cleanest path to a practical MVP with room to grow.
