# Agentic Reasoning: A First Principles Analysis

## Abstract

Standard RAG systems operate on a linear "Retrieve-then-Generate" pipeline. While efficient, this approach fails when queries are complex, multi-faceted, or ambiguous. The **Agentic Reasoning** module (`src/lib/rag/agentic-rag.ts`) replaces this linear pipeline with a dynamic **Cognitive Loop**. The Large Language Model (LLM) is not just a text generator but an orchestrator that actively decides *what* information it needs, *how* to get it, and *when* it has enough information to answer.

## 1. The Agentic Paradigm

In this architecture, the LLM is initialized with a system prompt that defines its persona and a set of **executable tools**. The flow is as follows:

1.  **Reasoning:** The Agent analyzes the user's query.
2.  **Tool Selection:** It decides if it needs to use a tool (e.g., "I need to search for tuition fees").
3.  **Execution:** The system executes the selected tool (retrieving documents).
4.  **Observation:** The tool's output (search results) is fed back to the Agent.
5.  **Iteration:** The Agent evaluates the new information. It can decide to:
    *   Synthesize a final answer.
    *   Refine its search (e.g., "The previous search was too broad, I will search for 'international student tuition' specifically").
    *   Verify a claim.

## 2. The Tool Set

The cognitive capabilities of the agent are defined by the tools provided to it.

### 2.1. `search_documents`
*   **Purpose:** The primary sensory organ of the agent. It interfaces with the **Retrieval Engine** (described in the Retrieval Engine report).
*   **Input:** A specific search query string.
*   **Output:** A list of text chunks with citation metadata.
*   **Agent Strategy:** The agent often reformulates the user's original vague query into multiple precise search queries.

### 2.2. `decompose_query` (Implicit or Explicit)
*   **Purpose:** Breaks complex questions (e.g., "Compare the engineering and arts faculties") into sub-questions ("What are the details of the engineering faculty?", "What are the details of the arts faculty?").
*   **Execution:** This is often an emergent behavior of the prompt engineering or a specific tool that plans a multi-step retrieval strategy.

### 2.3. `verify_claim`
*   **Purpose:** A specialized step to reduce hallucinations.
*   **Execution:** Before finalizing an answer, the agent can check specific facts against the retrieved context to ensure faithfulness.

## 3. Implementation with Vercel AI SDK

The system leverages the Vercel AI SDK's `streamText` function with the `tools` parameter.

```typescript
// Conceptual Flow
const result = streamText({
  model: openai('gpt-4o'),
  tools: {
    search: tool({ ... }),
    verify: tool({ ... })
  },
  maxSteps: 5, // Limits the loop to prevent infinite recursion
});
```

*   **`maxSteps`:** A critical safety guardrail. It prevents the agent from getting stuck in an infinite loop of searching and reasoning.
*   **Round-Trips:** The SDK manages the complex HTTP round-trips required between the server and the LLM provider for each tool call.

## 4. Persisting the Thought Process

A key requirement for this research platform is **Observability**. The system does not just discard the intermediate steps.

*   **Streaming Steps:** As the agent loops, "Tool Call" events and "Tool Result" events are streamed to the client in real-time.
*   **Database Logging:** Every `agentStep` (Thought -> Action -> Observation) is written to the `agentSteps` table in the database.

## 5. Conclusion

The Agentic Reasoning architecture shifts the burden of complexity from the *retrieval algorithm* to the *LLM's reasoning*. Instead of trying to build a perfect search engine that understands every query type, we build a search engine that exposes a simple API, and we empower the LLM to "learn" how to use it effectively to solve the user's problem. This mimics human research behavior: iterative, self-correcting, and evidence-based.
