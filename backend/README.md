# ⚙️ Backend — Botanica Micro-ERP API Server

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-8.x-880000?style=for-the-badge&logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![Zod](https://img.shields.io/badge/Zod-3.23-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)

The backend service for **Botanica Micro-ERP**. Built with Node.js, Express, TypeScript, and MongoDB/Mongoose, providing robust RESTful APIs, ACIDs transaction-backed business logic, authentication with JWT + Refresh Tokens, and automated email reporting.

---

## 🛠️ Architecture & Directory Tree

```
backend/
├── src/
│   ├── config/               # Database connection & env variables loader
│   │   └── db.ts
│   ├── controllers/          # HTTP request handlers & response formatters
│   │   ├── auth.controller.ts
│   │   ├── expense.controller.ts
│   │   ├── favoriteCustomer.controller.ts
│   │   ├── finishedProduct.controller.ts
│   │   ├── formula.controller.ts
│   │   ├── packaging.controller.ts
│   │   ├── productionBatch.controller.ts
│   │   ├── rawMaterial.controller.ts
│   │   ├── report.controller.ts
│   │   ├── sale.controller.ts
│   │   ├── setting.controller.ts
│   │   └── user.controller.ts
│   ├── middleware/           # Security, Auth Guard & Zod Request Validator
│   │   ├── auth.middleware.ts
│   │   └── validate.middleware.ts
│   ├── models/               # Mongoose Schemas & TypeScript interfaces
│   │   ├── User.ts
│   │   ├── RawMaterial.ts
│   │   ├── Packaging.ts
│   │   ├── ProductFormula.ts
│   │   ├── FinishedProduct.ts
│   │   ├── ProductionBatch.ts
│   │   ├── Sale.ts
│   │   ├── Expense.ts
│   │   ├── FavoriteCustomer.ts
│   │   └── Setting.ts
│   ├── routes/               # API route definitions
│   │   ├── index.ts          # Central router mounting all sub-routes
│   │   └── *.routes.ts
│   ├── services/             # Core ERP services (WAC, BOM calculation, ACIDs batches)
│   │   ├── alert.service.ts
│   │   ├── email.service.ts
│   │   ├── formulaCost.service.ts
│   │   ├── productionBatch.service.ts
│   │   ├── purchasing.service.ts
│   │   └── sale.service.ts
│   ├── scripts/              # Database seed script
│   │   └── seed.ts
│   ├── types/                # Shared enums and types
│   ├── app.ts                # Express app setup, CORS, JSON body parser
│   └── server.ts             # Process listener & DB connection entrypoint
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 📡 REST API Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Super Admin | Register new account |
| `POST` | `/api/auth/login` | Public | Login with email/username + password |
| `POST` | `/api/auth/refresh` | Public | Refresh Access Token via HttpOnly cookie |
| `POST` | `/api/auth/logout` | Authenticated | Clear session refresh cookie |
| `GET` | `/api/auth/me` | Authenticated | Fetch active authenticated user details |
| `POST` | `/api/auth/send-otp` | Public | Generate & send OTP password reset code to user email |
| `POST` | `/api/auth/reset-password-otp` | Public | Verify OTP code & reset password |

### 👥 User Management (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users` | Super Admin | List all user accounts |
| `POST` | `/api/users` | Super Admin | Create a new user account |
| `PUT` | `/api/users/profile` | Authenticated | Update user profile (with current password verification) |
| `DELETE` | `/api/users/:id` | Super Admin | Delete a user account |

### 📦 Raw Materials (`/api/raw-materials`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/raw-materials` | Authenticated | List raw materials with live WAC & stock |
| `POST` | `/api/raw-materials` | Authenticated | Create a new raw material |
| `PUT` | `/api/raw-materials/:id` | Authenticated | Update raw material details |
| `POST` | `/api/raw-materials/:id/supply` | Authenticated | Add supply shipment (recomputes WAC) |

### 📦 Packaging (`/api/packaging`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/packaging` | Authenticated | List packaging items with stock pcs & WAC |
| `POST` | `/api/packaging` | Authenticated | Create packaging item |
| `PUT` | `/api/packaging/:id` | Authenticated | Update packaging item |
| `POST` | `/api/packaging/:id/supply` | Authenticated | Add packaging shipment (recomputes WAC) |

### 🏷️ Finished Products (`/api/finished-products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/finished-products` | Authenticated | List finished products with multi-tier prices |
| `POST` | `/api/finished-products` | Authenticated | Create a finished product |
| `PUT` | `/api/finished-products/:id` | Authenticated | Update finished product & price levels |

### 🧪 Formulas (`/api/formulas`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/formulas` | Authenticated | List BOM formulas with live cost calculation |
| `POST` | `/api/formulas` | Authenticated | Create new formula recipe |
| `PUT` | `/api/formulas/:id` | Authenticated | Edit formula recipe |

### 🏭 Production Batches (`/api/production-batches`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/production-batches` | Authenticated | List batch history audit trail |
| `POST` | `/api/production-batches` | Authenticated | Execute batch (Atomic DB write) |

### 🛒 Sales & POS (`/api/sales`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/sales` | Authenticated | List sales history records |
| `POST` | `/api/sales` | Authenticated | Record sale (Deducts finished product stock) |
| `POST` | `/api/sales/:id/settle` | Authenticated | Settle unpaid/partial invoice debt |

### 💸 Fixed Expenses (`/api/expenses`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/expenses` | Authenticated | List active month fixed operational expenses |
| `POST` | `/api/expenses` | Authenticated | Log new fixed expense |
| `DELETE` | `/api/expenses/:id` | Authenticated | Delete fixed expense record |

### 📊 Reports (`/api/reports`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/reports/daily` | Authenticated | Generate daily performance & expenses report |
| `GET` | `/api/reports/monthly` | Authenticated | Generate monthly performance & expenses report |
| `POST` | `/api/reports/send-email` | Authenticated | Trigger email dispatch to all users |

### ⚙️ Settings (`/api/settings`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/settings` | Authenticated | Fetch store configuration settings |
| `PUT` | `/api/settings` | Authenticated | Update store name setting |

---

## ⚙️ Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4000` | Server listening port |
| `MONGODB_URI` | Yes | — | MongoDB Connection String (with ReplicaSet for transactions) |
| `JWT_SECRET` | Yes | — | Secret key for signing Access Tokens |
| `JWT_REFRESH_SECRET` | Yes | — | Secret key for signing Refresh Tokens |
| `SMTP_HOST` | No | `smtp.gmail.com` | SMTP Host for email reports |
| `SMTP_PORT` | No | `587` | SMTP Port |
| `SMTP_USER` | No | — | SMTP Username / Sender Email |
| `SMTP_PASS` | No | — | SMTP Password / App Secret |

---

## 🔑 Default Admin Credentials

Upon executing `npm run seed`:
- **Username / Name**: `admin`
- **Password**: `9999`
- **Role**: `superadmin`
