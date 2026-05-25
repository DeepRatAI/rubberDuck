import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "./schema";

type PostgresClient = ReturnType<typeof postgres>;

const globalForPostgres = globalThis as typeof globalThis & {
  __devitPostgresClient?: PostgresClient;
};

const client =
  globalForPostgres.__devitPostgresClient ??
  postgres(env.DATABASE_URL, {
    max: 5,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.__devitPostgresClient = client;
}

export const db = drizzle(client, { schema });
