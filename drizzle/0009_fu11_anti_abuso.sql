CREATE TABLE "blocked_email_domain" (
	"domain" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"key_kind" text NOT NULL,
	"key_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_rate_limit_lookup" ON "rate_limit_event" USING btree ("action","key_kind","key_value","created_at");
