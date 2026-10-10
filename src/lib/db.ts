import { PrismaClient } from '@prisma/client'
import { persistData } from './persist'

// Persistence guard: after every successful write (any route — admin data,
// orders, payments, view counts) schedule a best-effort git snapshot commit
// of db/custom.db + public/uploads + uploads so sandbox restores always keep
// the latest store data instead of an old snapshot.
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
  const base = new PrismaClient({
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
