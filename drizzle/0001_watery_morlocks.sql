CREATE TABLE "document_processing_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"stage" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"message" text DEFAULT '',
	"estimated_time_ms" integer,
	"stage_progress" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_processing_progress_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "last_successful_stage" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "processing_artifacts" jsonb;--> statement-breakpoint
ALTER TABLE "document_processing_progress" ADD CONSTRAINT "document_processing_progress_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;