# Mathematical Formulations and Methodologies for RAG Evaluation

## Abstract
This document details the mathematical framework, statistical methodologies, and metric definitions implemented in the evaluation pipeline for the Agentic RAG system. It covers the formulas used for statistical hypothesis testing, effect size estimation, and simulated user testing metrics. These formulations form the basis for the results presented in the associated IMRAD paper.

## 1. Statistical Analysis Framework

The statistical analysis module (`scripts/run-statistical-analysis.py`) implements a rigorous frequentist framework to compare system configurations (Ablation Study) and validate improvements against baselines (RAG vs. Non-RAG).

### 1.1 Descriptive Statistics

For a given metric distribution $X = \{x_1, x_2, ..., x_n\}$, the following estimators are calculated:

**Mean ($\bar{x}$):**
$$ \bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i $$

**Standard Error of the Mean (SEM):**
$$ SEM = \frac{s}{\sqrt{n}} $$
where $s$ is the sample standard deviation.

**Confidence Intervals (Parametric):**
$$ CI_{95\%} = \bar{x} \pm t_{(n-1, 0.975)} \times SEM $$
where $t_{(n-1, 0.975)}$ is the critical value from the t-distribution.

**Bootstrap Confidence Intervals (Non-Parametric):**
For non-normal distributions, we employ bootstrap resampling:
1. Generate $B$ resampled datasets $X^*_1, ..., X^*_B$ by sampling $n$ items from $X$ with replacement.
2. Calculate the statistic $\theta^*_b$ for each resample.
3. Determine the interval $[	heta^*_{(\alpha/2)}, \theta^*_{(1-\alpha/2)}]$ from the percentiles of the bootstrap distribution.

### 1.2 Effect Size Calculations

Effect sizes quantify the magnitude of differences, independent of sample size.

**Cohen's $d$ (for t-tests):**
Used to measure the standardized difference between two means.
$$ d = \frac{\bar{x}_1 - \bar{x}_2}{s_{pooled}} $$
$$ s_{pooled} = \sqrt{\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2}} $$
*Interpretation:* $0.2$ (Small), $0.5$ (Medium), $0.8$ (Large).

**Rank-Biserial Correlation ($r_{rb}$) (for Mann-Whitney U):**
Used for non-parametric comparisons of independent groups.
$$ r_{rb} = 1 - \frac{2U}{n_1 n_2} $$
where $U$ is the Mann-Whitney U statistic.

**Matched-Pairs Rank Biserial Correlation ($r_{rb}$) (for Wilcoxon Signed-Rank):**
Used for non-parametric paired comparisons.
$$ r_{rb} = \frac{4T_+}{n(n+1)} - 1 $$
(Calculated in implementation as $1 - \frac{2W}{n(n+1)/2}$ derived from signed rank sum).

**Eta-Squared ($\eta^2$) (for ANOVA):**
Measures the proportion of variance associated with the grouping variable.
$$ \eta^2 = \frac{SS_{between}}{SS_{total}} = \frac{\sum n_i(\bar{x}_i - \bar{x}_{grand})^2}{\sum (x_{ij} - \bar{x}_{grand})^2} $$

**Epsilon-Squared ($\epsilon^2$) (for Kruskal-Wallis):**
A bias-corrected effect size estimate for non-parametric ANOVA.
$$ \epsilon^2 = \frac{H - k + 1}{n - k} $$
where $H$ is the Kruskal-Wallis statistic, $k$ is the number of groups, and $n$ is the total sample size.

### 1.3 Hypothesis Testing Selection Logic

