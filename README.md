<div align="center">

# 🍔 CampusEats

### Good food, zero waiting.

**A campus food-ordering app for VIT-AP Food Street — pre-order from campus stalls, skip the queue, and get your food by self-pickup or student delivery.**

[![Download APK](https://img.shields.io/badge/Download-APK-orange?style=for-the-badge&logo=android)](https://github.com/jomkarrr/CampusEats/releases/latest)
[![Latest Release](https://img.shields.io/github/v/release/jomkarrr/CampusEats?style=for-the-badge)](https://github.com/jomkarrr/CampusEats/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/jomkarrr/CampusEats/total?style=for-the-badge)](https://github.com/jomkarrr/CampusEats/releases)

![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)

</div>

---

## 📖 About

Food Street at VIT-AP is crowded at exactly the times students are hungriest — and the break between classes is short. **CampusEats** fixes that: browse every stall's live menu, order ahead from multiple stalls in one flow, and either pick up your food when it's ready or get it delivered by a fellow student.

Students can also earn as **delivery partners** — a flat **₹20 per delivered order**.

---

## ✨ Features

### 🎓 For Students
- Browse all Food Street stalls & external vendors with live menus
- **Category filters** — Pizza, Biryani, Thali, Beverages & more, across all stalls
- Search dishes and stalls, view dish details with photos & veg/non-veg info
- Cart with quantity controls, single-stall cart protection
- Checkout with **Pickup or Delivery** — pay on pickup/delivery via **UPI or Cash**
- **Live order tracking** — Placed → Accepted → Preparing → Ready → Delivered
- Order history and re-order friendly profile

### 🛵 For Delivery Partners
- Go online/offline, see the pool of ready orders
- Accept → Pick up → Deliver flow with one-tap status updates
- Earnings dashboard — flat **₹20 per delivery**

### 🏪 Outlet Mode (Demo)
- Stall-side order queue: accept incoming orders and advance them
  through Preparing → Ready, reflected to customers in realtime

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native + **Expo (SDK 58)** with **Expo Router** |
| Language | **TypeScript** (strict) |
| Backend | **Supabase** — Auth, PostgreSQL, Row-Level Security, Realtime |
| Styling | Custom design system (Google Stitch design, Plus Jakarta Sans) |
| State | React Context (Auth + Cart), AsyncStorage session persistence |
| Build & release | **EAS Build** (Android APK) |

---

## 📱 Download & Install

1. Open the [**latest release**](https://github.com/jomkarrr/CampusEats/releases/latest)
2. Download the `.apk` from **Assets**
3. On your phone, allow **"Install from unknown sources"** and install

> Requires an internet connection — all menus, orders and tracking are live from Supabase.

---

## 🚀 Run Locally

**Prerequisites:** Node.js 18+, Git, Expo Go app (for device testing)

```bash
# 1. Clone
git clone https://github.com/jomkarrr/CampusEats.git
cd CampusEats

# 2. Install dependencies
npm install

# 3. Create .env.local with your Supabase project keys
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 4. Start the dev server
npx expo start
```

Scan the QR code with **Expo Go** to run the app on your phone.

### Database setup (Supabase)
Run the SQL files in **Supabase Dashboard → SQL Editor**, in order:

1. `supabase/schema.sql` — tables & base policies
2. `supabase/migrations/06_final_working_app.sql` — final RLS policy set + payment columns
3. `supabase/seed_v2.sql` — demo data (5 outlets, 45 menu items)

### Build the APK (EAS)

```bash
eas build -p android --profile preview
```

---

## 🗂️ Project Structure

```
CampusEats/
├── app/
│   ├── (auth)/            # Login, sign-up, choose-purpose (Student / Partner)
│   ├── (student)/         # Student app (Stack)
│   │   ├── (tabs)/        # Explore, Search, Orders, Profile
│   │   ├── outlet/[id]    # Stall menu
│   │   ├── item/[id]      # Dish detail & add-to-cart
│   │   ├── cart.tsx       # Cart & bill
│   │   ├── checkout.tsx   # Fulfilment + place order
│   │   ├── order-confirmed.tsx
│   │   └── outlet-orders.tsx   # Outlet Mode (demo)
│   └── (partner)/         # Delivery partner: requests, active, earnings
├── context/               # Auth & Cart providers
├── lib/                   # Supabase client, DB types, helpers
├── constants/             # Theme (colors, fonts, spacing)
└── supabase/              # Schema, migrations & seed data
```

---

## 👥 Team

Built by **Team CampusEats** at VIT-AP University — Omkar Jadhav, Eishaan & Shaurya.
Born as a venture project for the Wadhwani Foundation *Ignite* entrepreneurship programme.

<div align="center">

**Good food, zero waiting. 🍔**

</div>
