CREATE TYPE "public"."post_content_type" AS ENUM('standard', 'project_signal', 'course_update', 'question', 'build_log', 'resource');--> statement-breakpoint
CREATE TABLE "github_repo_cache" (
	"repo_key" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_audience_targets" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL,
	CONSTRAINT "post_audience_targets_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"source" text DEFAULT 'author' NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_interests" (
	"user_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL,
	"source" text DEFAULT 'onboarding' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_interests_user_id_tag_id_pk" PRIMARY KEY("user_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "content_type" "post_content_type" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "project_signal" jsonb;--> statement-breakpoint
ALTER TABLE "post_audience_targets" ADD CONSTRAINT "post_audience_targets_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_audience_targets" ADD CONSTRAINT "post_audience_targets_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_repo_cache_fetched_idx" ON "github_repo_cache" USING btree ("fetched_at");--> statement-breakpoint
CREATE INDEX "post_audience_targets_tag_idx" ON "post_audience_targets" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "post_tags_tag_idx" ON "post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tags_category_idx" ON "tags" USING btree ("category");--> statement-breakpoint
CREATE INDEX "user_interests_tag_idx" ON "user_interests" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "posts_content_type_created_idx" ON "posts" USING btree ("content_type","created_at");