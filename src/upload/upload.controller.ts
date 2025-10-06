import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'
import * as multer from 'multer'
import * as path from 'path'
import { promises as fs } from 'fs'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import { ensureDir } from '../common/utils/fs.util'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp']

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true)
  return cb(new Error('Unsupported file type'), false)
}

@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('review-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      fileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadReviewImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fayl topilmadi')

    const repoRoot = path.join(process.cwd(), '..')
    const mediaRoot = path.join(repoRoot, 'seller-api')
    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const relativeDir = path.join('media', 'reviews', year, month)
    const targetDir = path.join(mediaRoot, relativeDir)
    await ensureDir(targetDir)

    const originalExt = path.extname(file.originalname) || '.jpg'
    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const finalName = `${baseName}${originalExt}`
    const finalPath = path.join(targetDir, finalName)
    await fs.writeFile(finalPath, file.buffer)

    const dbPath = path.join(relativeDir, finalName).replace(/\\/g, '/')
    const record = await this.prisma.file.create({
      data: {
        url: dbPath,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
    })

    return {
      fileId: record.id,
      imageUrl: `/${dbPath}`,
      filename: record.filename,
      size: record.size,
    }
  }
}
