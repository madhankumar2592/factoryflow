# FactoryFlow

> B2B SaaS app for aluminium die casting factory operations.  
> Built for **Mold Tech Diecasting, Coimbatore**.

---

## What is FactoryFlow?

FactoryFlow digitises the daily operations of a die casting factory:

- **Supervisors** log raw material received, shift production output, and goods dispatched — on their phone
- **Owner** monitors everything in real time from a desktop browser

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile + Web | React Native + Expo (SDK 54) |
| Navigation | Expo Router v6 (file-based) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| State | Zustand |
| Language | TypeScript |
| Build | EAS CLI |

---

## Prerequisites

Make sure you have these installed before starting:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- [Expo Go](https://expo.dev/go) app on your phone (for mobile testing)
- A [Supabase](https://supabase.com) account

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/madhankumar2592/factoryflow.git
cd factoryflow
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → create a new project
2. In **SQL Editor**, run the full schema from [`SETUP.md`](./SETUP.md#step-2--apply-the-database-schema)
3. Run the seed data from [`SETUP.md`](./SETUP.md#step-3--insert-seed-data-test-data)
4. Create users as described in [`SETUP.md`](./SETUP.md#step-4--create-user-accounts)

### 4. Add environment variables

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from: **Supabase → Project Settings → API**

### 5. Run the app

```bash
# Web browser (Owner dashboard)
npx expo start --web

# Mobile via Expo Go (Supervisor screens)
npx expo start
# Then scan the QR code with your phone
```

> **Note:** If your phone and PC are on different networks (e.g. phone hotspot), use tunnel mode:
> ```bash
> npx expo start --tunnel
> ```

---

## User Roles

| Role | Device | Access |
|------|--------|--------|
| `owner` | Desktop browser | Dashboard, all DC lists |
| `supervisor` | Mobile (iOS/Android) | Log Inbound DC, Production, Outbound DC |

Role is assigned when creating a user account in Supabase.

---

## Login

No self sign-up. Accounts are created manually in **Supabase → Authentication → Users**.

After creating a user, insert their profile via SQL:

```sql
-- Owner
insert into profiles (id, company_id, role, full_name)
select id, 'aaaaaaaa-0000-0000-0000-000000000001', 'owner', 'Name'
from auth.users where email = 'owner@example.com';

-- Supervisor
insert into profiles (id, company_id, role, full_name)
select id, 'aaaaaaaa-0000-0000-0000-000000000001', 'supervisor', 'Name'
from auth.users where email = 'supervisor@example.com';
```

---

## Project Structure

```
factoryflow/
├── app/
│   ├── _layout.tsx              # Root layout — auth redirect
│   ├── (auth)/login.tsx         # Login screen
│   ├── (supervisor)/            # Supervisor tab screens (mobile)
│   │   ├── index.tsx            # Home — 3 action buttons
│   │   ├── inbound-dc.tsx       # Log inbound delivery challan
│   │   ├── production-log.tsx   # Log shift production
│   │   └── outbound-dc.tsx      # Log outbound delivery challan
│   └── (owner)/                 # Owner tab screens (web)
│       ├── index.tsx            # Dashboard with summary cards
│       ├── inbound-dcs.tsx      # All inbound DC records
│       ├── production-logs.tsx  # All production records
│       └── outbound-dcs.tsx     # All outbound DC records
├── components/
│   ├── FormField.tsx            # Labelled input field
│   ├── SummaryCard.tsx          # Dashboard stat card
│   ├── DCListItem.tsx           # Expandable list row
│   ├── LoadingSpinner.tsx       # Full screen loader
│   └── Toast.tsx                # Success / error toast
├── lib/
│   ├── supabase.ts              # Supabase client
│   └── auth.ts                  # Auth helpers
├── stores/authStore.ts          # Zustand auth store
├── types/index.ts               # TypeScript types
├── constants/theme.ts           # Design tokens
├── SETUP.md                     # Step-by-step setup guide
└── BUILD.md                     # Full technical reference
```

---

## Key Features

- ✅ Role-based login — owner lands on dashboard, supervisor on home
- ✅ Inbound DC form — auto-calculates amount (qty × rate)
- ✅ Production log — live efficiency % as you type
- ✅ Outbound DC form — client + job linked dropdowns
- ✅ Owner dashboard — real-time summary cards + activity feed
- ✅ Pull-to-refresh on all list screens
- ✅ Today / All filter on list screens
- ✅ Toast notifications on save
- ✅ Multi-tenant with Row Level Security (RLS)

---

## Building for Production

### Android APK

```bash
eas build --platform android --profile preview
```

### iOS

```bash
eas build --platform ios --profile preview
```

### Web deployment

```bash
npx expo export --platform web
```
Then deploy the `dist/` folder to [Netlify](https://netlify.com) or [Vercel](https://vercel.com).

---

## Reference Docs

- [`SETUP.md`](./SETUP.md) — Full setup guide with SQL scripts
- [`BUILD.md`](./BUILD.md) — Technical architecture and design decisions

---

## Phase 2 Roadmap

- [ ] PDF generation of Delivery Challans
- [ ] Push notifications to owner
- [ ] Analytics and weekly charts
- [ ] In-app master data management (add suppliers, clients, jobs)
- [ ] Native date picker
- [ ] Offline support with sync

---

*FactoryFlow v1.0 — Built for Mold Tech Diecasting, Coimbatore*
