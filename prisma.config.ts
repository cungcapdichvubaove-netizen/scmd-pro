import "dotenv/config";
import { defineConfig } from "@prisma/config";

if (!process.env.DATABASE_URL) {
  const dbUser = process.env.DB_USER || process.env.POSTGRES_USER;
  const dbPassword = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  const dbName = process.env.DB_NAME || process.env.POSTGRES_DB;

  if (dbUser && dbPassword && dbName) {
    process.env.DATABASE_URL = `postgresql://${dbUser}:${dbPassword}@localhost:5432/${dbName}`;
  }
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://scmduser:replace_me_with_db_password@localhost:5432/scmd_db";
}

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
