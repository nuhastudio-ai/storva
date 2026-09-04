---
PETUNJUK DEPLOY KE VERCEL

App: Next.js 15, Prisma, Turborepo, Tailwind v4.

1. Siapkan Database Production

- Butuh PostgreSQL/MySQL yang bisa diakses public
  - Rekomendasi: Vercel Postgres, Supabase, atau Railway
- Catat DATABASE_URL (format: postgres://user:pass@host:port/db)

2. Push Code ke GitHub

- Vercel membaca repo dari GitHub
- Push seluruh kode root workspace ke GitHub (termasuk folder apps/web dan packages/shared-auth)

3. Setup Vercel Project

1. Login ke https://vercel.com
2. Pilih "Add New Project" → Import repo
3. Root Directory: biarkan kosong (root repo). Vercel otomatis mendeteksi Turborepo
4. Framework Preset: Next.js

4. Set Environment Variables

Buka tab "Environment Variables" sebelum klik Deploy. Copy semua dari .env lokal:

┌──────────────┬──────────────────────────────────────┐
│   Variable   │                Contoh                │
├──────────────┼──────────────────────────────────────┤
│ DATABASE_URL │ postgres://user:pass@host:5432/db    │
├──────────────┼──────────────────────────────────────┤
│ JWT_SECRET   │ (string acak kuat, min. 32 karakter) │
└──────────────┴──────────────────────────────────────┘

▎ Tambahkan semua variabel env lain yang ada di .env lokal ke dalam environment variables Vercel.

5. Build Command

Prisma butuh generate client sebelum build berjalan.

Buka "Build and Output Settings", lalu override Build Command:

npx prisma generate && npx prisma migrate deploy && next build

▎ prisma migrate deploy akan menjalankan migration otomatis saat build.

6. Deploy

Klik "Deploy".

Build akan berjalan otomatis. Setelah selesai, app langsung live di domain Vercel.

---