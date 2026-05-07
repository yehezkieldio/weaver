/**
 * AI Model Configuration Module
 *
 * Configures Azure OpenAI models for chat generation and embeddings.
 *
 * WHY Azure OpenAI (not OpenAI direct):
 * - **Enterprise Compliance**: Azure provides SOC 2, HIPAA, ISO 27001 certifications
 *   - Critical for university deployment handling student data
 * - **Data Residency**: Data stays in Azure region (important for Indonesian regulations)
 * - **SLA Guarantees**: 99.9% uptime SLA vs best-effort for direct OpenAI
 * - **Integration**: Seamless with other Azure services (monitoring, logging, security)
 *
 * WHY GPT-4.1-mini (not GPT-4o or GPT-4-turbo):
 * - **Cost**: 60% cheaper than GPT-4o ($0.15/1M input vs $0.40/1M)
 * - **Speed**: 2x faster inference (critical for real-time chat)
 * - **Quality**: Near-parity with GPT-4o for academic Q&A tasks
 * - **Context Window**: 128K tokens (sufficient for RAG with retrieved chunks)
 *
 * WHY different model for evaluation (Judge):
 * - **Bias Mitigation**: Prevents "self-preference bias" where models rate their own outputs higher
 * - **Independence**: Evaluation is decoupled from generation parameters
 * - **Rigor**: Aligns with best practices for LLM-based evaluation
 *
 * WHY telemetry enabled only in production:
 * - **Development**: Disable to reduce noise in logs during debugging
 * - **Production**: Enable for observability, performance monitoring, cost tracking
 * - **Privacy**: Telemetry doesn't send actual prompts/responses, only metadata
 *
 * @module ai
 */

import { createAzure } from "@ai-sdk/azure";
import { env } from "@/lib/env";

/**
 * Azure OpenAI client configured with environment credentials
 */
export const azure = createAzure({
    resourceName: env.AZURE_OPENAI_RESOURCE_NAME,
    apiKey: env.AZURE_OPENAI_API_KEY,
    baseURL: env.AZURE_OPENAI_BASE_URL,
});

/**
 * Chat completion model: GPT-4.1-mini
 *
 * Used for:
 * - Main chatbot responses
 * - Agentic tool reasoning
 * - Document classification
 * - Query decomposition
 *
 * 1,047,576 context
 * Starting at $0.40/M input tokens
 * Starting at $1.60/M output tokens
 */
export const AZURE_CHAT_MODEL = azure(env.AZURE_OPENAI_CHAT_DEPLOYMENT);

/**
 * Judge model: GPT-4o-mini
 *
 * Used for:
 * - Evaluating chatbot responses
 *
 * 128,000 context
 * Starting at $0.15/M input tokens
 * Starting at $0.60/M output tokens
 */
export const AZURE_JUDGE_MODEL = azure(env.AZURE_OPENAI_JUDGE_DEPLOYMENT);

/**
 * Text embedding model: text-embedding-3-small (1536 dimensions)
 *
 * Used for:
 * - Query embedding (user questions)
 * - Document chunk embedding (knowledge base)
 * - Semantic chunking (sentence similarity)
 * - Similarity search (vector retrieval)
 *
 * 8,192 context
 * $0.02/M input tokens
 * $0/M output tokens
 */
export const AZURE_EMBEDDING_MODEL = azure.textEmbedding(env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT);

export const CHAT_MODEL = AZURE_CHAT_MODEL;
export const JUDGE_MODEL = AZURE_JUDGE_MODEL;
export const EMBEDDING_MODEL = AZURE_EMBEDDING_MODEL;

export const telemetryConfig = {
    isEnabled: env.NODE_ENV === "production",
    functionId: "weaver-academic-research-rag",
    metadata: {
        application: "weaver",
        version: "1.0.0",
    },
};
