CREATE TYPE "public"."feed_feedback_signal" AS ENUM('more_like_this', 'less_like_this', 'mute_source', 'mute_tag');--> statement-breakpoint
CREATE TABLE "feed_feedback" (
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"signal" "feed_feedback_signal" NOT NULL,
	"value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_feedback_user_id_entity_type_entity_id_signal_pk" PRIMARY KEY("user_id","entity_type","entity_id","signal")
);
--> statement-breakpoint
CREATE TABLE "feed_impressions" (
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"source" text DEFAULT 'feed' NOT NULL,
	"seen_count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_impressions_user_id_entity_type_entity_id_pk" PRIMARY KEY("user_id","entity_type","entity_id")
);
--> statement-breakpoint
ALTER TABLE "feed_feedback" ADD CONSTRAINT "feed_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_impressions" ADD CONSTRAINT "feed_impressions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_feedback_user_signal_idx" ON "feed_feedback" USING btree ("user_id","signal");--> statement-breakpoint
CREATE INDEX "feed_impressions_user_last_seen_idx" ON "feed_impressions" USING btree ("user_id","last_seen_at");