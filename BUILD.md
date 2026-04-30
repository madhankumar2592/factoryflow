# FactoryFlow — Project Build Reference

> Complete technical reference for the FactoryFlow MVP.
> Read this before making any changes to the codebase.

---

## Project Overview

| Field | Value |
|-------|-------|
| **App Name** | FactoryFlow |
| **Type** | B2B SaaS — mobile + web (single codebase) |
| **First Customer** | Mold Tech Diecasting, Coimbatore |
| **Industry** | Aluminium die casting manufacturing |
| **Purpose** | Replace paper-based delivery challans and shift logs with a digital system |
| **MVP Status** | Phase 1 complete — forms + lists + dashboard |
| **Phase 2 (future)** | PDF generation, push notifications, analytics/charts |

---

## Business Context

Mold Tech Diecasting operates like this:

```
Supplier → [Inbound DC] → Factory → [Production Log] → Finished Parts → [Outbound DC] → Client
```

1. **Inbound DC** — Raw aluminium ingots arrive from suppliers. Supervisor logs the delivery challan (weight, rate, supplier details).
2. **Production Log** — Supervisor logs each shift: how much material was consumed, how many good parts made, how many rejected.
3. **Outbound DC** — Finished die-cast parts are dispatched to clients. Supervisor logs the outbound challan (quantity, value, vehicle).
4. **Owner Dashboard** — Factory owner monitors today's totals from desktop: material in, good production, rejects, efficiency %, goods out.

---

## Tech Stack

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Framework | React Native + Expo | SDK 54 | Single codebase for iOS, Android, Web |
| Navigation | Expo Router | v6 | File-based routing, works on web too |
| Backend | Supabase | Latest | PostgreSQL + Auth + RLS out of the box |
| State | Zustand | v5 | Lightweight, no boilerplate |
| Language | TypeScript | ~5.9 | Type safety for DB models |
| Build tool | EAS CLI | v18.4.0 | Already installed |
| Web support | react-native-web | ^0.21 | Renders RN components on web |

---

## User Roles

| Role | Device | What they do |
|------|--------|-------------|
| `supervisor` | Mobile (iPhone / Android) | Log inbound DCs, production, outbound DCs |
| `owner` | Desktop browser | View dashboard, browse all records |

Role is stored in the `profiles` table and set at user creation via Supabase metadata. The root layout reads the role after login and redirects to the correct tab group.

---

## Architecture

### Navigation Structure (Expo Router)

```
app/
├── _layout.tsx              ← Root: checks auth, redirects by role
├── (auth)/
│   └── login.tsx            ← Public screen
├── (supervisor)/            ← Protected: role = 'supervisor'
│   ├── _layout.tsx          ← Tab navigator
│   ├── index.tsx            ← Home
│   ├── inbound-dc.tsx       ← Form
│   ├── production-log.tsx   ← Form
│   └── outbound-dc.tsx      ← Form
└── (owner)/                 ← Protected: role = 'owner'
    ├── _layout.tsx          ← Tab navigator
    ├── index.tsx            ← Dashboard
    ├── inbound-dcs.tsx      ← List
    ├── production-logs.tsx  ← List
    └── outbound-dcs.tsx     ← List
```

### Auth Flow

```
App starts
    ↓
Root layout: check Supabase session
    ↓ session exists?
   Yes → loadProfile() → check role
              ↓
         role = 'owner'      → redirect /(owner)
         role = 'supervisor' → redirect /(supervisor)
    No → redirect /(auth)/login
```

### State Management

Only one Zustand store: `authStore`

```
authStore {
  user        ← Supabase auth.User object
  profile     ← profiles row joined with companies
  loading     ← boolean for login button state
  signIn()    ← calls supabase.auth.signInWithPassword
  signOut()   ← clears session + resets state
  loadProfile() ← fetches profiles + companies join
  setUser()   ← called by auth state listener
}
```

All other data (suppliers, jobs, DCs, etc.) is fetched directly inside each screen component with `useEffect` — no additional stores needed for MVP.

### Multi-tenancy

Every table has a `company_id` column. Row Level Security (RLS) is enabled on all tables. A helper function `get_my_company_id()` reads the current user's company from the `profiles` table. All policies filter by `company_id = get_my_company_id()`, so users can only ever see their own company's data — even if they share the same Supabase project.

---

## Database Schema

### Tables

#### `companies`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Company name |
| gstin | text | GST number |
| address | text | Full address |
| created_at | timestamptz | Auto |

#### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK → auth.users |
| company_id | uuid | FK → companies |
| role | text | `'owner'` or `'supervisor'` |
| full_name | text | Display name |
| created_at | timestamptz | Auto |

> Profile rows are auto-created by a trigger `on_auth_user_created` when a new user signs up. The trigger reads `role`, `company_id`, and `full_name` from user metadata.

#### `suppliers`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| name | text | Supplier name |
| gstin | text | Optional |
| address | text | Optional |

#### `clients`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| name | text | Client name |
| gstin | text | Optional |
| address | text | Optional |

#### `jobs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| client_id | uuid | FK → clients |
| item_name | text | e.g. "Gear Housing - Aluminium" |
| hsn_code | text | Optional |
| status | text | `'running'` / `'paused'` / `'completed'` |