The system employs a "Smart Statistical Test" selector (`smart_statistical_test`) that automatically chooses the appropriate test based on assumption checks (Normality via Shapiro-Wilk, Homogeneity of Variance via Levene's Test).

#### Pairwise Comparisons (Two Groups)

**Algorithm:**
1. **Check Assumptions:**
   - Normality ($H_0$: Data is normally distributed, $\alpha=0.05$).
   - Homogeneity ($H_0$: Variances are equal, $\alpha=0.05$).
2. **Select Test:**
   - **If Paired Data (e.g., RAG vs Non-RAG on same questions):**
     - If Normal: **Paired t-test**.
       $$ t = \frac{\bar{d}}{s_d / \sqrt{n}} $$
     - If Non-Normal: **Wilcoxon Signed-Rank Test**.
   - **If Independent Data:**
     - If Normal & Homogeneous: **Independent t-test**.
     - If Normal & Heterogeneous: **Welch's t-test**.
       $$ t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}} $$
     - If Non-Normal: **Mann-Whitney U Test**.

#### Multi-Group Comparisons (Ablation Study)

**Algorithm:**
1. **Check Assumptions:** Normality of residuals and Homogeneity of variance.
2. **Select Test:**
   - If Assumptions Met: **One-Way ANOVA**.
     $$ F = \frac{MS_{between}}{MS_{within}} $$
   - If Assumptions Violated: **Kruskal-Wallis H Test**.
     $$ H = (N-1)\frac{\sum_{i=1}^k n_i(\bar{r}_i - \bar{r})^2}{\sum_{i=1}^k \sum_{j=1}^{n_i} (r_{ij} - \bar{r})^2} $$

## 2. Simulated User Testing Metrics

The simulated user testing framework (`scripts/run-simulated-user-tests.ts`) evaluates system-level performance using an LLM-as-a-User approach.

### 2.1 Task Completion Rate ($R_{TC}$)

Defined as the proportion of scenarios where the simulated user successfully achieves their predefined goal (e.g., "Register for KRS").

$$ R_{TC} = \frac{N_{success}}{N_{total}} $$

**Confidence Interval (95%) for Proportions:**
$$ CI = R_{TC} \pm 1.96 \sqrt{\frac{R_{TC}(1-R_{TC})}{N_{total}}} $$

### 2.2 Conversation Coherence Score ($S_{coh}$)

An LLM-evaluated metric (scale 0-1) assessing logical flow and contextual consistency across turns.

$$ S_{coh} = \frac{1}{N_{scenarios}} \sum_{i=1}^{N_{scenarios}} \text{Judge}(Conversation_i) $$

### 2.3 Context Retention Rate ($R_{ret}$)

Measures the system's ability to utilize information provided in previous turns $t < current$.

$$ R_{ret} = \frac{\sum_{i=1}^{N} \sum_{t=2}^{T_i} \mathbb{1}(\text{ContextUsed}_{i,t})}{\sum_{i=1}^{N} (T_i - 1)} $$
where $T_i$ is the number of turns in conversation $i$.

### 2.4 Information Coverage Rate ($R_{cov}$)

The proportion of ground-truth information points ($I_{GT}$) successfully conveyed to the user during the conversation.

$$ R_{cov} = \frac{|I_{system} \cap I_{GT}|}{|I_{GT}|} $$

## 3. Retrieval & RAG Metrics

These metrics typically originate from RAGAS or direct vector evaluation (`scripts/test-vector-search.ts`).

### 3.1 Cosine Similarity (Vector Retrieval)

Used for semantic search scoring.

$$ \text{sim}(A, B) = \cos(\theta) = \frac{A \cdot B}{\|A\| \|B\|} = \frac{\sum_{i=1}^n A_i B_i}{\sqrt{\sum_{i=1}^n A_i^2} \sqrt{\sum_{i=1}^n B_i^2}} $$

### 3.2 Retrieval Reciprocal Rank (MRR)

$$ MRR = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i} $$
where $\text{rank}_i$ is the rank position of the first relevant document for query $i$.

### 3.3 Latency Metrics

Latency is analyzed as a distribution rather than a single mean.

**Percentiles:**
- $P_{50}$ (Median): 50% of requests are faster than this.
- $P_{95}$: 95% of requests are faster than this (tail latency).
- $P_{99}$: 99% of requests are faster than this (extreme outliers).

**System Throughput (Stress Test):**
$$ T = \frac{N_{requests}}{t_{total}} $$
where $t_{total}$ is the duration from the first request start to the last request finish.
