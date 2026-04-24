import * as dotenv from "dotenv";
dotenv.config();

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  // CORS
  const defaultOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://zehngoh.uz",
    "https://www.zehngoh.uz",
  ];
  const envOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  });

  // Serve static media from seller-api's media folder so UI can load images
  try {
    const repoRoot = join(process.cwd(), "..");
    const sellerMedia = join(repoRoot, "seller-api", "media");
    app.use("/media", express.static(sellerMedia));
  } catch {}
  // Serve local public assets (e.g., WebAuthn test page)
  try {
    const publicDir = join(process.cwd(), "public");
    app.use("/", express.static(publicDir));
  } catch {}
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(cookieParser());

  const port = process.env.PORT ? Number(process.env.PORT) : 3002;
  await app.listen(port);

  console.log(`User-API listening on port: ${port}`);
}

bootstrap();
