import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { brand } from "@/lib/brand";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await db.execute(sql`select 1`);

    return NextResponse.json({
      ok: true,
      service: brand.serviceName,
      dependencies: {
        database: "ok",
      },
      timestamp,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: brand.serviceName,
        dependencies: {
          database: "error",
        },
        error:
          error instanceof Error
            ? error.message
            : "Database health check failed.",
        timestamp,
      },
      { status: 503 },
    );
  }
}
