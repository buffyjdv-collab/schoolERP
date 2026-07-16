#!/usr/bin/env bash
# ============================================================
# Neon Database Setup Script
# Run this ONCE locally to initialize your Neon Postgres database
# with the Prisma schema + seed data.
#
# Prerequisites:
#   1. .env file with DATABASE_URL + DIRECT_URL + AUTH_SECRET set
#   2. Run: chmod +x scripts/setup-neon.sh && ./scripts/setup-neon.sh
# ============================================================
set -e

echo "🚀 Setting up Neon Postgres database..."
echo ""

# Check .env exists
if [ ! -f .env ]; then
  echo "❌ No .env file found. Copy .env.example to .env and fill in your Neon connection strings."
  exit 1
fi

echo "📦 Generating Prisma Client..."
bun run db:generate

echo ""
echo "🗄️  Creating database schema (prisma db push)..."
bun run db:push

echo ""
echo "🌱 Seeding database with demo data..."
bun run db:seed

echo ""
echo "✅ Neon database setup complete!"
echo "   Your database now has all tables + seed data."
echo "   You can now deploy to Vercel."
