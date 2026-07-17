#!/usr/bin/env node
/**
 * Postinstall script — generates the Prisma client with the right schema.
 *
 * - If DATABASE_URL starts with "file:" (SQLite) → use schema.dev.prisma
 * - If DATABASE_URL starts with "postgresql:" → use schema.prisma (production/Neon)
 * - If DATABASE_URL is not set → use schema.dev.prisma (safe local default)
 *
 * This runs automatically after `bun install` / `npm install` both locally
 * and on Vercel.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const dbUrl = process.env.DATABASE_URL || ''
const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')
const schema = isPostgres ? 'prisma/schema.prisma' : 'prisma/schema.dev.prisma'
const schemaPath = path.join(process.cwd(), schema)

if (!fs.existsSync(schemaPath)) {
  console.log(`⚠️  Schema file not found: ${schemaPath} — skipping prisma generate`)
  process.exit(0)
}

console.log(`📦 Running prisma generate with ${schema}`)
try {
  execSync(`npx prisma generate --schema=${schema}`, { stdio: 'inherit' })
  console.log('✅ Prisma client generated')
} catch (e) {
  console.error('❌ prisma generate failed:', e.message)
  // Don't fail the install — the build step will catch real errors
  process.exit(0)
}
