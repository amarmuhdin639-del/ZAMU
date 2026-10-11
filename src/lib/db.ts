import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { persistData } from './persist'

// Persistence guard: after every successful write (any route — admin data,
// orders, payments, view counts) schedule a best-effort git snapshot commit
// of db/custom.db + public/uploads + uploads so sandbox restores always keep
// the latest store data instead of an old snapshot.
// (persistData() is a no-op when the store runs on Turso / Netlify.)
const WRITE_ACTIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  '$executeRaw',
  '$executeRawUnsafe',
])

function createClient() {
  // Turso (hosted libsql) mode — used on Netlify: TURSO_DATABASE_URL +
  // TURSO_AUTH_TOKEN are set as environment variables in the Netlify
  // dashboard. Locally they are absent and the plain SQLite file is used.
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const base = tursoUrl
    ? new PrismaClient({
        adapter: new PrismaLibSQL({
          url: tursoUrl,
          authToken: process.env.TURSO_AUTH_TOKEN,
        }),
        log: ['error'],
      })
    : new PrismaClient({
        log: ['error'],
      })
  return base.$extends({
    query: {
      $allOperations({ operation, args, query }) {
        const result = query(args)
        if (WRITE_ACTIONS.has(operation)) persistData()
        return result
      },
    },
  })
}

type ExtendedClient = ReturnType<typeof createClient>

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedClient | undefined
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
