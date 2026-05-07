# Weaver

Weaver is a Large Language Model-based Question Answering system for academic information at Universitas Mulia. It uses an Agentic Retrieval-Augmented Generation (RAG) architecture so answers stay connected to source documents and can include citations.

> **Language and audience disclaimer**
>
> Weaver is an Indonesian academic project. This README is written in English for repository orientation, but most project documents, source corpora, evaluation materials, user-facing copy, and operational notes are intended for an Indonesian audience and are commonly written in Bahasa Indonesia.

The project is developed for the Penulisan dan Publikasi Ilmiah course in Semester 5 by students of the Informatics Study Program, Faculty of Computer Science, Universitas Mulia. Evaluation outputs are available in `research/results`.

## Project Information

- **Title:** Implementasi Agentic Retrieval-Augmented Generation (RAG) Untuk Sistem Layanan Informasi Perguruan Tinggi: Studi Kasus pada Universitas Mulia Balikpapan
- **Researchers:** Yehezkiel Dio Sinolungan, Adryo Faresy Devera, Andre Marthinus Lumempouw
- **Institution:** Universitas Mulia, Balikpapan
- **Focus:** Comparing standard RAG and Agentic RAG using RAGAS metrics and statistical significance testing.

## Main Features

### Agentic RAG

Weaver does not answer every question from a single retrieval pass. The system can plan retrieval steps, break complex questions into sub-questions, run multiple retrieval tools, and synthesize answers from several documents.

Core capabilities:

- Query decomposition into sub-questions.
- Parallel retrieval to reduce latency.
- Answer synthesis from PDF, DOCX, TXT, Markdown, and web sources.
- Claim verification before the final answer is sent to the user.
- Source citations in `[1]`, `[2]`, and similar formats.

### Hybrid Retrieval

Retrieval combines semantic and lexical search:

- **Vector search:** `text-embedding-3-small` embeddings with PostgreSQL and `pgvector`.
- **Keyword search:** Okapi BM25 for specific terms such as lecturer names, course codes, and administrative terminology.
- **Reciprocal Rank Fusion:** Combines vector and keyword results without manual score normalization.

### Document Processing

The document pipeline supports:

- PDF through `unpdf`.
- DOCX through `mammoth`.
- TXT and Markdown.
- Adaptive chunking strategies, including recursive, semantic, sentence-window, and hierarchical chunking.
- Metadata extraction for course codes, lecturer names, chapters, articles, and document types.
- Indonesian stemming and stopword removal for BM25.

### Reranking

Candidate documents can be reranked before they are used as answer context:

- Cross-encoder `ms-marco-MiniLM-L2-v2`.
- LLM-based reranking with GPT-4o-mini.
- Ensemble reranking across multiple methods.

### Evaluation

Evaluation modules are available for research use:

- RAGAS: faithfulness, answer relevancy, context precision, context recall, and answer correctness.
- Hallucination detection based on Natural Language Inference.
- Ablation studies to measure the contribution of retrieval, chunking, reranking, and other components.
- Statistical analysis with paired t-test, ANOVA, effect size, and bootstrap confidence interval.

## Stack

- **Framework:** Next.js 16 App Router
- **Runtime and package manager:** Bun
- **Database:** PostgreSQL with the `pgvector` extension
- **ORM:** Drizzle ORM
- **AI provider:** Azure OpenAI
- **Chat models:** GPT-4.1-mini, GPT-4o-mini
- **Embedding model:** `text-embedding-3-small`
- **Styling:** Tailwind CSS and shadcn/ui-style components

## Pipeline

1. The user submits a question.
2. Guardrails validate the input.
3. The agent creates a retrieval plan.
4. The system runs hybrid retrieval with vector search, BM25, and RRF.
5. Candidate documents are processed by the reranker.
6. The LLM generates an answer with citations.
7. Output guardrails check the final answer.

## Research Evaluation

The evaluation dashboard is available at `/evaluation`. The academic question dataset covers regulations, procedures, fees, study programs, and campus information.

Evaluation is performed at two levels:

- **Component-level evaluation:** Measures retrieval and generation quality per question using RAGAS.
- **System-level evaluation:** Uses LLM-based user simulation with personas such as new students, final-year students, and lecturers.

System-level metrics include:

- Task completion rate.
- Conversation coherence.
- Context retention.

Statistical analysis includes:

- Paired t-test to compare configurations on the same questions.
- One-way ANOVA to compare retrieval or chunking strategies.
- Bootstrap confidence interval for average metric estimates.

## Folder Structure

```text
/
├── research/
│   ├── corpus/             # Universitas Mulia source documents
│   ├── docs/               # Technical documentation and reports
│   │   ├── guides/
│   │   └── reports/
│   ├── paper/              # Academic writing materials
│   ├── results/            # Evaluation and statistical analysis outputs
│   └── data.txt            # Raw source-data dump
├── scripts/                # Evaluation, analysis, and ingestion utilities
├── src/
│   ├── app/                # Next.js App Router
│   ├── components/         # UI components
│   └── lib/
│       ├── ai/             # Azure OpenAI configuration
│       ├── db/             # Database schema and connection
│       ├── rag/            # Core RAG logic
│       └── statistics/     # Statistical analysis
```

## Running the Project

### Prerequisites

- Bun
- PostgreSQL with the `vector` extension
- Azure OpenAI account and deployments

### Installation

```bash
git clone https://github.com/username/weaver.git
cd weaver
bun install
```

### Environment

Copy `.env.example` to `.env`, then fill in the required credentials.

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/weaver"
AZURE_OPENAI_API_KEY="..."
AZURE_OPENAI_RESOURCE_NAME="..."
AZURE_OPENAI_CHAT_DEPLOYMENT="gpt-4.1-mini"
AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-small"
```

### Database

```bash
bun run db:push
```

### Development

```bash
bun dev
```

Primary routes:

- Chat: `http://localhost:3000`
- Knowledge base: `http://localhost:3000/manage`
- Evaluation dashboard: `http://localhost:3000/evaluation`

## Limitations

- The system is optimized for Bahasa Indonesia.
- Complex table structures in PDFs may change during extraction.
- Agentic mode has higher latency than standard RAG because it includes additional planning and verification steps.

## License

MIT License, copyright 2025-2026 Yehezkiel Dio Sinolungan, Adryo Faresy Devera, and Andre Marthinus Lumempouw. See `LICENSE`.
