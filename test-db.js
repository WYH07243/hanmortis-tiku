import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const url = process.env["DATABASE_URL"];
  const authToken = process.env["DATABASE_AUTH_TOKEN"];

  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const libsql = new PrismaLibSql({ url, authToken });
  return new PrismaClient({ adapter: libsql });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env["NODE_ENV"] !== "production") globalThis.prisma = prisma;