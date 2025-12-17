ALTER TABLE "evaluation_runs" ADD COLUMN "use_reranker" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD COLUMN "reranker_strategy" text DEFAULT 'ensemble';--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD COLUMN "enable_guardrails" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD COLUMN "language" text DEFAULT 'id';--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD COLUMN "evaluation_mode" text DEFAULT 'quick';