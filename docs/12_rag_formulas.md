# RAG Pipeline Methodologies & Mathematical Formulations

## 1. Hybrid Retrieval System

The system employs a hybrid retrieval strategy combining sparse vector search (Okapi BM25+) and dense vector search (Cosine Similarity), fused via Reciprocal Rank Fusion (RRF).

### 1.1. Vector Similarity (Dense Retrieval)
Vector search is performed using `pgvector`'s distance operator. The system converts cosine distance to similarity:

$$ S_{vector}(\vec{q}, \vec{d}) = 1 - \text{cosine\_distance}(\vec{q}, \vec{d}) = \frac{\vec{q} \cdot \vec{d}}{\|\vec{q}\| \|\vec{d}\|} $$

Where $\vec{q}$ is the query embedding and $\vec{d}$ is the document chunk embedding (1536 dimensions).

### 1.2. Okapi BM25+ (Sparse Retrieval)
The system implements the BM25+ variant to prevent negative scores for common terms and handle document length normalization.

$$ \text{BM25}(D, Q) = \sum_{q \in Q} \text{IDF}(q) \cdot \frac{f(q, D) \cdot (k_1 + 1)}{f(q, D) + k_1 \cdot (1 - b + b \cdot \frac{|D|}{\text{avgdl}})} + \delta $$

**Where:**
- $f(q, D)$: Term frequency of term $q$ in document $D$.
- $|D|$: Length of document $D$ (in words).
- $\text{avgdl}$: Average document length in the corpus.
- $\delta = 1$: Delta parameter for BM25+ (prevents negative scores).
- **Hyperparameters** (optimized for academic text):
  - $k_1 = 1.2$ (Controls term frequency saturation)
  - $b = 0.75$ (Controls document length normalization)

**Inverse Document Frequency (IDF):**
$$ \text{IDF}(q) = \ln \left( \frac{N - n(q) + 0.5}{n(q) + 0.5} + 1 \right) $$
- $N$: Total number of documents.
- $n(q)$: Number of documents containing term $q$.

### 1.3. Reciprocal Rank Fusion (RRF)
To combine the ranked lists from Vector and BM25 searches into a unified ranking without requiring score normalization:

$$ \text{RRF}_{\text{score}}(d) = \sum_{r \in \mathcal{R}} \frac{1}{k + \text{rank}_r(d)} $$

**Where:**
- $\mathcal{R} = \{\text{Vector}, \text{BM25}\}$: The set of rankers.
- $\text{rank}_r(d)$: The rank of document $d$ in system $r$ (1-based).
- $k = 60$: Smoothing constant (standard empirically optimal value).

---

## 2. Document Processing & Chunking

### 2.1. Chunk Quality Scoring
A composite quality score ($S_{quality}$) is calculated for each chunk to weight retrieval results, prioritizing semantically rich and structurally important content.

$$ S_{quality} = w_1 I_{den} + w_2 S_{imp} + w_3 C_{pres} + w_4 K_{conc} + w_5 C_{omp} $$

**Weights:**
- $w_1 = 0.25$ (Information Density)
- $w_2 = 0.25$ (Structural Importance)
- $w_3 = 0.15$ (Citation Presence)
- $w_4 = 0.15$ (Keyword Concentration)
- $w_5 = 0.20$ (Completeness)

**Components:**
1.  **Information Density** ($I_{den}$): Ratio of unique words to total words.
    $$ I_{den} = \frac{|V_{unique}|}{|V_{total}|} $$
2.  **Structural Importance** ($S_{imp}$): $0.9$ for key sections (Abstract, Methodology, Conclusion), $0.6$ for others with headers, $0.5$ default.
3.  **Citation Presence** ($C_{pres}$):
    $$ C_{pres} = \min(1.0, 0.3 \times N_{citations}) $$
4.  **Keyword Concentration** ($K_{conc}$): Density of academic terms per 100 words.
    $$ K_{conc} = \min\left(1.0, \frac{N_{keywords}}{N_{words}} \times 10\right) $$
5.  **Completeness** ($C_{omp}$): $0.5$ if starts with capital + $0.5$ if ends with sentence terminator.

