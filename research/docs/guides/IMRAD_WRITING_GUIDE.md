# IMRAD Writing Guide: Introduction & Methods
**Project:** Weaver (Weaver)
**Date:** December 21, 2025

This guide provides a structured approach to writing the **Introduction** and **Methods** sections of your research paper. It is tailored specifically to your project's architecture (Hybrid RAG, Agentic, Indonesian Academic Domain).

---

## Part 1: The Introduction
**Goal:** Lead the reader from a general problem to your specific solution. Use the "Inverted Pyramid" structure.

### 1.1 Structure & Content Outline

#### Paragraph 1: Broad Context (The "Hook")
*   **Topic:** The evolution of information retrieval in higher education.
*   **Key Concept:** Universities generate massive amounts of unstructured data (regulations, curriculum, guidelines).
*   **Current State:** Traditional keyword search is insufficient; LLMs offer a solution but suffer from hallucinations (knowledge cutoff).
*   **Drafting Tip:** "Information seeking in academic environments is characterized by high precision requirements and complex, domain-specific terminology..."

#### Paragraph 2: The Problem (Specific to Indonesia/Universities)
*   **Source Material:** `../01_overview.md`
*   **Pain Points:**
    1.  **Fragmentation:** Data scattered across PDFs, websites, and booklets.
    2.  **Terminology:** Specific Indonesian academic terms (KRS, SKS, Cuti Akademik) are often misunderstood by general LLMs.
    3.  **Language:** Low-resource language challenges for RAG compared to English.
*   **Drafting Tip:** "However, deploying generic LLMs in Indonesian universities faces unique challenges, particularly regarding local administrative terminology and the hallucination of critical academic policies."

#### Paragraph 3: The Gap (What is missing?)
*   **Source Material:** `../reports/METHODOLOGY_GAP_ANALYSIS.md` & `../02_research_context.md`
*   **The Gap:** Most RAG research focuses on English. There is a lack of rigorous evaluation for **Agentic** vs **Standard** RAG in the context of **Indonesian** academic queries.
*   **Drafting Tip:** "While RAG has been extensively studied, its application to structurally complex, non-English academic domains remains under-explored, particularly regarding the efficacy of agentic reasoning for query decomposition."

#### Paragraph 4: The Solution & Objectives (Your Contribution)
*   **Source Material:** `../02_research_context.md`
*   **The Proposed System:** An **Agentic RAG** system using **Hybrid Retrieval** (Vector + BM25) and **Ensemble Reranking**.
*   **Research Questions (RQs):**
    1.  Does hybrid retrieval outperform vector-only in this domain?
    2.  Does agentic reasoning improve accuracy for complex questions?
    3.  What is the optimal chunking strategy for academic documents?
*   **Drafting Tip:** "This study proposes 'Weaver', an agentic RAG system optimized for Indonesian academic data. We evaluate the system using a rigorous component-level framework to isolate the impact of hybrid retrieval and reranking strategies."

---

## Part 2: The Methods
**Goal:** Provide enough detail for a skilled peer to reproduce your work. Focus on **"what was done"** and **"how"**.

### 2.1 Subsection: System Architecture
*   **Overview:** Describe the pipeline briefly.
*   **Key Components:**
    *   **Orchestration:** Next.js / LangChain / Vercel AI SDK.
    *   **LLM:** GPT-4o-mini (reasoning & generation).
    *   **Database:** PostgreSQL with `pgvector`.
*   **Figure Reference:** "The overall system architecture is illustrated in Figure 1..." (Use the diagram from `../04_system_architecture.md`).

### 2.2 Subsection: Data Processing (The "Corpus")
*   **Source Material:** `../05_rag_pipeline.md` (Section 3)
*   **Documents:** Describe the dataset (Student Handbook, Academic Regulations, etc.).
*   **Chunking Strategy (Crucial):**
    *   Mention **Recursive Character Chunking** vs **Semantic Chunking**.
    *   **Insert Formula:** The **Chunk Quality Score ($S_{quality}$)**. This is a novel contribution.
    *   *LaTeX Snippet:*
        $$ S_{quality} = 0.25 I_{den} + 0.25 S_{imp} + 0.15 C_{pres} + 0.15 K_{conc} + 0.20 C_{omp} $$

