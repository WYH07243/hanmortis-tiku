// Prisma 客户端单例（开发环境下防止热重载创建多个实例）
import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 生产环境使用 Turso/LibSQL 云数据库，本地开发使用 SQLite 文件
const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const adapterConfig: any = { url: databaseUrl };
if (authToken) {
  adapterConfig.authToken = authToken;
}

const adapter = new PrismaLibSql(adapterConfig);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
