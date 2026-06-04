import { PrismaClient, Prisma } from '@prisma/client'

/**
 * Neon (free tier) suspends the compute after a few minutes idle. The first
 * query after that can fail with a connection error while the DB cold-starts,
 * or because a pooled connection went stale. We retry ONLY on
 * "couldn't reach / connect" failures — these happen before the query runs, so
 * retrying is safe even for writes (no risk of double-execution).
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isConnectionError(err: unknown): boolean {
  // Initialization error = client never reached the server.
  if (err instanceof Prisma.PrismaClientInitializationError) return true
  // P1001 = can't reach DB server. P1002 = reached but timed out connecting.
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === 'P1001' || err.code === 'P1002')
  ) {
    return true
  }
  return false
}

function createPrismaClient() {
  return new PrismaClient().$extends({
    query: {
      async $allOperations({ args, query }) {
        const MAX_ATTEMPTS = 3
        let lastError: unknown
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            return await query(args)
          } catch (err) {
            lastError = err
            if (!isConnectionError(err) || attempt === MAX_ATTEMPTS) throw err
            // Give Neon time to wake (≈cold start), with a small backoff.
            await sleep(attempt * 400)
          }
        }
        throw lastError
      },
    },
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
