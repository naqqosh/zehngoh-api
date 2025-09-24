import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class LookupsService {
  constructor(private prisma: PrismaService) {}

  async categories() {
    const cats = await this.prisma.category.findMany({ orderBy: { id: 'asc' } })
    return cats.map((c: any) => ({ id: c.id, nameUz: c.nameUz, nameRu: c.nameRu, parentId: c.parentId }))
  }

  async brands() {
    const brands = await this.prisma.brand.findMany({ orderBy: { name: 'asc' } })
    return brands.map((b: any) => ({ id: b.id, name: b.name }))
  }

  async regions() {
    const list = await this.prisma.region.findMany({ orderBy: { name: 'asc' } })
    return list.map((r: any) => ({ id: r.id, name: r.name, nameUz: r.nameUz, nameRu: r.nameRu }))
  }

  async cities(regionId?: number) {
    const list = await this.prisma.city.findMany({
      where: { regionId: regionId ?? undefined },
      orderBy: { name: 'asc' },
    })
    return list.map((c: any) => ({ id: c.id, regionId: c.regionId, name: c.name, nameUz: c.nameUz, nameRu: c.nameRu }))
  }
}
