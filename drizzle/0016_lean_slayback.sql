ALTER TABLE "comments" ADD COLUMN "helpful_by_author" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "helpful_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "helpful_by" uuid;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_helpful_by_users_id_fk" FOREIGN KEY ("helpful_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_helpful_idx" ON "comments" USING btree ("helpful_by_author");