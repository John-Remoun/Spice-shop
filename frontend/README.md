# 🎨 Frontend — Botanica Micro-ERP Web Application

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.x-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![Zustand](https://img.shields.io/badge/Zustand-4.x-443E38?style=for-the-badge&logo=react&logoColor=white)](https://github.com/pmndrs/zustand)
[![i18next](https://img.shields.io/badge/i18next-23.x-26A69A?style=for-the-badge&logo=i18next&logoColor=white)](https://www.i18next.com/)

The frontend client application for **Botanica Micro-ERP**. Designed with React 18, Vite, TypeScript, and Tailwind CSS, featuring full Arabic (RTL) / English (LTR) internationalization, dark/light theme options, dynamic POS, and an interactive business calendar.

---

## 💻 Directory Structure

```
frontend/
├── src/
│   ├── components/               # UI components
│   │   ├── dashboard/
│   │   │   └── CalendarWidget.tsx # Calendar, Fixed Expenses & Report Modals
│   │   ├── Footer.tsx            # Footer component
│   │   └── Pagination.tsx        # Reusable pagination component
│   ├── hooks/                    # React Hooks
│   │   ├── useAuth.ts            # Authentication state & login/logout actions
│   │   ├── usePagination.ts      # Client-side pagination logic
│   │   └── useSettings.ts        # App store settings hook
│   ├── i18n/                     # Internationalization System
│   │   ├── locales/
│   │   │   ├── ar.json           # Arabic Translations
│   │   │   └── en.json           # English Translations
│   │   └── index.ts              # i18next configuration & dir switcher
│   ├── layouts/
│   │   ├── AppShell.tsx          # Main sidebar, header bar, and layout wrapper
│   │   └── ProtectedRoute.tsx    # Auth guard wrapper for protected pages
│   ├── lib/
│   │   └── api-client.ts         # Axios client instance with token interceptors
│   ├── pages/                    # Main Application Pages
│   │   ├── DashboardPage.tsx     # Overview metrics, alerts & quick actions
│   │   ├── FinishedProductsPage.tsx # Products catalog & Price 1/2/3 setup
│   │   ├── FormulasPage.tsx      # BOM Formulas builder & Live yield calculator
│   │   ├── LoginPage.tsx         # Login view & OTP reset password modal
│   │   ├── PackagingPage.tsx     # Packaging materials & supply logger
│   │   ├── ProductionPage.tsx    # Batch production trigger page
│   │   ├── RawMaterialsPage.tsx  # Raw materials stock & supply logger
│   │   ├── SalesPage.tsx         # Point of Sale (POS) checkout interface
│   │   └── SettingsPage.tsx      # Factory settings & user accounts management
│   ├── store/                    # Zustand Stores
│   │   ├── auth.store.ts         # In-memory authentication state store
│   │   └── theme.store.ts        # LocalStorage persisted theme store
│   ├── App.tsx                   # Main router configuration
│   ├── index.css                 # Global CSS styles & botanical utility classes
│   └── main.tsx                  # Application entry point
├── index.html
├── postcss.config.js
├── tailwind.config.ts            # Botanical color palette & typography setup
├── tsconfig.json
└── vite.config.ts                # Vite & PWA build plugin config
```

---

## 🌐 Internationalization (i18n & RTL/LTR)

- **Default Language**: Arabic (`ar`, RTL).
- **Secondary Language**: English (`en`, LTR).
- **Dynamic Direction Handling**: `src/i18n/index.ts` monitors language toggling and dynamically adjusts:
  - `<html dir="rtl" lang="ar">` or `<html dir="ltr" lang="en">`
  - Font families (`Cairo` for Arabic script, `Inter` for Latin script).
  - Logical flex directions and text alignment.
- **Key Parity**: Both `ar.json` and `en.json` maintain 100% key parity across all modules.

---

## 🎨 Botanical Design & Dark Mode System

Custom CSS variable palette declared in `index.css` and `tailwind.config.ts`:

| Token | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--bg-primary` | `#F4EFE6` | `#121814` | Page main background |
| `--bg-surface` | `#FFFFFF` | `#1C241F` | Cards, Modals, Tables |
| `--border-color` | `#E2DBD0` | `#2D3830` | Borders & Dividers |
| `--text-primary` | `#1E2822` | `#F4EFE6` | Main text & Headings |
| `--text-secondary` | `#5C6E63` | `#A8A296` | Subtitles & Labels |
| `--accent-green` | `#2E5A44` | `#5E9C76` | Primary action buttons |

---

## 🚀 Build & Development

```bash
# Start Vite development server
npm run dev

# Run TypeScript compilation check
npx tsc --noEmit

# Build production bundle
npm run build

# Preview production build
npm run preview
```