### 2.3 Subsection: Retrieval & Reranking (The Core Algorithm)
*   **Source Material:** `../05_rag_pipeline.md` (Section 4 & 5)
*   **Hybrid Retrieval:**
    *   Explain the combination of **Dense Vector** (Cosine) and **Sparse Keyword** (BM25+).
    *   Mention **Reciprocal Rank Fusion (RRF)** with $k=60$.
*   **Reranking:**
    *   Describe the **Ensemble Strategy**.
    *   **Insert Formula:** The weighted ensemble score.
    *   *LaTeX Snippet:*
        $$ S_{ensemble} = \frac{0.4 S_{ce} + 0.4 S_{llm} + 0.2 S_{orig}}{1.0} $$

### 2.4 Subsection: Agentic Reasoning
*   **Source Material:** `../05_rag_pipeline.md` (Section 6)
*   **Mechanism:** Explain how the agent decomposes queries.
*   **Tools:** List the specific tools (e.g., `search_documents`, `verify_claim`).
*   **Latency Decomposition:** Briefly mention how you measure "Planning" vs "Execution" time.

### 2.5 Subsection: Evaluation Framework
*   **Source Material:** `../06_evaluation_framework.md` & `../10_simulated_user_testing.md`
*   **Important:** Explicitly state you are using **Component-Level Evaluation** (RAGAS) and **System-Level Evaluation** (Simulated User).
*   **Metric 1: RAGAS:** Faithfulness, Answer Relevancy.
    *   *Note:* Mention the Laplace smoothing if you used it.
*   **Metric 2: Simulated User:**
    *   Define **Task Completion Rate ($R_{TC}$)**.
    *   Define **Conversation Coherence ($S_{coh}$)**.
*   **Statistical Analysis:**
    *   Mention using **t-tests** and **ANOVA** to verify significance ($p < 0.05$). 

---

## Part 3: Writing Tools & Helpers

### 3.1 Key Terminology Verification
Ensure you use these terms consistently:
*   **"Hybrid Retrieval"** (not "mixed search")
*   **"Agentic RAG"** (not "AI agent chatbot")
*   **"Hallucination Rate"** (specific metric)
*   **"Cross-Encoder"** (specific reranking model type)

### 3.2 LaTeX Formulas Ready-to-Copy
**Chunk Quality Score:**
```latex
S_{quality} = w_1 I_{den} + w_2 S_{imp} + w_3 C_{pres} + w_4 K_{conc} + w_5 C_{omp}
```
**Context Retention Rate:**
```latex
R_{ret} = \frac{\sum_{i=1}^{N} \sum_{t=2}^{T_i} \mathbb{1}(\text{ContextUsed}_{i,t})}{\sum_{i=1}^{N} (T_i - 1)}
```

### 3.3 Addressing the "Gap" (Evaluation vs. UI)
*   **The Issue:** Your paper title says "Implementation" (implies full app), but evaluation is mostly RAG metrics.
*   **The Fix:** In the *Methods* section, add a subsection **"2.6 Study Limitations & Scope"**.
*   **Drafting Text:** "While the system includes a full conversational interface (UI), this study focuses on the *algorithmic performance* of the RAG pipeline. The UI serves as a deployment demonstrator. Evaluation is conducted using isolated query pairs to ensure statistical reproducibility, complemented by simulated user testing to approximate conversational coherence."

---

## Part 4: Checklist for Success

- [ ] **Introduction:** Did I mention the specific challenges of *Indonesian* language processing?
- [ ] **Introduction:** Is the research gap clear? (e.g., "Lack of agentic RAG benchmarks for Indonesian academia").
- [ ] **Methods:** Did I include the **Chunk Quality Score** formula? (It's a strong novelty point).
- [ ] **Methods:** Did I specify the **embedding model** (text-embedding-3-small) and **dimensions** (1536)?
- [ ] **Methods:** Did I explain *why* I chose **Hybrid** over Vector-only? (To capture specific academic keywords like 'KRS').
- [ ] **General:** Is the tense correct? (Introduction = Present/Past mix; Methods = Past tense: "We implemented...", "Data was collected...").
