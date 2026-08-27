# STORVA — Your Personal Storage

Storva is a hybrid cloud, self-hosted Personal NAS & Private Cloud Web Application.
Your filesystem remains safely at home (e.g. `D:\Storva`), while the Web App (Next.js) runs on Vercel or locally.

---

## 🏗 Architecture

- **Web App (`apps/web`)**: Next.js 15, Tailwind, React, Prisma. Acts as UI + Cloud Control Plane.
- **Agent (`apps/agent`)**: Express background service running on home PC with direct filesystem access.
- **Shared Auth (`packages/shared-auth`)**: JWT-based signed requests with scope enforcement.
- **Validation (`packages/validation`)**: Path traversal safety (`resolveSafePath`).

---

## 🛠 Development & Setup

### Environment Variables

Copy `.env.example` to `.env` in root:

```env
# Cloud Control Plane / Web
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/storva?schema=public" # Optional in DEV!
SIGNING_PRIVATE_KEY="super-secret-signing-key-minimum-32-chars-long"
STORVA_AGENT_URL="http://127.0.0.1:5125"

# Home PC Agent
STORVA_STORAGE_PATH="D:\Storva" # or /home/user/Storva on Linux
STORVA_AGENT_PORT=5125
```

### Dev Mode Without PostgreSQL

Storva supports a **zero-external-DB dev mode**.
If `DATABASE_URL` is not set, `apps/web` falls back to an in-memory / file-backed local database (`dev-db.json`) automatically.
The database schema remains 100% PostgreSQL ready for production!

### Running Locally

```bash
pnpm install
pnpm build # Build packages
pnpm dev   # Starts web app + agent concurrently
```

---

## 🔒 Security Hardening

1. **Path Traversal Protection**: Every agent operation uses `resolveSafePath` to lock access strictly inside `STORVA_STORAGE_PATH`.
2. **Signed Token & Scopes**: All remote operations to agent require a short-lived signed JWT containing scopes (`storage:read`, `storage:write`, `storage:delete`, `storage:share`).
3. **HTTP Hardening**: Strict CSP, HSTS, X-Content-Type-Options headers + Rate limiting on auth endpoints.
4. **Offline Queue & Reconciler**: Agent uses `chokidar` to monitor local file changes and queues metadata sync events when offline.

---

## 🚀 New Features (Phase 3)

- **Share Links**: Create public share links with expiration, read-only mode, and optional password. Access via `/share/[token]`.
- **Multi-Device Management**: Register multiple home PCs/NAS and switch between them from the Dashboard.
- **Disk Usage Monitoring**: Real-time storage tracking with Warning (85%) and Critical (95%) visual alerts on the dashboard.
- **Direct-to-Agent Transport**: High-speed file transfer via signed tokens, bypassing Vercel binary proxy.

---

## 🚢 Production Deployment

1. **Database**: Provision PostgreSQL on Neon / Supabase / Vercel Marketplace and set `DATABASE_URL`.
2. **Vercel**: Deploy `apps/web` to Vercel. Set `SIGNING_PRIVATE_KEY` and `STORVA_AGENT_URL` (or Cloudflare Tunnel URL).
3. **Home PC Agent**: Run `apps/agent` as a background service/Windows service connected via Cloudflare Tunnel or Tailscale.
