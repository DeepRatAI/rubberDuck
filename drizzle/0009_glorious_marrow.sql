ALTER TABLE "comments" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "status_reason" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "status_reason" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_status_created_idx" ON "posts" USING btree ("status","created_at");--> statement-breakpoint
DELETE FROM "reports" newer
USING "reports" older
WHERE newer.ctid < older.ctid
  AND newer."reporter_id" = older."reporter_id"
  AND newer."entity_type" = older."entity_type"
  AND newer."entity_id" = older."entity_id";--> statement-breakpoint
CREATE UNIQUE INDEX "reports_reporter_entity_idx" ON "reports" USING btree ("reporter_id","entity_type","entity_id");
