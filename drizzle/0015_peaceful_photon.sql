CREATE TYPE "public"."account_moderation_action" AS ENUM('warning', 'suspension', 'ban', 'restore');--> statement-breakpoint
CREATE TABLE "account_moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"subject_id" uuid NOT NULL,
	"action" "account_moderation_action" NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_expires" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account_moderation_actions" ADD CONSTRAINT "account_moderation_actions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_moderation_actions" ADD CONSTRAINT "account_moderation_actions_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_moderation_subject_created_idx" ON "account_moderation_actions" USING btree ("subject_id","created_at");--> statement-breakpoint
CREATE INDEX "account_moderation_actor_created_idx" ON "account_moderation_actions" USING btree ("actor_id","created_at");