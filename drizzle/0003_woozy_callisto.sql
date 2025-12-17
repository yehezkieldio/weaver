ALTER TABLE "evaluation_questions" ADD COLUMN "rag_context_relevancy" real;--> statement-breakpoint
ALTER TABLE "evaluation_questions" ADD COLUMN "rag_planning_latency_ms" integer;--> statement-breakpoint
ALTER TABLE "evaluation_questions" ADD COLUMN "rag_synthesis_latency_ms" integer;--> statement-breakpoint
ALTER TABLE "evaluation_questions" ADD COLUMN "rag_avg_step_latency_ms" integer;--> statement-breakpoint
ALTER TABLE "evaluation_questions" DROP COLUMN "rag_academic_rigor";--> statement-breakpoint
ALTER TABLE "evaluation_questions" DROP COLUMN "rag_terminology_correctness";