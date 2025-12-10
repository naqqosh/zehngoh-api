import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async createNotFound(input: {
    query: string;
    pageUrl?: string;
    userAgent?: string;
    ip?: string;
    userId?: number;
  }) {
    return await this.prisma.notFoundFeedback.create({
      data: {
        query: input.query,
        pageUrl: input.pageUrl || null,
        userAgent: input.userAgent || null,
        ip: input.ip || null,
        userId: input.userId || null,
      },
    });
  }
}
