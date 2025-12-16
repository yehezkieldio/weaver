-- Migration: Add relevant_chunk_ids column for ground truth retrieval metrics
-- Date: 2025-12-17
-- Description: Adds relevantChunkIds field to evaluation_questions table to store ground truth
--              chunk IDs for calculating retrieval metrics (NDCG, MRR, Precision@K)

ALTER TABLE "evaluation_questions"
ADD COLUMN "relevant_chunk_ids" jsonb;

COMMENT ON COLUMN "evaluation_questions"."relevant_chunk_ids" IS
'Ground truth chunk IDs that should be retrieved for this question. Used to calculate retrieval quality metrics (NDCG, MRR, Precision).';
