Dibawah adalah diagram Entity-Relationship Diagram (ERD) untuk skema database yang digunakan dalam proyek ini. Ia mengilustrasikan hubungan antara entitas berbeda, atribut mereka, dan bagaimana mereka berinteraksi satu sama lain.

```mermaid
erDiagram
    chat_sessions ||--o{ chat_messages : "has"
    chat_sessions ||--o{ agent_steps : "contains"
    chat_sessions ||--o{ guardrail_logs : "tracks"

    documents ||--o{ document_chunks : "split into"
    documents ||--|| document_processing_progress : "has"

    evaluation_runs ||--o{ evaluation_questions : "contains"
    evaluation_runs ||--o{ statistical_analyses : "analyzed by"

    evaluation_questions ||--o{ human_annotations : "annotated by"

    ablation_studies ||--o{ statistical_analyses : "analyzed by"

    chat_sessions {
        uuid id PK
        text title
        boolean use_rag
        boolean use_agentic_mode
        text retrieval_strategy
        timestamp created_at
        timestamp updated_at
    }

    chat_messages {
        uuid id PK
        uuid session_id FK
        text role
        text content
        jsonb retrieved_chunks
        boolean rag_enabled
        boolean agentic_mode
        integer agent_steps_count
        jsonb guardrails_triggered
        integer latency_ms
        integer token_count
        timestamp created_at
    }

    agent_steps {
        uuid id PK
        uuid session_id FK
        uuid message_id
        integer step_index
        text step_type
        text tool_name
        jsonb tool_input
        jsonb tool_output
        text reasoning
        integer duration_ms
        timestamp created_at
    }

    documents {
        uuid id PK
        text title
        text file_name
        text file_type
        integer file_size
        text content
        jsonb metadata
        text processing_status
        text processing_error
        text chunking_strategy
        text last_successful_stage
        jsonb processing_artifacts
        timestamp created_at
        timestamp updated_at
    }

    document_chunks {
        uuid id PK
        uuid document_id FK
        text content
        integer chunk_index
        integer start_offset
        integer end_offset
        jsonb metadata
        vector embedding
        text[] keywords
        timestamp created_at
    }

    document_processing_progress {
        uuid id PK
        uuid document_id FK
        text stage
        integer progress
        text message
        integer estimated_time_ms
        jsonb stage_progress
        timestamp started_at
        timestamp updated_at
    }

    evaluation_runs {
        uuid id PK
        text name
        text description
        text status
        integer total_questions
        integer completed_questions
        text retrieval_strategy
        text chunking_strategy
        boolean use_agentic_mode
        timestamp created_at
        timestamp completed_at
    }

    evaluation_questions {
        uuid id PK
        uuid run_id FK
        text question
        text ground_truth
        text rag_answer
        text non_rag_answer
        jsonb retrieved_contexts
        jsonb relevant_chunk_ids
        real rag_faithfulness
        real rag_answer_relevancy
        real rag_context_precision
        real rag_context_recall
        real rag_answer_correctness
        real non_rag_answer_relevancy
        real non_rag_answer_correctness
        real rag_academic_rigor
        real rag_citation_accuracy
        real rag_terminology_correctness
        real rag_hallucination_rate
        real rag_factual_consistency
        real rag_source_attribution
        real rag_contradiction_score
        real non_rag_hallucination_rate
        real retrieval_ndcg
        real retrieval_mrr
        real retrieval_precision
        text retrieval_method
        text reranker_strategy
        integer agent_steps_used
        integer guardrails_triggered
        integer rag_latency_ms
        integer non_rag_latency_ms
        integer rag_retrieval_latency_ms
        integer rag_reranking_latency_ms
        integer rag_generation_latency_ms
        integer rag_agent_reasoning_latency_ms
        integer rag_tool_call_latency_ms
        real rag_tokens_per_second
        timestamp created_at
    }

    human_annotations {
        uuid id PK
        uuid evaluation_question_id FK
        text annotator_id
        integer faithfulness_rating
        integer relevancy_rating
        integer correctness_rating
        boolean has_hallucination
        text hallucination_notes
        integer overall_quality
        integer annotation_time_ms
        text notes
        timestamp created_at
    }

    guardrail_logs {
        uuid id PK
        uuid session_id FK
        uuid message_id
        text guardrail_type
        boolean triggered
        text severity
        jsonb details
        timestamp created_at
    }

    ablation_studies {
        uuid id PK
        text name
        text description
        text status
        jsonb configurations
        jsonb results
        text report
        timestamp created_at
        timestamp completed_at
    }

    statistical_analyses {
        uuid id PK
        uuid evaluation_run_id FK
        uuid ablation_study_id FK
        text analysis_type
        text metric_name
        jsonb results
        text report_en
        text report_id
        timestamp created_at
    }
```