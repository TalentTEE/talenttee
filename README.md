# Talent-Tee

Talent-Tee is a multi-service project with a Next.js frontend, NestJS backend, and Rust smart contracts.

## Project Structure

```text
.
├── frontend/      # Next.js app (React 19 + Next 16)
├── backend/       # NestJS API server
├── contract/      # Rust smart contracts (agreement, escrow)
├── docs/          # Product/architecture docs
├── docker-compose.yml
└── init-db.sql
```

## Quick Start

### 1) Start database

```bash
docker compose up -d
```

### 2) Run backend

```bash
cd backend
npm install
npm run start:dev
```

### 3) Run frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000 (if configured as default)

## Dependency / Git Policy

- `node_modules/` must never be committed.
- Lockfiles are tracked per app:
  - `frontend/package-lock.json`
  - `backend/package-lock.json`
- Build artifacts (`dist/`, `.next/`, `target/`) are not committed.
