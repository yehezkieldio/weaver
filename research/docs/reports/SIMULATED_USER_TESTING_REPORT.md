# Simulated User Testing Report: Methodology & Rationale

**Date**: December 20, 2025
**System**: Universitas Mulia RAG Chatbot
**Framework**: LLM-as-a-User / LLM-as-a-Judge

---

## Executive Summary

To bridge the gap between technical component metrics (like precision/recall) and actual user experience, a **Simulated User Testing** framework was developed. This novel approach utilizes secondary Large Language Models (LLMs) to act as diverse user personas (e.g., "Curious Student", "Frustrated Parent") engaging in multi-turn conversations with the system.

This methodology directly addresses the "Implementation" claim of the research by validating the entire system flow—from user interface logic to RAG retrieval and final response generation—providing a holistic measure of the chatbot's effectiveness in a real-world academic context.

---

## Executive Bulletpoints

*   **Holistic Validation**: Moves beyond static QA evaluation to test dynamic, multi-turn conversations, measuring how well the system maintains context and helps users achieve goals.
*   **Persona-Based Simulation**: Uses distinct personas with specific goals (e.g., "Register for KRS", "Find Scholarship Info") to ensure diverse coverage of system capabilities.
*   **Automated Evaluation**: An "Evaluator Agent" automatically scores interactions on Relevance, Accuracy, and Tone, ensuring scalable and reproducible quality assurance.
*   **Research Gap Closure**: Specifically targets the lack of "system-level" evaluation in standard RAG papers, offering concrete metrics on Task Completion Rates and Conversation Coherence.

---

## 1. Methodology: LLM-as-a-User

The core of this testing strategy is the use of an LLM to simulate human behavior. Unlike static datasets, these simulated users react to the chatbot's responses, asking follow-up questions or expressing confusion if the answer is unclear.

*   **Personas**: Defined JSON profiles containing:
    *   **Role**: e.g., "New Student".
    *   **Goal**: e.g., "Understand the admission requirements for Computer Science."
    *   **Personality**: e.g., "Impatient", "Detailed-oriented".
*   **Scenarios**: Pre-scripted high-level objectives (e.g., "Admissions Journey") that guide the simulated user's initial prompts while allowing dynamic follow-ups.

## 2. Evaluation Metrics

The framework collects specific metrics that are vital for the "Results" and "Discussion" sections of the research paper:

### A. System-Level Quality Metrics
*   **Task Completion Rate**: The percentage of scenarios where the simulated user successfully achieved their defined goal (e.g., found the tuition fee).
*   **Conversation Coherence**: A score (0.0 - 1.0) measuring how well the system maintains context across multiple turns (e.g., remembering the user asked about "Computer Science" in the previous turn).
*   **Context Retention Rate**: The ability of the system to recall entities mentioned earlier in the conversation without the user repeating them.
*   **Information Coverage**: How much of the necessary information was provided compared to a "Gold Standard" response.

### B. Performance Metrics
*   **Average Latency**: Time taken for the system to generate a full response.
*   **P95 & P99 Latency**: Worst-case performance indicators to ensure reliability.

## 3. Implementation Details

The testing framework is built into the project codebase under `src/lib/rag/simulated-user/` and executed via `scripts/run-simulated-user-tests.ts`.

*   **Runner**: Orchestrates the conversation loop:
    1.  Simulated User generates a prompt based on Persona + History.
    2.  System generates a response via RAG pipeline.
    3.  Interaction is logged.
    4.  Repeat until Goal Met or Max Turns reached.
*   **Evaluator**: A separate LLM call that analyzes the full transcript after the conversation ends to assign scores and generate the final report.

## 4. Academic Justification (Why this matters)

In the context of the paper **"Implementasi Agentic Retrieval-Augmented Generation (RAG) Untuk Sistem Layanan Informasi Perguruan Tinggi"**:

1.  **Validates "Implementation"**: Standard RAG metrics (Faithfulness, Answer Relevancy) only test components. Simulated User testing validates the **application** as a whole product.
2.  **Scalability**: Allows for testing hundreds of conversation variations without the high cost and slowness of human testers.
3.  **Reproducibility**: The tests are deterministic in their setup and can be re-run to prove that system improvements (e.g., better chunking) lead to better conversation outcomes.
4.  **Gap Analysis**: It fills the "Methodology Gap" by providing a rigorous, automated way to assess "User Satisfaction" proxies (Coherence, Task Completion) alongside traditional technical metrics.