### 2.2. Semantic Chunking (Sliding Window)
To optimize embedding costs while maintaining semantic boundaries, a sliding window approach is used for boundary detection.

- **Window Size ($W$)**: 4 sentences.
- **Stride ($S$)**: 2 sentences.
- **Boundary Condition**: A semantic split occurs between window $i$ and $i+1$ if:
  $$ \text{sim}(\vec{w}_i, \vec{w}_{i+1}) < \tau $$
  Where $\tau = 0.5$ (default threshold).

---

## 3. Reranking Strategies

### 3.1. Ensemble Reranking
Combines scores from a lightweight Cross-Encoder (TinyBERT) and a Listwise LLM ranker for maximum precision.

$$ S_{ensemble} = \frac{w_{ce} S_{ce} + w_{llm} S_{llm} + w_{orig} S_{orig}}{w_{ce} + w_{llm} + w_{orig}} $$

**Weights:**
- $w_{ce} = 0.4$ (Cross-Encoder)
- $w_{llm} = 0.4$ (LLM Listwise)
- $w_{orig} = 0.2$ (Original Hybrid Score)

### 3.2. Cross-Encoder Scoring
Directly estimates relevance probability $P(relevant|query, document)$ using a BERT-based classifier trained on MS-MARCO.

---

## 4. Evaluation Metrics (RAGAS & IR)

### 4.1. Faithfulness (Laplace Smoothed)
Measures the proportion of claims in the generated answer that can be inferred from the given context. Laplace smoothing is applied to prevent extreme binary values (0 or 1) in short answers.

$$ \text{Faithfulness} = \frac{|C_{supported}| + \alpha}{|C_{total}| + 2\alpha} $$

**Where:**
- $C_{total}$: Total atomic claims extracted from the answer.
- $C_{supported}$: Number of claims supported by the retrieved context (verified via NLI).
- $\alpha = 0.5$: Smoothing parameter.

### 4.2. Answer Relevancy
Measures semantic similarity between the original query and synthetic queries generated from the answer.

$$ \text{Relevancy} = \frac{1}{N} \sum_{i=1}^N \cos(\vec{q}_{orig}, \vec{q}_{synth_i}) $$

### 4.3. Answer Correctness
A weighted combination of semantic similarity to the ground truth and a factual correctness score determined by an LLM judge.

$$ S_{correctness} = 0.3 \cdot \cos(\vec{a}_{gen}, \vec{a}_{truth}) + 0.7 \cdot S_{factual} $$

### 4.4. Retrieval Metrics

**NDCG@K (Normalized Discounted Cumulative Gain):**
$$ \text{DCG}_K = \sum_{i=1}^K \frac{rel_i}{\log_2(i+1)} $$
$$ \text{NDCG}_K = \frac{\text{DCG}_K}{\text{IDCG}_K} $$
- $rel_i$: Binary relevance (1 if chunk ID is in ground truth set, 0 otherwise).

**MRR (Mean Reciprocal Rank):**
$$ \text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i} $$
- $\text{rank}_i$: Rank of the first relevant document for query $i$.

---

## 5. Agentic RAG System

### 5.1. Latency Decomposition
To evaluate the overhead of agentic reasoning, total latency ($T_{total}$) is decomposed into:

$$ T_{total} = T_{plan} + T_{reason} + T_{tool} + T_{synth} + T_{ret} $$

**Estimations (when explicit timestamps unavailable):**
- **Planning** ($T_{plan}$): $\approx 0.25 \times T_{step_1}$ (Initial LLM thought process).
- **Reasoning** ($T_{reason}$): $\approx 0.12 \times T_{tool}$ (Intermediate reasoning between tool calls).
- **Synthesis** ($T_{synth}$): Residual time, $T_{total} - (T_{plan} + T_{reason} + T_{tool})$.

### 5.2. Tool Execution
Tools are executed in parallel when possible to minimize $T_{tool}$:
$$ T_{tool\_batch} = \max(t_1, t_2, ..., t_n) $$
Where $t_i$ is the execution time of individual tools in a parallel batch.
