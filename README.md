# Vidyamatrix ERP — School Management System

Enterprise school ERP with 15+ integrated modules, role-based access control (RBAC), AI assistant, and live GPS transport tracking.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State**: Zustand + TanStack Query
- **AI**: z-ai-web-dev-sdk (LLM, VLM, TTS, ASR)
- **Realtime**: Socket.io mini-service (transport GPS)

## Local Development

```bash
# 1. Install dependencies
bun install

# 2. Set up environment
cp .env.example .env
# Edit .env with your Neon connection strings + AUTH_SECRET

# 3. Generate Prisma client + push schema to Neon + seed
bun run db:generate
bun run db:push
bun run db:seed

# 4. Start dev server
bun run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon pooled connection string (PgBouncer) | ✅ |
| `DIRECT_URL` | Neon direct connection string (for migrations) | ✅ |
| `AUTH_SECRET` | HMAC secret for session cookies | ✅ |

Generate a strong AUTH_SECRET:
```bash
openssl rand -base64 32
```

## Production Deployment (GitHub + Vercel + Neon)

### Step 1 — Set up Neon Database
1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string → `DATABASE_URL`
3. Copy the **direct** connection string → `DIRECT_URL`
4. Run locally to initialize:
   ```bash
   ./scripts/setup-neon.sh
   ```

### Step 2 — Push to GitHub
```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/schoolERP.git
git add -A
git commit -m "Initial production-ready commit"
git branch -M main
git push -u origin main
```

### Step 3 — Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Framework preset: **Next.js**
4. Add environment variables:
   - `DATABASE_URL` = Neon pooled connection string
   - `DIRECT_URL` = Neon direct connection string
   - `AUTH_SECRET` = your generated secret
5. Deploy

Vercel automatically runs `postinstall` → `prisma generate` and `build` → `prisma generate && next build`.

## Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@vidyamatrix.edu | super123 |
| Admin | admin@vidyamatrix.edu | admin123 |
| Transport Manager | transport@vidyamatrix.edu | transport123 |
| Teacher | teacher@vidyamatrix.edu | teacher123 |
| Student | student@vidyamatrix.edu | student123 |
| Parent | parent@vidyamatrix.edu | parent123 |

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:push` | Push schema to DB |
| `bun run db:seed` | Seed demo data |
| `bun run db:migrate` | Create migration |
| `bun run db:migrate:deploy` | Apply migrations (production) |

## Security Notes
- **Never commit `.env`** — it's in `.gitignore`
- **Rotate secrets** if they're ever exposed
- `AUTH_SECRET` must be set in production (the app throws if missing)
- Database credentials should only live in Vercel env vars, never in code

## Note on Real-Time Transport Tracking
The live GPS transport tracking uses a separate Socket.io mini-service (`mini-services/transport-tracker/`) running on port 3003. Since Vercel is serverless, this service **cannot run on Vercel**. To enable live tracking in production:

1. Deploy the mini-service separately (Railway, Render, Fly.io, or a VPS):
   ```bash
   cd mini-services/transport-tracker
   bun install
   bun run dev  # or use a process manager
   ```
2. Set the service URL in your Vercel env vars if needed
3. The ERP app gracefully falls back to showing last-known positions if the socket service is unavailable

All other modules (students, attendance, exams, fees, etc.) work fully on Vercel serverless.

