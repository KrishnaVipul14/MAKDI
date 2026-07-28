import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prismaClientSingleton = () => {
  let url = 'file:./dev.db'

  // If running on Vercel, the file system is read-only.
  // We must copy the database to /tmp which is writable.
  if (process.env.VERCEL) {
    const tmpDbPath = '/tmp/dev.db'
    if (!fs.existsSync(tmpDbPath)) {
      try {
        const sourceDbPath = path.join(process.cwd(), 'dev.db')
        fs.copyFileSync(sourceDbPath, tmpDbPath)
      } catch (e) {
        console.error('Error copying SQLite DB to /tmp:', e)
      }
    }
    url = 'file:/tmp/dev.db'
  }

  return new PrismaClient({
    datasources: {
      db: {
        url
      }
    }
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