> Supervisors see only `status = 'running'` jobs in dropdowns.

#### `inbound_dcs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| supplier_id | uuid | FK → suppliers |
| challan_no | text | e.g. "7180" |
| challan_date | date | From the physical DC |
| item_desc | text | e.g. "ALUMINIUM INGOTS ADC 12" |
| hsn_sac | text | e.g. "76012010" |
| quantity_kg | numeric | Weight received |
| rate_per_kg | numeric | Optional |
| amount | numeric | Auto = qty × rate, but editable |
| reference_no | text | Optional |
| eway_bill_no | text | Optional |
| nature_of_processing | text | Optional |
| created_by | uuid | FK → auth.users |
| created_at | timestamptz | Auto |

#### `production_logs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| job_id | uuid | FK → jobs |
| inbound_dc_id | uuid | Optional FK → inbound_dcs |
| material_consumed_kg | numeric | Raw material used this shift |
| good_qty | integer | Accepted parts count |
| reject_qty | integer | Rejected parts count (default 0) |
| notes | text | Optional shift notes |
| created_by | uuid | FK → auth.users |
| created_at | timestamptz | Auto |

> Efficiency = `good_qty / (good_qty + reject_qty) × 100` — calculated in app, not stored.

#### `outbound_dcs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK → companies |
| client_id | uuid | FK → clients |
| job_id | uuid | Optional FK → jobs |
| dc_no | text | e.g. "2271" |
| dc_date | date | Dispatch date |
| item_desc | text | Description of goods |
| hsn_code | text | Optional |
| quantity | numeric | Pieces dispatched |
| value | numeric | Value of goods (₹) |
| vehicle_no | text | e.g. "TN 37 AB 1234" |
| eway_bill_no | text | Optional |
| party_dc_no | text | Client's DC number |
| order_no | text | Client's order number |
| created_by | uuid | FK → auth.users |
| created_at | timestamptz | Auto |

### Entity Relationship

```
companies
    ├── profiles (users)
    ├── suppliers
    ├── clients
    │     └── jobs
    ├── inbound_dcs → suppliers
    ├── production_logs → jobs, inbound_dcs
    └── outbound_dcs → clients, jobs
```

---

## Screen Specifications

### Screen 1 — Login (`app/(auth)/login.tsx`)
- Email + password inputs
- Full-width black "LOG IN" button
- On success: fetches profile → redirects by role
- No sign-up screen — accounts created manually by owner in Supabase dashboard

### Screen 2 — Supervisor Home (`app/(supervisor)/index.tsx`)
- Header: "Good morning/afternoon/evening, [first name]" + today's date
- Three full-width black action cards (stacked vertically):
  - LOG INBOUND DC — shows today's count
  - LOG PRODUCTION — shows today's count
  - LOG OUTBOUND DC — shows today's count
- Counts refresh on every mount

### Screen 3 — Inbound DC Form (`app/(supervisor)/inbound-dc.tsx`)
- Supplier selector (horizontal chip scroll)
- Challan No, Challan Date, Item Description
- HSN/SAC Code (optional)
- Quantity (KG), Rate per KG (optional)
- Amount — auto-calculated as `qty × rate`, displayed prominently, still editable
- E-Way Bill No, Nature of Processing, Reference No (all optional)
- SAVE button → inserts to `inbound_dcs` → success alert → back

### Screen 4 — Production Log Form (`app/(supervisor)/production-log.tsx`)
- Job selector (vertical cards, running jobs only)
- Inbound DC selector (horizontal chips, recent 10)
- Material Consumed (KG), Good Qty, Reject Qty
- Live efficiency display: updates as user types, green ≥ 90%, orange < 90%
- Notes (optional)
- SAVE → inserts to `production_logs`

### Screen 5 — Outbound DC Form (`app/(supervisor)/outbound-dc.tsx`)
- Client selector (horizontal chips)
- Job selector (appears after client selected — running jobs for that client only)
- DC No, DC Date, Item Description
- HSN Code, Quantity, Value of Goods
- Vehicle No, E-Way Bill No, Party's DC No, Order No (optional)
- SAVE → inserts to `outbound_dcs`

### Screen 6 — Owner Dashboard (`app/(owner)/index.tsx`)
- Today's summary cards (flex-wrap grid):
  - Total Material In (KG)
  - Good Production (pcs) — green
  - Rejects (pcs) — red
  - Efficiency (%) — green/orange
  - Outbound DCs (count)
- Recent activity feed: last entries across all 3 tables, type-badged rows
- Pull-to-refresh
- Sign out button

### Screens 7–9 — List Screens (`app/(owner)/`)
- Header with title + "Today only / Show all" toggle
- Pull-to-refresh
- Each row: date, reference number, party name, quantity
- Tap row to expand full details
- Default filter: today only

---

## Component Reference

### `FormField`
Reusable labeled input. Props: `label`, `optional`, plus all `TextInputProps`.
- Height 52px, font size 16px — large enough for gloved hands
- Label renders uppercase with letter-spacing

