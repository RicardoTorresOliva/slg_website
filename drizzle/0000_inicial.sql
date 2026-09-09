CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_event" (
	"id" text PRIMARY KEY NOT NULL,
	"api_key_id" text,
	"organization_id" text,
	"kind" text NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"body_md" text NOT NULL,
	"published_at" timestamp with time zone,
	"author_type" text,
	"author_id" text,
	"author_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"organization_id" text,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rate_limit_max" integer DEFAULT 60 NOT NULL,
	"rate_limit_window_seconds" integer DEFAULT 60 NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"actor_label" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"organization_id" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"job_title" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_capture_id" text NOT NULL,
	"cycle" integer DEFAULT 1 NOT NULL,
	"attempt" integer NOT NULL,
	"endpoint" text NOT NULL,
	"request_body" jsonb,
	"response_code" integer,
	"response_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverable" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"file_key" text,
	"url" text,
	"checksum_sha256" text,
	"version" integer DEFAULT 1 NOT NULL,
	"family_id" text NOT NULL,
	"visibility" text DEFAULT 'client' NOT NULL,
	"published_at" timestamp with time zone,
	"published_by_type" text,
	"published_by_id" text,
	"published_by_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "download_event" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_capture_id" text NOT NULL,
	"download_slug" text NOT NULL,
	"signed_url_issued_at" timestamp with time zone NOT NULL,
	"signed_url_expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"to_email" text NOT NULL,
	"from_email" text NOT NULL,
	"reply_to" text,
	"template_key" text NOT NULL,
	"subject_key" text NOT NULL,
	"locale" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"provider_message_id" text,
	"provider_status" text,
	"last_error" text,
	"next_attempt_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'client_member' NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_capture" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_domain" text NOT NULL,
	"name" text,
	"company" text,
	"job_title" text,
	"source" text NOT NULL,
	"download_slug" text,
	"page_path" text NOT NULL,
	"locale" text NOT NULL,
	"utm" jsonb,
	"consent_at" timestamp with time zone NOT NULL,
	"privacy_version" text NOT NULL,
	"crm_mode" text,
	"crm_contact_id" text,
	"crm_company_id" text,
	"crm_opportunity_id" text,
	"crm_sync_status" text DEFAULT 'pending' NOT NULL,
	"crm_attempts" integer DEFAULT 0 NOT NULL,
	"crm_cycle" integer DEFAULT 1 NOT NULL,
	"crm_last_error" text,
	"crm_next_attempt_at" timestamp with time zone,
	"crm_delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"org_role" text DEFAULT 'client_member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'client' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"service" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"owner_user_id" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'client_member' NOT NULL,
	"locale" text DEFAULT 'es' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"target_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_event" ADD CONSTRAINT "agent_event_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_event" ADD CONSTRAINT "agent_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_delivery" ADD CONSTRAINT "crm_delivery_lead_capture_id_lead_capture_id_fk" FOREIGN KEY ("lead_capture_id") REFERENCES "public"."lead_capture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable" ADD CONSTRAINT "deliverable_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable" ADD CONSTRAINT "deliverable_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_event" ADD CONSTRAINT "download_event_lead_capture_id_lead_capture_id_fk" FOREIGN KEY ("lead_capture_id") REFERENCES "public"."lead_capture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_account_provider" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_account_user" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_agent_event_org" ON "agent_event" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_agent_event_created" ON "agent_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_announcement_org" ON "announcement" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_api_key_hash" ON "api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_api_key_org" ON "api_key" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_entity" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "idx_contact_org" ON "contact" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_contact_primary_per_org" ON "contact" USING btree ("organization_id") WHERE "contact"."is_primary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_crm_delivery_attempt" ON "crm_delivery" USING btree ("lead_capture_id","cycle","attempt","endpoint");--> statement-breakpoint
CREATE INDEX "idx_crm_delivery_lead" ON "crm_delivery" USING btree ("lead_capture_id");--> statement-breakpoint
CREATE INDEX "idx_deliverable_org" ON "deliverable" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_deliverable_project" ON "deliverable" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_deliverable_family_version" ON "deliverable" USING btree ("family_id","version");--> statement-breakpoint
CREATE INDEX "idx_download_event_lead" ON "download_event" USING btree ("lead_capture_id");--> statement-breakpoint
CREATE INDEX "idx_email_pending" ON "email_delivery" USING btree ("next_attempt_at") WHERE "email_delivery"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_invitation_token" ON "invitation" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_invitation_org" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_lead_capture_email" ON "lead_capture" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_lead_capture_pending" ON "lead_capture" USING btree ("crm_next_attempt_at") WHERE "lead_capture"."crm_sync_status" = 'pending';--> statement-breakpoint
CREATE INDEX "idx_lead_capture_created" ON "lead_capture" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_membership_user_org" ON "membership" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_membership_org" ON "membership" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_organization_slug" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_project_org" ON "project" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_session_token" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_session_user" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_email" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_verification_identifier" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_webhook_pending" ON "webhook_delivery" USING btree ("next_attempt_at") WHERE "webhook_delivery"."status" = 'pending';