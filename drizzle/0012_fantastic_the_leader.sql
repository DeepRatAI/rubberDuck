CREATE TYPE "public"."project_signal_response_intent" AS ENUM('try', 'review', 'contribute', 'follow_build');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_signal_response';--> statement-breakpoint
CREATE TABLE "project_signal_responses" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"intent" "project_signal_response_intent" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_signal_responses_post_id_user_id_intent_pk" PRIMARY KEY("post_id","user_id","intent")
);
--> statement-breakpoint
ALTER TABLE "project_signal_responses" ADD CONSTRAINT "project_signal_responses_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_signal_responses" ADD CONSTRAINT "project_signal_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_signal_responses_post_idx" ON "project_signal_responses" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "project_signal_responses_user_created_idx" ON "project_signal_responses" USING btree ("user_id","created_at");