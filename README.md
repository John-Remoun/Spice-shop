# 🌿 Botanica Micro-ERP — Herbal, Spice & Natural Cosmetics Enterprise System

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![i18next](https://img.shields.io/badge/i18next-23.x-26A69A?style=for-the-badge&logo=i18next&logoColor=white)](https://www.i18next.com/)

---

## 📌 Executive Overview

**Botanica Micro-ERP** is a specialized, production-grade manufacturing, inventory management, and POS enterprise system custom-built for artisanal herbal, spice, essential oil, and natural cosmetics factory-shops. 

The platform bridges complex manufacturing formulas (Bill of Materials), raw material and packaging inventory tracking, multi-tier pricing, dynamic POS sales checkout, fixed monthly operational expenses, daily/monthly business calendar reports, and automated multi-user email notifications into a unified, high-aesthetic application.

---

## 🏗️ System Architecture

```
                          ┌─────────────────────────┐
                          │     Botanica Web App    │
                          │  React 18 + Vite (PWA)  │
                          │  TanStack Query + i18n  │
                          └────────────┬────────────┘
                                       │ REST API (Bearer JWT + HttpOnly Refresh Cookie)
                          ┌────────────▼────────────┐
                          │   Express backend API   │
                          │ Node.js + TS + Mongoose │
                          │ Auth / ERP Business Logic│
                          └────────────┬────────────┘
                                       │ Mongoose ODM / ACIDs Transactions
                          ┌────────────▼────────────┐
                          │     MongoDB Cluster     │
                          │  Users, RawMaterials,   │
                          │  Packaging, Formulas,   │
                          │  Batches, Sales,        │
                          │  Expenses, Settings     │
                          └─────────────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
             Automated Email Reports          Web Push / PWA Alerts
             (Nodemailer Transport)           (Nodemailer / VAPID)
```

---

## ✨ Core Domain Modules & Features

### 📦 1. Raw Materials & Packaging Inventory (المواد الخام ومواد التعبئة)
- **Base Unit Normalization**: Standardizes all incoming purchases into base units (`g` for solids, `ml` for liquids, integer `pcs` for packaging items like bottles, bags, sprayers, jars).
- **Weighted Average Cost (WAC)**: Recomputes unit cost dynamically upon logging supply shipments:
  $$\text{New WAC} = \frac{(\text{Current Stock} \times \text{Current WAC}) + (\text{Incoming Qty} \times \text{Unit Cost})}{\text{Current Stock} + \text{Incoming Qty}}$$

### 🧪 2. Product Formulas & BOM (التركيبات والتصنيع)
- **Bill of Materials (BOM)**: Links $N$ raw materials and $M$ packaging items to produce a defined batch yield (`yieldQty`).
- **Multi-Tiered Pricing Engine**: Supports 3 distinct pricing levels for each product (**Price 1 / Price 2 / Price 3** — e.g. Retail, Wholesale, Distributor) alongside live yield cost calculations and profit margin estimations.

### 🏭 3. Batch Production Engine (عمليات التصنيع والإنتاج)
- **Atomic Execution**: Uses MongoDB Sessions and Multi-Document ACIDs Transactions to deduct raw materials/packaging and increment finished product inventory in a single atomic write.
- **Shortage Safety**: Prevents partial stock deductions. If any single material is insufficient, the production batch fails safely with a detailed shortage report.

### 🛒 4. Point of Sale & Dynamic Checkout (نقطة البيع والمبيعات)
- **Flexible Pricing**: Cashiers can select preset price tiers (Price 1/2/3), override unit prices, or set custom total amounts.
- **Customer Ledger & Debt Settlement**: Real-time tracking of paid, unpaid, and partial invoices, customer account statements modal, and favorite customer management.
- **Thermal Receipt Printing**: Printable invoice modal formatted for standard thermal POS printers.

### 📅 5. Expenses & Report Calendar (التقويم والمصاريف الثابتة)
- **Fixed Monthly Expenses (المصاريف الثابتة)**: Track recurring monthly operational expenses (e.g. Rent, Utilities) with auto-numbering, automatic month rollover resets, and inclusion in daily and monthly P&L summaries.
- **Automated Email Reports**: Send comprehensive daily and monthly performance summaries via email to all registered system users with a single click.

### 🌍 6. Dynamic i18n & Aesthetic Theme System
- **100% Arabic & English Parity**: Seamless dynamic language switching (`ar` RTL / `en` LTR) across all pages, forms, modals, tables, and formatters using `i18next`.
- **Botanical Theme Palette**: Hand-crafted CSS design system supporting custom Dark Mode (`#121814` / `#1C241F`) and Light Mode (`#F4EFE6` / `#EAE3D2`).

---

## 🛠️ Repository Structure

```
Spice shop/
├── backend/                  # Node.js + Express + TypeScript API Server
│   ├── src/
│   │   ├── config/           # Database & environment configurations
│   │   ├── controllers/      # Request handlers (Auth, Sales, Production, Reports, etc.)
│   │   ├── middleware/       # JWT Auth, Role checking, Zod validator middleware
│   │   ├── models/           # Mongoose ODM data schemas
│   │   ├── routes/           # RESTful API route declarations
│   │   ├── services/         # Business logic & atomic DB transaction services
│   │   ├── scripts/          # Database seeding scripts (Admin bootstrap)
│   │   └── server.ts         # Express server startup entrypoint
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React 18 + Vite + Tailwind CSS Single Page Application
│   ├── src/
│   │   ├── components/       # Reusable UI components & Calendar Widget
│   │   ├── hooks/            # Custom React hooks (useAuth, useSettings, usePagination)
│   │   ├── i18n/             # Localization configs & AR/EN locale JSONs
│   │   ├── layouts/          # AppShell sidebar layout & ProtectedRoute guards
│   │   ├── pages/            # View pages (Dashboard, Inventory, POS, Settings, etc.)
│   │   └── lib/              # Axios API client & utility functions
│   ├── package.json
│   └── vite.config.ts
└── README.md                 # Monorepo Master Documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20.x or higher
- **MongoDB**: v6.0+ (Replica Set required for transactions; MongoDB Atlas recommended)
- **npm**: v9.x or higher

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-org/botanica-erp.git
cd "Spice shop"

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Environment Configuration
Create `.env` in `backend/`:
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/botanica-erp?replicaSet=rs0
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

Create `.env` in `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 3. Seed Database & Run Development Servers
```bash
# Seed initial admin account (admin / 9999) & global settings
cd backend
npm run seed

# Start backend development server (Port 4000)
npm run dev

# In a separate terminal, start frontend development server (Port 5173)
cd frontend
npm run dev
```

---

## 🛡️ License & Credits

Built with ❤️ for Botanica Micro-ERP. Dedicated to artisanal quality, precision manufacturing, and streamlined management.
