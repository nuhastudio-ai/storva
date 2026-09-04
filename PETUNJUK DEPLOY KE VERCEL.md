---
PETUNJUK DEPLOY KE VERCEL

App: Next.js 15, Prisma, Turborepo, Tailwind v4.

Rekomendasi: Neon untuk Storva karena beberapa alasan spesifik dari schema-nya:

Kenapa Neon paling cocok:

Schema Storva punya self-referential relation di FileMetadata (parent-children folder hierarchy) — ini butuh PostgreSQL penuh, bukan MySQL, dan Neon jalan di PostgreSQL 16 tanpa batasan fitur
Connection pooling bawaan penting karena Next.js serverless di dev mode bisa spawn banyak connection sekaligus — Neon handle ini otomatis tanpa konfigurasi pgBouncer extra seperti Supabase
Free tier-nya tidak suspend/pause project seperti Supabase (yang pause setelah 1 minggu tidak aktif) — database kamu tetap bisa diakses kapanpun

Cara setup Neon untuk Storva (< 2 menit):

Daftar di neon.tech → buat project baru
Copy connection string dari dashboard, formatnya:
postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
Paste ke apps/web/.env:
env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
Jalankan migration:
bash
cd apps/web
pnpm prisma migrate deploy

Selesai — tidak perlu install PostgreSQL lokal sama sekali.

Catatan untuk Supabase: Kalau kamu tetap pilih Supabase, pastikan pakai connection pooler (port 6543, bukan 5432) di DATABASE_URL karena Prisma dengan Next.js serverless butuh pooling. Formatnya:

postgresql://postgres:[password]@db.xxx.supabase.co:6543/postgres?pgbouncer=true

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

## 7. Deploy

Klik "Deploy".

Build akan berjalan otomatis. Setelah selesai, app langsung live di domain Vercel.

---

## 6. Build Command

Prisma butuh generate client sebelum build berjalan.

Buka "Build and Output Settings", lalu override Build Command:

npx prisma generate && npx prisma migrate deploy && next build

▎ prisma migrate deploy akan menjalankan migration otomatis saat build.

## 7. Deploy

Klik "Deploy".

Build akan berjalan otomatis. Setelah selesai, app langsung live di domain Vercel.

---