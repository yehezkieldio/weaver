# Weaver: Evaluation & Testing Framework

## Executive Summary: Evaluation Architecture

- **Dual-Layered Strategy**
    - **Component-Level (RAGAS)**: Validates individual RAG components (Retrieval, Generation).
        - *Metrics*: Faithfulness, Answer Relevancy, Context Precision/Recall, Hallucination Rate.
        - *Goal*: Ensure factual consistency and retrieval accuracy.
    - **System-Level (Simulated User)**: Validates the end-to-end "implementation" and user experience.
        - *Metrics*: Task Completion Rate, Conversation Coherence, Latency, Context Retention.
        - *Goal*: Verify the system works in realistic, multi-turn scenarios.
- **Methodology**
    - **LLM-as-a-Judge**: Uses a superior LLM to grade responses against ground truth or internal consistency.
    - **LLM-as-a-User**: Uses LLM agents (Personas) to simulate diverse student/faculty interactions.
    - **Ablation Studies**: Systematically disables components (e.g., re-ranker, agentic mode) to measure their impact.
- **Execution**
    - **CLI Tools**: `scripts/run-simulated-user-tests.ts` for automated runs.
    - **Reporting**: Auto-generates Markdown reports with pass/fail criteria and statistical analysis.

---

## Detailed Investigation Report

### 1. Component-Level Evaluation (RAGAS)
Located in `src/lib/rag/evaluation.ts`

This layer focuses on the technical accuracy of the RAG pipeline. It implements the **RAGAS** (Retrieval-Augmented Generation Assessment) framework.

- **Key Metrics**:
    - **Faithfulness**: Does the answer rely *only* on the retrieved context? (Prevents external hallucinations).
    - **Answer Relevancy**: Does the answer directly address the user's query?
    - **Context Precision/Recall**:
        - *Precision*: How much of the retrieved content was actually useful?
        - *Recall*: Did we retrieve all the necessary information?
    - **Hallucination Detection**: Specialized metrics for factual consistency and source attribution.
    - **Domain Specifics**: Academic rigor and citation accuracy (critical for this university context).

- **Implementation Details**:
    - **Judge Model**: A high-capability LLM acts as the evaluator.
    - **Ablation Support**: The code supports running evaluation matrices to compare `Vector Only` vs `Hybrid` vs `Agentic` architectures.

### 2. System-Level Evaluation (Simulated User Testing)
Located in `src/lib/simulated-user/`

This layer addresses the "Implementation" aspect of the research by simulating real-world usage.

- **Why it's needed**: Component metrics like "Context Precision" don't tell us if a user can actually successfully register for a course or find specific tuition fees in a multi-turn conversation.
- **Architecture**:
    - **Personas**: Pre-defined user profiles (e.g., "Anxious New Student", "Busy Faculty Member") with specific vocabulary and knowledge gaps.
    - **Scenarios**: Structured goals the simulated user tries to achieve (e.g., `krs-registration`, `tuition-payment-info`).
    - **User Simulator**: An LLM agent that holds the persona and state, generating realistic follow-up questions based on the chatbot's replies.
    - **Evaluator**: A separate process that analyzes the *entire transcript* to grade coherence and task completion.

- **Key Metrics**:
    - **Task Completion Rate**: Success/Failure binary.
    - **Conversation Coherence**: Logical flow of dialogue.
    - **Latency**: System response time (P95, P99).

### 3. Execution & Reporting Flow
Entry point: `scripts/run-simulated-user-tests.ts`

The project includes robust tooling to automate this process.

- **Command Line Interface**:
    ```bash
    bun scripts/run-simulated-user-tests.ts --quick          # Run a fast smoke test
    bun scripts/run-simulated-user-tests.ts --all-scenarios  # Run full suite
    bun scripts/run-simulated-user-tests.ts --scenario <id>  # Debug specific case
    ```

- **Output Artifacts**:
    - **Console Output**: Real-time progress and summary statistics.
    - **Markdown Reports**: Detailed files saved to `research/results/` containing:
        - Executive summary of the run.
        - Per-scenario breakdown.
        - Error analysis.
        - Academic justification (why these results matter for the paper).

### 4. Conclusion
The evaluation framework is highly mature and specifically tailored for academic publication. It moves beyond simple "accuracy" metrics to provide a holistic view of system performance, effectively bridging the gap between *technical correctness* (RAGAS) and *usability* (Simulated User).
