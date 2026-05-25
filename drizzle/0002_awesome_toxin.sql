CREATE TABLE "course_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"status" "course_status" NOT NULL,
	"title" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_revisions" ADD CONSTRAINT "course_revisions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_revisions" ADD CONSTRAINT "course_revisions_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_revisions_course_revision_idx" ON "course_revisions" USING btree ("course_id","revision_number");--> statement-breakpoint
CREATE INDEX "course_revisions_course_created_idx" ON "course_revisions" USING btree ("course_id","created_at");--> statement-breakpoint
CREATE INDEX "course_revisions_creator_created_idx" ON "course_revisions" USING btree ("creator_id","created_at");