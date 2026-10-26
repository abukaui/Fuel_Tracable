# FuelGuard (MVP)

> **Status:** Minimum Viable Product (MVP)  
> **Scalability:** 100% built and architected to scale to nationwide production.

---

## ⚡ Project Status: MVP & Scalability

This repository contains the working **Minimum Viable Product (MVP)** for the fuel traceability and distribution platform. 

While currently demonstrated with focused datasets and simulated sensor cycles, the underlying codebase is **100% designed for enterprise scale**:
- **Stateless backend services** ready for horizontal container scaling (Docker / Kubernetes).
- **Telecom-grade USSD session handling** built to withstand high concurrency from mobile drivers.
- **Connection-pooled PostgreSQL** with isolated indexed tables, schema migrations, and idempotent transaction guards.
- **Modular service boundaries** allowing independent extraction of the reconciliation engine, ATG telemetry ingestion pipeline, and USSD gateway into dedicated microservices as traffic scales.

---

## 🛠️ Tech Stack

### 1. Telecom & Mobile Gateway
- **Africa's Talking (USSD API)**: Powers the `*804#` mobile USSD session gateway, enabling any mobile phone (smartphones & basic feature phones) to perform driver vehicle registrations, real-time quota inquiries, and OTP fuel requests without requiring internet access.

### 2. Frontend
- **React 19**: Modern component architecture with optimistic UI updates.
- **Vite (v8)**: Ultra-fast build pipeline and Hot Module Replacement (HMR).
- **React Router (v7)**: Client-side routing with role-guarded protected routes (`ADMIN`, `GOV_REGULATOR`, `STATION_OPERATOR`).
- **Vanilla CSS (Petroleum Design System)**: Custom color palette reflecting the petroleum sector (crude navy `#051421`, petrol blue `#0284c7`, amber flame `#d97706`), glassmorphism widgets, and live polling telemetry indicators.
- **Vitest & React Testing Library**: Component testing and client-side validation suites.

### 3. Backend
- **Node.js (v20+) & Express.js**: REST API server and USSD callback webhook processors.
- **Authentication & Security**: JSON Web Tokens (JWT), `bcryptjs` password hashing, role-based authorization (RBAC), and idempotency keys to prevent duplicate dispenses.
- **Validation**: `Zod` schema validation for strict payload validation.
- **Background Cron Engine (`node-cron`)**: 
  - Real-time ATG (Automatic Tank Gauge) sensor telemetry simulation (10-second polling cycle).
  - Automated variance reconciliation batch runs (30-minute interval).

### 4. Database & Infrastructure
- **PostgreSQL**: Cloud database hosted on **Supabase** (AWS Ireland region).
- **Node-Postgres (`pg`)**: Direct connection pooling with SSL encryption.
- **Custom SQL Migration Runner**: 17 sequential migration scripts tracking schema evolution, constraint checks, and rollback safety.




---

## 🚀 Running the Project Locally

### 1. Backend Setup
```bash
cd backend
npm install

# Start the server (runs on http://localhost:3000):
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Start the Vite dev server (runs on http://localhost:5174):
npm run dev
```