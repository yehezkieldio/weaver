# Software Testing Methodology

This document outlines the software testing strategy implemented to ensure the reliability and validity of the RAG (Retrieval-Augmented Generation) pipeline. These testing procedures close the methodology gap by providing automated, reproducible verification of system components without human intervention.

## Testing Layers

### 1. Unit Testing (Component Level)
**Objective**: Verify the correctness of individual functions and logic modules, specifically focusing on deterministic text processing and domain-specific heuristics.
- **Tools**: Bun Test (compatible with Jest).
- **Coverage**:
  - **Chunking Strategy** (`src/lib/rag/chunking.ts`): Verifies that text splitting respects token limits, preserves academic citations, and correctly identifies document structure (headings, sections).
  - **Domain Logic** (`src/lib/rag/university-domain.ts`): Tests the extraction of metadata (course codes, faculties), query synonym expansion, and language detection.
- **Execution**: `bun test src/tests/unit`

### 2. End-to-End / System Testing (Simulated User)
**Objective**: Evaluate the full RAG pipeline from query to generation using simulated user personas.
- **Tools**: Custom Simulated User Framework (`src/lib/rag/simulated-user/`).
- **Methodology**:
  - **Personas**: Uses predefined personas (e.g., "Curious Student", "Frustrated Parent") to generate diverse queries.
  - **Scenarios**: Runs through multi-turn conversations covering various topics (admissions, curriculum, facilities).
  - **Evaluation**: Automatically grades responses based on relevance, accuracy, and tone using a judge LLM.
- **Execution**: `bun run test:simulated-user`

## Inclusion in IMRAD Paper (Methodology Section)

To include this testing strategy in your research paper, you can use the following text as a template for the **Methodology** section, specifically under a subsection titled **"System Verification and Validation"** or **"Evaluation Framework"**.

### Draft Text for Paper

> **2.x. System Verification and Automated Testing**
>
> To ensure the robustness and reliability of the developed RAG system, a multi-layered automated testing framework was implemented, complementing traditional human evaluation. This framework addresses the gap in reproducible methodology by verifying both the technical correctness of pipeline components and the semantic quality of generated responses.
>
> **2.x.1. Component-Level Verification**
> Unit tests were developed to validate critical data processing modules. Specifically, the **Document Chunking** algorithm was tested to verify its ability to preserve semantic boundaries (e.g., paragraphs, academic sections) and maintain citation integrity during text segmentation. The **Domain Logic** module, responsible for extracting metadata (e.g., course codes, faculty names) and expanding queries with domain-specific synonyms, was verified against a dataset of standard university document patterns. These tests ensure that the retrieval base is constructed correctly and that query processing is deterministic.
>
> **2.x.2. Simulated User End-to-End Testing**
> To simulate real-world usage patterns without immediate human cost, an automated **Simulated User** framework was employed. This system utilizes a secondary Large Language Model (LLM) configured with distinct user personas (e.g., "New Student", "Faculty Member") to engage the chatbot in multi-turn conversations.
>
> The framework executes defined user journeys covering key domains:
> *   **Admissions**: Queries regarding entry requirements and deadlines.
> *   **Academic Administration**: Procedures for study planning and leave of absence.
> *   **Facilities**: Information regarding campus resources.
>
> Each interaction is automatically logged and scored by an "Evaluator Agent" based on three metrics: **Relevance** (does the answer address the query?), **Accuracy** (is the information grounded in retrieved documents?), and **Completeness** (are all parts of the question answered?). This automated end-to-end testing ensures the system's functional integrity across the entire response generation pipeline.

## Running the Tests

1.  **Run Unit Tests**:
    ```bash
    bun test
    ```

2.  **Run Simulated User Tests**:
    ```bash
    bun run test:simulated-user
    ```
