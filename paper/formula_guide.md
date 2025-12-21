✦ When writing the Methods section of an IMRAD paper, you should not include every single formula. Including standard textbook formulas
(like the mean, standard deviation, or basic t-test) clutters the paper and distracts from your specific contributions.

Rule of Thumb:
  * Include in Main Text: Formulas that are novel, custom-modified, or critical definitions specific to your study (e.g., your specific
    "Chunk Quality Score" or "Ensemble Weights").
  * Move to Appendix or Reference: Standard mathematical definitions (e.g., formula for Cohen's $d$, standard Cosine Similarity, or
    vanilla BM25).

Here is a guide on exactly which formulas from your docs you should include in the Methods section versus the Appendix, and the LaTeX
code for them.

---

1. Main Text (Must Include)
These are the definitions that define your specific system. Readers need these to reproduce your specific results.

A. The Chunk Quality Score (Novel Contribution)
Since this is a custom weighted formula used to prioritize chunks, it is a key part of your methodology.

> "To prioritize semantically rich content, we calculate a composite Chunk Quality Score ($S_{quality}$) defined as:"

$$
S_{quality} = 0.25 \cdot I_{den} + 0.25 \cdot S_{imp} + 0.15 \cdot C_{pres} + 0.15 \cdot K_{conc} + 0.20 \cdot C_{omp}
$$

> "Where $I_{den}$ is information density, $S_{imp}$ is structural importance, $C_{pres}$ is citation presence, $K_{conc}$ is keyword
concentration, and $C_{omp}$ is completeness."

B. Ensemble Reranking Strategy
You explicitly tuned weights for your reranker ($0.4, 0.4, 0.2$). This needs to be defined.

> "The final reranking score ($S_{ensemble}$) is computed using a weighted ensemble of the Cross-Encoder ($S_{ce}$), Listwise LLM
($S_{llm}$), and the original hybrid retrieval score ($S_{orig}$):"

$$
S_{ensemble} = \frac{0.4 \cdot S_{ce} + 0.4 \cdot S_{llm} + 0.2 \cdot S_{orig}}{0.4 + 0.4 + 0.2}
$$

C. Simulated User Metrics
These define how you measured "success" in your user simulation.

> "Context Retention Rate ($R_{ret}$) measures the system's ability to utilize information provided in previous turns $t < current$:"

$$
R_{ret} = \frac{\sum_{i=1}^{N} \sum_{t=2}^{T_i} \mathbb{1}(\text{ContextUsed}{i,t})}{\sum{i=1}^{N} (T_i - 1)}
$$

D. Metric Adjustments (e.g., Laplace Smoothing)
If you modified a standard metric (like Faithfulness), you must show the modification.

> "To prevent extreme binary values in short answers, we applied Laplace smoothing to the Faithfulness metric:"

$$
\text{Faithfulness} = \frac{|C_{supported}| + 0.5}{|C_{total}| + 1.0}
$$

---

2. Main Text (Optional / Simplified)
Include these only if they are central to your argument or word count allows. Otherwise, describe them in text.

A. Reciprocal Rank Fusion (RRF)
You can usually describe this in text ("We used RRF with $k=60$"), but the formula is compact enough to include if you want to
emphasize the fusion method.

$$
\text{RRF}{\text{score}}(d) = \sum{r \in \mathcal{R}} \frac{1}{60 + \text{rank}_r(d)}
$$

B. Hybrid Retrieval Components
Instead of writing out the full BM25 formula (which is standard), you can simply state the hyperparameters in text:
> "We utilized the Okapi BM25+ algorithm with $k_1 = 1.2$, $b = 0.75$, and $\delta = 1$ to prevent negative scores."

---

3. Appendix or Omitted (Do Not Include in Main Text)
These are standard statistical or mathematical concepts. Writing them out makes the paper look like a textbook rather than research.

  * Descriptive Statistics: Do not write formulas for Mean ($\bar{x}$) or Standard Error (SEM). Just report the values.
  * Standard Effect Sizes: Do not write the formula for Cohen's $d$ or Eta-Squared ($\eta^2$). Just cite the method (e.g., "Effect
    sizes were estimated using Cohen's $d$ [Citation]").
  * Standard Tests: Do not write the formula for the t-statistic ($t$) or ANOVA ($F$).
  * Cosine Similarity: Everyone knows $\frac{A \cdot B}{\|A\| \|B\|}$. Don't waste space on it.

Summary Checklist for your IMRAD Paper


┌────────────────────────────┬───────────┬─────────────────────────────────────────────────────────────┐
│ Formula Group              │ Action    │ Why?                                                        │
├────────────────────────────┼───────────┼─────────────────────────────────────────────────────────────┤
│ Chunk Quality Score        │ Include   │ Custom logic specific to your pipeline.                     │
│ Ensemble Reranking         │ Include   │ Shows your specific weighting strategy.                     │
│ Simulated User Metrics     │ Include   │ Defines your specific evaluation criteria.                  │
│ Faithfulness (Smoothed)    │ Include   │ Shows a modification to standard RAGAS metrics.             │
│ RRF                        │ Optional  │ Standard, but clarifies the $k$ constant used.              │
│ BM25 / Vector / Cosine     │ Text Only │ Standard IR formulas; just list hyperparameters ($k_1, b$). │
│ Statistical Tests (t-test) │ Omit      │ Standard knowledge; just name the test used.                │
│ Descriptive Stats (Mean)   │ Omit      │ Basic math; assumed knowledge.                              │
└────────────────────────────┴───────────┴─────────────────────────────────────────────────────────────┘