### `SummaryCard`
Dashboard stat card. Props: `title`, `value`, `unit`, `color`.
- flex: 1 with minWidth 140 — wraps naturally on mobile

### `DCListItem`
Expandable list row. Props: `date`, `reference`, `party`, `quantity`, `details`.
- `details` is `Record<string, string | number | undefined>` — undefined values are hidden
- Tap toggles expanded state showing all detail key-value pairs

### `LoadingSpinner`
Full-screen centered ActivityIndicator. Used while fetching initial data.

---

## Design System (`constants/theme.ts`)

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| primary | #000000 | Buttons, active states |
| background | #FFFFFF | Screen backgrounds |
| surface | #F5F5F5 | Input backgrounds, cards |
| surfaceSecondary | #EBEBEB | Alternating rows |
| border | #D1D1D1 | Input borders, dividers |
| textPrimary | #000000 | Main text |
| textSecondary | #6E6E73 | Labels, subtitles |
| textTertiary | #AEAEB2 | Placeholders, hints |
| success | #34C759 | Good production, high efficiency |
| danger | #FF3B30 | Rejects, sign out |
| warning | #FF9500 | Low efficiency |

### Spacing scale
`xs=4, sm=8, md=16, lg=24, xl=32, xxl=48`

### Border radius
`sm=8, md=12, lg=16, xl=20`

### Font sizes
`xs=12, sm=14, md=16, lg=18, xl=22, xxl=28, hero=36`

### Design rules
- Supervisor (mobile): min button height 56px, input height 52px, one action per screen
- Owner (web): max-width 1200px centered, summary cards in flex-wrap grid, alternating row shading

---

## Key Business Logic

### Auto-calculate Amount (Inbound DC)
```
amount = quantity_kg × rate_per_kg
```
Recalculates live as user types either field. User can still override by editing the amount field directly.

### Live Efficiency (Production Log)
```
efficiency = (good_qty / (good_qty + reject_qty)) × 100
```
- Shown in real-time as user types
- Green border when ≥ 90%
- Orange border when < 90%
- Hidden when both quantities are 0

### Date defaults
All date fields default to today: `new Date().toISOString().split('T')[0]`

### Today filter on list screens
- Default: shows only records where `challan_date` / `dc_date` = today, or `created_at` ≥ today
- Toggle button switches to "show all" (no date filter)

---

## Environment Variables

File: `.env` in project root

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
```

- Prefix `EXPO_PUBLIC_` is required for Expo to expose these to the client bundle
- Never commit real keys to git — `.env` is already in `.gitignore`

---

## Adding New Suppliers / Clients / Jobs

Currently there is no in-app UI for managing master data (suppliers, clients, jobs). Add them directly in Supabase:

1. Supabase Dashboard → **Table Editor**
2. Select the table (`suppliers`, `clients`, or `jobs`)
3. Click **Insert row**
4. Make sure `company_id` matches `aaaaaaaa-0000-0000-0000-000000000001` (Mold Tech)

This is intentional for Phase 1 — a master data management UI can be added in a future phase.

---

## Running the App

```bash
cd D:\CodeBase\FactoryFlow

# Web (owner dashboard — best tested here)
npx expo start --web

# Mobile (supervisor screens — use Expo Go app)
npx expo start
# Scan the QR code with your phone camera (iOS) or Expo Go (Android)

# Android emulator
npx expo start --android

# iOS simulator (Mac only)
npx expo start --ios
```

---

## Building for Production (EAS)

EAS CLI is already installed (v18.4.0).

```bash
# First time: log in and configure
eas login
eas build:configure

# Build for Android (APK for internal testing)
eas build --platform android --profile preview

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile preview

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

Create `eas.json` in project root for build profiles when ready.

---

## Phase 2 Roadmap (Not Built Yet)

| Feature | Notes |
|---------|-------|
| PDF generation | Generate printable Delivery Challans from logged data |
| Push notifications | Alert owner when new DC is logged |
| Analytics / Charts | Weekly/monthly production trends |
| Master data UI | In-app screens to add suppliers, clients, jobs |
| Date picker UI | Replace text date inputs with native date picker |
| Search & filter | Search by challan number, supplier, date range |
| Offline support | Queue entries when no internet, sync later |

---

## Project Decisions & Rationale

| Decision | Reason |
|----------|--------|
| Expo Router over React Navigation | Built-in web support, file-based = less boilerplate |
| Zustand over Redux | Factory floor supervisors don't need complex global state |
| Supabase over custom backend | RLS handles multi-tenancy, Auth is built-in, free tier is generous |
| No sign-up screen | B2B product — owner creates accounts manually to control access |
| No Redux / Context for data | Each screen fetches its own data — simpler, fewer re-render issues |
| Amount is editable despite auto-calc | Real DCs sometimes have rounding differences — supervisor must be able to correct |
| Phase 2 (PDF) explicitly excluded | Prevents scope creep; paper DC is still used alongside digital for now |

---

*FactoryFlow Build Reference v1.0*
*First customer: Mold Tech Diecasting, Coimbatore*
*Blueprint: D:\Documents\MK\Idea\FactoryFlow_Build_md_claude.pdf*
