import { promises as fs } from 'fs'

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

