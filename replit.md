# BundlrX - Solana Token Bundler

## Overview
BundlrX is a Solana token bundler application that enables users to launch tokens on pump.fun, bags.fm, and bonk.fun with atomic multi-wallet bundle buys via Jito. Features JWT authentication, AES-256-GCM encrypted wallet keys, 12 auto-generated wallets per user, and a 5% platform fee system.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js with SQLite (better-sqlite3)
- **Auth**: JWT (access + refresh tokens) with bcrypt password hashing
- **Wallet Encryption**: AES-256-GCM with PBKDF2 key derivation from user password
- **Theme**: Dark cyber/neon with Solana-inspired green (#153 80% 45%) primary color

## Project Structure
```
client/src/
  pages/            - Auth, Dashboard, Launch, Wallets, History, Fees pages
  components/       - AppSidebar, shadcn ui components
  lib/              - auth.tsx (AuthProvider), api.ts (axios client), theme.tsx
server/
  index.ts          - Express app setup
  routes.ts         - All API routes (auth, wallets, dashboard, bundler, fees)
  services/
    database.ts     - SQLite initialization and query helpers
    auth.ts         - JWT generation/verification, requireAuth middleware
    encryption.ts   - AES-256-GCM encrypt/decrypt, wallet generation
    solana.ts       - Solana RPC connection, balance checks, SOL transfers
shared/
  schema.ts         - TypeScript types and Zod validation schemas
data/
  bundler.db        - SQLite database file
```

## API Routes
- `POST /api/auth/register` - Register with email/password, generates 12 wallets
- `POST /api/auth/login` - Login, returns JWT tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `GET /api/wallets` - List user wallets
- `GET /api/wallets/balances` - Sync and return wallet balances from Solana
- `POST /api/wallets/:id/export` - Export single wallet private key (requires password)
- `POST /api/wallets/export-all` - Export all wallet private keys (requires password)
- `GET /api/dashboard/stats` - Dashboard statistics
- `POST /api/bundler/launch` - Execute token launch (multipart form with image)
- `GET /api/bundler/launches` - List user's launches
- `GET /api/bundler/config` - Get bundler configuration
- `GET /api/fees/pending` - Get unpaid fee launches
- `GET /api/fees/history` - Get fee payment history
- `POST /api/fees/pay/:launchId` - Pay fee for a launch

## Key Features
- 3 launchpads: pump.fun (green), bags.fm (cyan), bonk.fun (orange)
- 12 wallets auto-generated on registration, encrypted with user's password
- 5% platform fee on all launches
- Multi-step launch wizard: Token Info -> Wallet Selection -> Confirm & Execute
- Private key export with password verification
- Dark mode default with light mode toggle

## Recent Changes
- 2026-02-17: Initial build of complete BundlrX application
