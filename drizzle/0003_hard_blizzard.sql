CREATE TABLE "course_media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"course_id" uuid,
	"kind" text NOT NULL,
	"original_file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_media_assets" ADD CONSTRAINT "course_media_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_media_assets" ADD CONSTRAINT "course_media_assets_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_media_assets_url_idx" ON "course_media_assets" USING btree ("url");--> statement-breakpoint
CREATE INDEX "course_media_assets_owner_created_idx" ON "course_media_assets" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "course_media_assets_course_idx" ON "course_media_assets" USING btree ("course_id");