#!/usr/bin/env python3
"""
RAG Evaluation Statistical Analysis Script

A Python implementation using battle-tested libraries:
- scipy: Statistical tests (t-tests, ANOVA, normality tests)
- pandas: Data manipulation and aggregation
- numpy: Numerical computations
- seaborn/matplotlib: Visualization (optional)

Usage:
    python scripts/run-statistical-analysis.py --latest
    python scripts/run-statistical-analysis.py --run-id=<uuid>
    python scripts/run-statistical-analysis.py --ablation-id=<uuid>
"""

import argparse
import json
import os
import sys
from dataclasses import dataclass
from typing import Any, Optional

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import (
    bartlett,
    f_oneway,
    kruskal,
    levene,
    mannwhitneyu,
    shapiro,
    ttest_ind,
    ttest_rel,
    wilcoxon,
)

# Database connection
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# ===== DATA CLASSES =====
@dataclass
class DescriptiveStats:
    n: int
    mean: float
    median: float
    std_dev: float
    variance: float
    min_val: float
    max_val: float
    sem: float
    skewness: float
    kurtosis: float
    q1: float
    q3: float
    iqr: float


@dataclass
class TestResult:
    test_name: str
    test_name_id: str
    statistic: float
    p_value: float
    degrees_of_freedom: Optional[int]
    significant: bool
    effect_size: Optional[float]
    effect_size_interpretation: str
    confidence_interval: Optional[tuple[float, float]]
    interpretation: str
    interpretation_id: str


@dataclass
class AssumptionCheck:
    normality_passed: bool
    normality_p_value: float
    homogeneity_passed: Optional[bool]
    homogeneity_p_value: Optional[float]
    outlier_count: int
    outlier_percentage: float
    recommended_test: str
    warnings: list[str]
    assumptions_met: bool


@dataclass
class RAGComparisonResult:
    metric: str
    metric_id: str
    rag_stats: DescriptiveStats
    non_rag_stats: DescriptiveStats
    improvement: float
    improvement_percent: float
    test_result: TestResult


# ===== DATABASE FUNCTIONS =====
def get_db_connection():
    """Create a database connection from environment variables."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")
    return psycopg2.connect(database_url)


def get_latest_evaluation_run(conn) -> Optional[dict]:
    """Fetch the latest evaluation run."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, created_at 
            FROM evaluation_runs 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        )
        row = cur.fetchone()
        if row:
            return {"id": row[0], "name": row[1], "created_at": row[2]}
    return None


def get_latest_ablation_study(conn) -> Optional[dict]:
    """Fetch the latest ablation study."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, created_at, results 
            FROM ablation_studies 
            ORDER BY created_at DESC 
            LIMIT 1
        """
        )
        row = cur.fetchone()
        if row:
            return {
                "id": row[0],
                "name": row[1],
                "created_at": row[2],
                "results": row[3],
            }
    return None


def fetch_evaluation_run_data(conn, run_id: str) -> pd.DataFrame:
    """Fetch evaluation run data with all questions and metrics."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 
                id, question,
                rag_faithfulness, rag_answer_relevancy, rag_context_precision,
                rag_context_recall, rag_context_relevancy, rag_answer_correctness,
                rag_hallucination_rate, rag_latency_ms, rag_retrieval_latency_ms,
                rag_reranking_latency_ms, rag_generation_latency_ms,
                rag_agent_reasoning_latency_ms, rag_planning_latency_ms,
                rag_synthesis_latency_ms, rag_avg_step_latency_ms,
                non_rag_answer_relevancy, non_rag_answer_correctness,
                non_rag_hallucination_rate, non_rag_latency_ms
            FROM evaluation_questions
            WHERE run_id = %s AND rag_answer_correctness IS NOT NULL
        """,
            (run_id,),
        )

        columns = [
            "question_id",
            "question",
            "rag_faithfulness",
            "rag_answer_relevancy",
            "rag_context_precision",
            "rag_context_recall",
            "rag_context_relevancy",
            "rag_answer_correctness",
            "rag_hallucination_rate",
            "rag_latency_ms",
            "rag_retrieval_latency_ms",
            "rag_reranking_latency_ms",
            "rag_generation_latency_ms",
            "rag_agent_reasoning_latency_ms",
            "rag_planning_latency_ms",
            "rag_synthesis_latency_ms",
            "rag_avg_step_latency_ms",
            "non_rag_answer_relevancy",
            "non_rag_answer_correctness",
            "non_rag_hallucination_rate",
            "non_rag_latency_ms",
        ]

        rows = cur.fetchall()
        return pd.DataFrame(rows, columns=columns)


def fetch_ablation_study_data(conn, study_id: str) -> dict[str, pd.DataFrame]:
    """Fetch ablation study data with all configurations and per-question metrics."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT results FROM ablation_studies WHERE id = %s
        """,
            (study_id,),
        )
        row = cur.fetchone()
        if not row or not row[0]:
            return {}

        results = row[0]
        if isinstance(results, str):
            results = json.loads(results)

        config_data = {}
        for result in results:
            config_name = result.get("configName", "Unknown")

            if config_name not in config_data:
                config_data[config_name] = {
                    "faithfulness": [],
                    "answer_relevancy": [],
                    "context_precision": [],
                    "context_recall": [],
                    "context_relevancy": [],
                    "answer_correctness": [],
                    "hallucination_rate": [],
                    "latency_ms": [],
                    "planning_latency_ms": [],
                    "synthesis_latency_ms": [],
                    "avg_step_latency_ms": [],
                }

            # Extract per-question metrics if available
            per_question = result.get("perQuestionMetrics", [])
            if per_question:
                for pq in per_question:
                    if pq.get("faithfulness") is not None:
                        config_data[config_name]["faithfulness"].append(
                            pq["faithfulness"]
                        )
                    if pq.get("answerRelevancy") is not None:
                        config_data[config_name]["answer_relevancy"].append(
                            pq["answerRelevancy"]
                        )
                    if pq.get("contextPrecision") is not None:
                        config_data[config_name]["context_precision"].append(
                            pq["contextPrecision"]
                        )
                    if pq.get("contextRecall") is not None:
                        config_data[config_name]["context_recall"].append(
                            pq["contextRecall"]
                        )
                    if pq.get("contextRelevancy") is not None:
                        config_data[config_name]["context_relevancy"].append(
                            pq["contextRelevancy"]
                        )
                    if pq.get("answerCorrectness") is not None:
                        config_data[config_name]["answer_correctness"].append(
                            pq["answerCorrectness"]
                        )
                    if pq.get("hallucinationRate") is not None:
                        config_data[config_name]["hallucination_rate"].append(
                            pq["hallucinationRate"]
                        )
                    if pq.get("totalLatencyMs") is not None:
                        config_data[config_name]["latency_ms"].append(
                            pq["totalLatencyMs"]
                        )
                    if pq.get("planningLatencyMs") is not None:
                        config_data[config_name]["planning_latency_ms"].append(
                            pq["planningLatencyMs"]
                        )
                    if pq.get("synthesisLatencyMs") is not None:
                        config_data[config_name]["synthesis_latency_ms"].append(
                            pq["synthesisLatencyMs"]
                        )
                    if pq.get("avgStepLatencyMs") is not None:
                        config_data[config_name]["avg_step_latency_ms"].append(
                            pq["avgStepLatencyMs"]
                        )
            else:
                # Fallback to aggregated metrics
                metrics = result.get("metrics", {})
                if metrics.get("faithfulness") is not None:
                    config_data[config_name]["faithfulness"].append(
                        metrics["faithfulness"]
                    )
                if metrics.get("answerRelevancy") is not None:
                    config_data[config_name]["answer_relevancy"].append(
                        metrics["answerRelevancy"]
                    )
                if metrics.get("totalLatencyMs") is not None:
                    config_data[config_name]["latency_ms"].append(
                        metrics["totalLatencyMs"]
                    )

        # Convert to DataFrames
        return {
            name: pd.DataFrame(data) for name, data in config_data.items() if data
        }


# ===== STATISTICAL FUNCTIONS =====
def calculate_descriptive_stats(data: np.ndarray) -> DescriptiveStats:
    """Calculate comprehensive descriptive statistics."""
    data = np.array(data)
    data = data[~np.isnan(data)]

    if len(data) == 0:
        return DescriptiveStats(
            n=0,
            mean=0,
            median=0,
            std_dev=0,
            variance=0,
            min_val=0,
            max_val=0,
            sem=0,
            skewness=0,
            kurtosis=0,
            q1=0,
            q3=0,
            iqr=0,
        )

    q1 = np.percentile(data, 25)
    q3 = np.percentile(data, 75)

    return DescriptiveStats(
        n=len(data),
        mean=np.mean(data),
        median=np.median(data),
        std_dev=np.std(data, ddof=1) if len(data) > 1 else 0,
        variance=np.var(data, ddof=1) if len(data) > 1 else 0,
        min_val=np.min(data),
        max_val=np.max(data),
        sem=stats.sem(data) if len(data) > 1 else 0,
        skewness=stats.skew(data) if len(data) > 2 else 0,
        kurtosis=stats.kurtosis(data) if len(data) > 3 else 0,
        q1=q1,
        q3=q3,
        iqr=q3 - q1,
    )


def cohens_d(group1: np.ndarray, group2: np.ndarray) -> float:
    """Calculate Cohen's d effect size."""
    n1, n2 = len(group1), len(group2)
    if n1 < 2 or n2 < 2:
        return 0.0

    var1 = np.var(group1, ddof=1)
    var2 = np.var(group2, ddof=1)

    # Pooled standard deviation
    pooled_std = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))

    if pooled_std == 0:
        return 0.0

    return (np.mean(group1) - np.mean(group2)) / pooled_std


def interpret_effect_size(d: float) -> str:
    """Interpret Cohen's d effect size."""
    d = abs(d)
    if d < 0.2:
        return "negligible"
    elif d < 0.5:
        return "small"
    elif d < 0.8:
        return "medium"
    else:
        return "large"


def eta_squared(groups: list[np.ndarray]) -> float:
    """Calculate eta-squared effect size for ANOVA."""
    all_data = np.concatenate(groups)
    grand_mean = np.mean(all_data)

    ss_between = sum(len(g) * (np.mean(g) - grand_mean) ** 2 for g in groups)
    ss_total = sum((x - grand_mean) ** 2 for x in all_data)

    if ss_total == 0:
        return 0.0

    return ss_between / ss_total


def detect_outliers(data: np.ndarray, method: str = "iqr") -> tuple[int, float]:
    """Detect outliers using IQR method."""
    data = np.array(data)
    data = data[~np.isnan(data)]

    if len(data) < 4:
        return 0, 0.0

    q1 = np.percentile(data, 25)
    q3 = np.percentile(data, 75)
    iqr = q3 - q1

    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    outliers = np.sum((data < lower_bound) | (data > upper_bound))
    percentage = (outliers / len(data)) * 100

    return int(outliers), percentage


def check_normality(data: np.ndarray, alpha: float = 0.05) -> tuple[bool, float]:
    """Check normality using Shapiro-Wilk test."""
    data = np.array(data)
    data = data[~np.isnan(data)]

    if len(data) < 3:
        return True, 1.0  # Assume normal if too few samples

    if len(data) > 5000:
        # Shapiro-Wilk not recommended for n > 5000
        data = np.random.choice(data, 5000, replace=False)

    try:
        stat, p_value = shapiro(data)
        return p_value > alpha, p_value
    except Exception:
        return True, 1.0


def check_homogeneity(
    groups: list[np.ndarray], alpha: float = 0.05
) -> tuple[bool, float]:
    """Check homogeneity of variances using Levene's test."""
    groups = [np.array(g)[~np.isnan(g)] for g in groups]
    groups = [g for g in groups if len(g) >= 2]

    if len(groups) < 2:
        return True, 1.0

    try:
        stat, p_value = levene(*groups)
        return p_value > alpha, p_value
    except Exception:
        return True, 1.0


def check_t_test_assumptions(
    group1: np.ndarray, group2: np.ndarray
) -> AssumptionCheck:
    """Check assumptions for t-test."""
    warnings = []

    # Normality check
    norm1_passed, norm1_p = check_normality(group1)
    norm2_passed, norm2_p = check_normality(group2)
    normality_passed = norm1_passed and norm2_passed
    normality_p = min(norm1_p, norm2_p)

    if not normality_passed:
        warnings.append("⚠️ Normality assumption violated - consider Mann-Whitney U")

    # Homogeneity check
    homog_passed, homog_p = check_homogeneity([group1, group2])
    if not homog_passed:
        warnings.append("⚠️ Homogeneity violated - Welch's t-test recommended")

    # Outlier check
    outliers1, pct1 = detect_outliers(group1)
    outliers2, pct2 = detect_outliers(group2)
    total_outliers = outliers1 + outliers2
    avg_pct = (pct1 + pct2) / 2

    if avg_pct > 5:
        warnings.append(f"⚠️ {total_outliers} outliers detected ({avg_pct:.1f}%)")

    # Determine recommended test
    if not normality_passed and (len(group1) < 30 or len(group2) < 30):
        recommended = "Mann-Whitney U (non-parametric)"
    elif not homog_passed:
        recommended = "Welch's t-test (unequal variances)"
    else:
        recommended = "Independent t-test"

    assumptions_met = normality_passed and homog_passed and avg_pct <= 5

    return AssumptionCheck(
        normality_passed=normality_passed,
        normality_p_value=normality_p,
        homogeneity_passed=homog_passed,
        homogeneity_p_value=homog_p,
        outlier_count=total_outliers,
        outlier_percentage=avg_pct,
        recommended_test=recommended,
        warnings=warnings,
        assumptions_met=assumptions_met,
    )


def check_anova_assumptions(groups: list[np.ndarray]) -> AssumptionCheck:
    """Check assumptions for ANOVA."""
    warnings = []

    # Normality check (on all groups)
    all_normal = True
    min_p = 1.0
    for g in groups:
        passed, p = check_normality(g)
        all_normal = all_normal and passed
        min_p = min(min_p, p)

    if not all_normal:
        warnings.append("⚠️ Normality assumption violated - consider Kruskal-Wallis")

    # Homogeneity check
    homog_passed, homog_p = check_homogeneity(groups)
    if not homog_passed:
        warnings.append("⚠️ Homogeneity violated - consider Welch's ANOVA")

    # Outlier check
    total_outliers = 0
    total_n = 0
    for g in groups:
        outliers, _ = detect_outliers(g)
        total_outliers += outliers
        total_n += len(g)

    outlier_pct = (total_outliers / total_n * 100) if total_n > 0 else 0

    if outlier_pct > 5:
        warnings.append(f"⚠️ {total_outliers} outliers detected ({outlier_pct:.1f}%)")

    # Determine recommended test
    if not all_normal:
        recommended = "Kruskal-Wallis H (non-parametric)"
    elif not homog_passed:
        recommended = "Welch's ANOVA"
    else:
        recommended = "One-way ANOVA"

    assumptions_met = all_normal and homog_passed and outlier_pct <= 5

    return AssumptionCheck(
        normality_passed=all_normal,
        normality_p_value=min_p,
        homogeneity_passed=homog_passed,
        homogeneity_p_value=homog_p,
        outlier_count=total_outliers,
        outlier_percentage=outlier_pct,
        recommended_test=recommended,
        warnings=warnings,
        assumptions_met=assumptions_met,
    )


def paired_t_test(
    group1: np.ndarray, group2: np.ndarray, alpha: float = 0.05
) -> TestResult:
    """Perform paired t-test."""
    group1 = np.array(group1)
    group2 = np.array(group2)

    stat, p_value = ttest_rel(group1, group2)
    df = len(group1) - 1
    significant = p_value < alpha

    # Effect size
    diff = group1 - group2
    d = np.mean(diff) / np.std(diff, ddof=1) if np.std(diff, ddof=1) > 0 else 0

    # Confidence interval for mean difference
    se = stats.sem(diff)
    ci = stats.t.interval(0.95, df, loc=np.mean(diff), scale=se)

    interpretation = (
        f"The paired t-test shows a {'statistically significant' if significant else 'non-significant'} "
        f"difference between the two conditions (t({df}) = {stat:.3f}, p = {p_value:.4f})."
    )
    interpretation_id = (
        f"Uji t berpasangan menunjukkan perbedaan yang {'signifikan secara statistik' if significant else 'tidak signifikan'} "
        f"antara kedua kondisi (t({df}) = {stat:.3f}, p = {p_value:.4f})."
    )

    return TestResult(
        test_name="Paired t-test",
        test_name_id="Uji t Berpasangan",
        statistic=stat,
        p_value=p_value,
        degrees_of_freedom=df,
        significant=significant,
        effect_size=d,
        effect_size_interpretation=interpret_effect_size(d),
        confidence_interval=ci,
        interpretation=interpretation,
        interpretation_id=interpretation_id,
    )


def independent_t_test(
    group1: np.ndarray, group2: np.ndarray, alpha: float = 0.05
) -> TestResult:
    """Perform independent samples t-test (Welch's)."""
    group1 = np.array(group1)
    group2 = np.array(group2)

    stat, p_value = ttest_ind(group1, group2, equal_var=False)

    # Welch-Satterthwaite degrees of freedom
    n1, n2 = len(group1), len(group2)
    var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
    df = ((var1 / n1 + var2 / n2) ** 2) / (
        (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1)
    )

    significant = p_value < alpha
    d = cohens_d(group1, group2)

    interpretation = (
        f"The independent t-test shows a {'statistically significant' if significant else 'non-significant'} "
        f"difference between groups (t({df:.1f}) = {stat:.3f}, p = {p_value:.4f}, d = {d:.3f})."
    )
    interpretation_id = (
        f"Uji t independen menunjukkan perbedaan yang {'signifikan secara statistik' if significant else 'tidak signifikan'} "
        f"antara kelompok (t({df:.1f}) = {stat:.3f}, p = {p_value:.4f}, d = {d:.3f})."
    )

    return TestResult(
        test_name="Independent t-test (Welch's)",
        test_name_id="Uji t Independen (Welch)",
        statistic=stat,
        p_value=p_value,
        degrees_of_freedom=int(df),
        significant=significant,
        effect_size=d,
        effect_size_interpretation=interpret_effect_size(d),
        confidence_interval=None,
        interpretation=interpretation,
        interpretation_id=interpretation_id,
    )


def mann_whitney_u_test(
    group1: np.ndarray, group2: np.ndarray, alpha: float = 0.05
) -> TestResult:
    """Perform Mann-Whitney U test (non-parametric alternative to t-test)."""
    group1 = np.array(group1)
    group2 = np.array(group2)

    stat, p_value = mannwhitneyu(group1, group2, alternative="two-sided")
    significant = p_value < alpha

    # Effect size (rank-biserial correlation)
    n1, n2 = len(group1), len(group2)
    r = 1 - (2 * stat) / (n1 * n2)

    interpretation = (
        f"The Mann-Whitney U test shows a {'statistically significant' if significant else 'non-significant'} "
        f"difference between groups (U = {stat:.1f}, p = {p_value:.4f})."
    )
    interpretation_id = (
        f"Uji Mann-Whitney U menunjukkan perbedaan yang {'signifikan secara statistik' if significant else 'tidak signifikan'} "
        f"antara kelompok (U = {stat:.1f}, p = {p_value:.4f})."
    )

    return TestResult(
        test_name="Mann-Whitney U",
        test_name_id="Uji Mann-Whitney U",
        statistic=stat,
        p_value=p_value,
        degrees_of_freedom=None,
        significant=significant,
        effect_size=r,
        effect_size_interpretation=interpret_effect_size(r),
        confidence_interval=None,
        interpretation=interpretation,
        interpretation_id=interpretation_id,
    )


def wilcoxon_signed_rank_test(
    group1: np.ndarray, group2: np.ndarray, alpha: float = 0.05
) -> TestResult:
    """Perform Wilcoxon signed-rank test (non-parametric alternative to paired t-test)."""
    group1 = np.array(group1)
    group2 = np.array(group2)

    try:
        stat, p_value = wilcoxon(group1, group2)
    except ValueError:
        # All differences are zero
        return TestResult(
            test_name="Wilcoxon Signed-Rank",
            test_name_id="Uji Wilcoxon Signed-Rank",
            statistic=0,
            p_value=1.0,
            degrees_of_freedom=None,
            significant=False,
            effect_size=0,
            effect_size_interpretation="negligible",
            confidence_interval=None,
            interpretation="No differences found between groups.",
            interpretation_id="Tidak ditemukan perbedaan antara kelompok.",
        )

    significant = p_value < alpha

    # Effect size (matched-pairs rank biserial)
    n = len(group1)
    r = 1 - (2 * stat) / (n * (n + 1) / 2) if n > 0 else 0

    interpretation = (
        f"The Wilcoxon signed-rank test shows a {'statistically significant' if significant else 'non-significant'} "
        f"difference between conditions (W = {stat:.1f}, p = {p_value:.4f})."
    )
    interpretation_id = (
        f"Uji Wilcoxon signed-rank menunjukkan perbedaan yang {'signifikan secara statistik' if significant else 'tidak signifikan'} "
        f"antara kondisi (W = {stat:.1f}, p = {p_value:.4f})."
    )

    return TestResult(
        test_name="Wilcoxon Signed-Rank",
        test_name_id="Uji Wilcoxon Signed-Rank",
        statistic=stat,
        p_value=p_value,
        degrees_of_freedom=None,
        significant=significant,
        effect_size=r,
        effect_size_interpretation=interpret_effect_size(r),
        confidence_interval=None,
        interpretation=interpretation,
        interpretation_id=interpretation_id,
    )


def one_way_anova(groups: list[np.ndarray], alpha: float = 0.05) -> TestResult:
    """Perform one-way ANOVA."""
    stat, p_value = f_oneway(*groups)
    significant = p_value < alpha

    # Degrees of freedom
    k = len(groups)
    n = sum(len(g) for g in groups)
    df_between = k - 1
    df_within = n - k

    # Effect size (eta-squared)
    eta_sq = eta_squared(groups)

    interpretation = (
        f"One-way ANOVA shows a {'statistically significant' if significant else 'non-significant'} "
        f"difference among groups (F({df_between}, {df_within}) = {stat:.3f}, p = {p_value:.4f}, η² = {eta_sq:.3f})."
    )
    interpretation_id = (
        f"ANOVA satu arah menunjukkan perbedaan yang {'signifikan secara statistik' if significant else 'tidak signifikan'} "
        f"antar kelompok (F({df_between}, {df_within}) = {stat:.3f}, p = {p_value:.4f}, η² = {eta_sq:.3f})."
    )

    return TestResult(
        test_name="One-way ANOVA",
        test_name_id="ANOVA Satu Arah",
        statistic=stat,
        p_value=p_value,
        degrees_of_freedom=df_between,
        significant=significant,
        effect_size=eta_sq,
        effect_size_interpretation=interpret_effect_size(np.sqrt(eta_sq)),
        confidence_interval=None,
        interpretation=interpretation,
        interpretation_id=interpretation_id,
    )


def kruskal_wallis_test(groups: list[np.ndarray], alpha: float = 0.05) -> TestResult:
    """Perform Kruskal-Wallis H test (non-parametric alternative to ANOVA)."""
    stat, p_value = kruskal(*groups)
    significant = p_value < alpha

    # Effect size (epsilon-squared)
    n = sum(len(g) for g in groups)
    epsilon_sq = (stat - len(groups) + 1) / (n - len(groups)) if n > len(groups) else 0

    interpretation = (
        f"Kruskal-Wallis H test shows a {'statistically significant' if significant else 'non-significant'} "
        f"difference among groups (H = {stat:.3f}, p = {p_value:.4f})."
    )
    interpretation_id = (
        f"Uji Kruskal-Wallis H menunjukkan perbedaan yang {'signifikan secara statistik' if significant else 'tidak signifikan'} "
        f"antar kelompok (H = {stat:.3f}, p = {p_value:.4f})."
    )

    return TestResult(
        test_name="Kruskal-Wallis H",
        test_name_id="Uji Kruskal-Wallis H",
        statistic=stat,
        p_value=p_value,
        degrees_of_freedom=len(groups) - 1,
        significant=significant,
        effect_size=epsilon_sq,
        effect_size_interpretation=interpret_effect_size(np.sqrt(epsilon_sq)),
        confidence_interval=None,
        interpretation=interpretation,
        interpretation_id=interpretation_id,
    )


def smart_statistical_test(
    groups: list[np.ndarray], paired: bool = False
) -> tuple[str, TestResult]:
    """Automatically select and perform the appropriate statistical test."""
    if len(groups) == 2:
        if paired:
            assumptions = check_t_test_assumptions(groups[0], groups[1])
            if assumptions.normality_passed:
                return "Paired t-test", paired_t_test(groups[0], groups[1])
            else:
                return "Wilcoxon Signed-Rank", wilcoxon_signed_rank_test(
                    groups[0], groups[1]
                )
        else:
            assumptions = check_t_test_assumptions(groups[0], groups[1])
            if assumptions.normality_passed:
                return "Independent t-test", independent_t_test(groups[0], groups[1])
            else:
                return "Mann-Whitney U", mann_whitney_u_test(groups[0], groups[1])
    else:
        assumptions = check_anova_assumptions(groups)
        if assumptions.normality_passed and assumptions.homogeneity_passed:
            return "One-way ANOVA", one_way_anova(groups)
        else:
            return "Kruskal-Wallis H", kruskal_wallis_test(groups)


def bootstrap_confidence_interval(
    data: np.ndarray,
    statistic_func=np.mean,
    confidence: float = 0.95,
    n_iterations: int = 10000,
) -> tuple[float, float, float]:
    """Calculate bootstrap confidence interval."""
    data = np.array(data)
    n = len(data)

    bootstrap_stats = np.array(
        [statistic_func(np.random.choice(data, n, replace=True)) for _ in range(n_iterations)]
    )

    alpha = 1 - confidence
    lower = np.percentile(bootstrap_stats, alpha / 2 * 100)
    upper = np.percentile(bootstrap_stats, (1 - alpha / 2) * 100)

    return statistic_func(data), lower, upper


def confidence_interval(
    data: np.ndarray, confidence: float = 0.95
) -> tuple[float, float, float, float]:
    """Calculate parametric confidence interval."""
    data = np.array(data)
    n = len(data)
    mean = np.mean(data)
    se = stats.sem(data)
    h = se * stats.t.ppf((1 + confidence) / 2, n - 1)

    return mean, mean - h, mean + h, h


def compare_rag_vs_non_rag(
    rag_scores: np.ndarray,
    non_rag_scores: np.ndarray,
    metric_name: str,
    metric_name_id: str,
) -> RAGComparisonResult:
    """Compare RAG vs Non-RAG performance for a specific metric."""
    rag_stats = calculate_descriptive_stats(rag_scores)
    non_rag_stats = calculate_descriptive_stats(non_rag_scores)

    improvement = rag_stats.mean - non_rag_stats.mean
    improvement_pct = (
        (improvement / non_rag_stats.mean * 100)
        if non_rag_stats.mean != 0
        else 0
    )

    test_name, test_result = smart_statistical_test(
        [rag_scores, non_rag_scores], paired=True
    )

    return RAGComparisonResult(
        metric=metric_name,
        metric_id=metric_name_id,
        rag_stats=rag_stats,
        non_rag_stats=non_rag_stats,
        improvement=improvement,
        improvement_percent=improvement_pct,
        test_result=test_result,
    )


# ===== PRINTING FUNCTIONS =====
def print_descriptive_stats(stats: DescriptiveStats):
    """Print formatted descriptive statistics."""
    print(f"  N: {stats.n}")
    print(f"  Mean: {stats.mean:.4f}")
    print(f"  Median: {stats.median:.4f}")
    print(f"  Std Dev: {stats.std_dev:.4f}")
    print(f"  Min: {stats.min_val:.4f}")
    print(f"  Max: {stats.max_val:.4f}")
    print(f"  SEM: {stats.sem:.4f}")
    print(f"  Skewness: {stats.skewness:.4f}")
    print(f"  Kurtosis: {stats.kurtosis:.4f}")


def print_test_result(result: TestResult):
    """Print formatted test result."""
    print(f"  Test: {result.test_name} / {result.test_name_id}")
    print(f"  Statistic: {result.statistic:.4f}")
    print(f"  p-value: {result.p_value:.4f}")
    if result.degrees_of_freedom is not None:
        print(f"  Degrees of Freedom: {result.degrees_of_freedom}")
    print(
        f"  Significant (α=0.05): {'Yes / Ya' if result.significant else 'No / Tidak'}"
    )
    if result.effect_size is not None:
        print(
            f"  Effect Size: {result.effect_size:.4f} ({result.effect_size_interpretation})"
        )
    if result.confidence_interval:
        print(
            f"  95% CI: [{result.confidence_interval[0]:.4f}, {result.confidence_interval[1]:.4f}]"
        )
    print(f"\n  EN: {result.interpretation}")
    print(f"  ID: {result.interpretation_id}")


def print_assumption_check(check: AssumptionCheck):
    """Print formatted assumption check results."""
    print(
        f"    Normality: {'✓ Passed' if check.normality_passed else '✗ Failed'} (p = {check.normality_p_value:.4f})"
    )
    if check.homogeneity_p_value is not None:
        print(
            f"    Homogeneity: {'✓ Passed' if check.homogeneity_passed else '✗ Failed'} (p = {check.homogeneity_p_value:.4f})"
        )
    print(
        f"    Outliers: {check.outlier_count} detected ({check.outlier_percentage:.1f}%)"
    )
    print(f"    Recommended Test: {check.recommended_test}")
    for warning in check.warnings:
        print(f"    {warning}")


# ===== MAIN ANALYSIS =====
def run_analysis():
    """Run the complete statistical analysis."""
    print("=" * 60)
    print("RAG Evaluation Statistical Analysis (Python)")
    print("Analisis Statistik Evaluasi RAG (Python)")
    print("=" * 60)
    print()

    # Parse arguments
    parser = argparse.ArgumentParser(
        description="RAG Evaluation Statistical Analysis"
    )
    parser.add_argument("--run-id", help="Evaluation run ID")
    parser.add_argument("--ablation-id", help="Ablation study ID")
    parser.add_argument(
        "--latest", action="store_true", help="Use latest available data"
    )
    args = parser.parse_args()

    # Connect to database
    print("Connecting to database...")
    try:
        conn = get_db_connection()
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return

    evaluation_data: Optional[pd.DataFrame] = None
    ablation_data: dict[str, pd.DataFrame] = {}

    try:
        # Fetch evaluation run data
        if args.run_id:
            evaluation_data = fetch_evaluation_run_data(conn, args.run_id)
            print(
                f"Loaded evaluation run: {args.run_id} ({len(evaluation_data)} questions)"
            )
        elif args.latest or (not args.run_id and not args.ablation_id):
            latest_run = get_latest_evaluation_run(conn)
            if latest_run:
                evaluation_data = fetch_evaluation_run_data(conn, latest_run["id"])
                print(
                    f"Loaded latest evaluation run: {latest_run['name']} ({len(evaluation_data)} questions)"
                )

        # Fetch ablation study data
        if args.ablation_id:
            ablation_data = fetch_ablation_study_data(conn, args.ablation_id)
            print(
                f"Loaded ablation study: {args.ablation_id} ({len(ablation_data)} configs)"
            )
        elif args.latest or (not args.run_id and not args.ablation_id):
            latest_ablation = get_latest_ablation_study(conn)
            if latest_ablation:
                ablation_data = fetch_ablation_study_data(conn, latest_ablation["id"])
                print(
                    f"Loaded latest ablation study: {latest_ablation['name']} ({len(ablation_data)} configs)"
                )

        if (
            evaluation_data is None or len(evaluation_data) == 0
        ) and len(ablation_data) == 0:
            print("\nNo evaluation data found in database.")
            print(
                "Please run an evaluation first or provide --run-id or --ablation-id."
            )
            print("\nUsage:")
            print("  python scripts/run-statistical-analysis.py --latest")
            print("  python scripts/run-statistical-analysis.py --run-id=<uuid>")
            print("  python scripts/run-statistical-analysis.py --ablation-id=<uuid>")
            return

    except Exception as e:
        print(f"Error fetching data: {e}")
        return
    finally:
        conn.close()

    print()

    # ===== 1. DESCRIPTIVE STATISTICS =====
    if evaluation_data is not None and len(evaluation_data) > 0:
        print("=" * 60)
        print("1. DESCRIPTIVE STATISTICS / STATISTIK DESKRIPTIF")
        print("-" * 50)

        rag_faithfulness = evaluation_data["rag_faithfulness"].dropna().values
        rag_relevancy = evaluation_data["rag_answer_relevancy"].dropna().values
        rag_latency = evaluation_data["rag_latency_ms"].dropna().values
        rag_planning = evaluation_data["rag_planning_latency_ms"].dropna().values
        rag_synthesis = evaluation_data["rag_synthesis_latency_ms"].dropna().values
        rag_avg_step = evaluation_data["rag_avg_step_latency_ms"].dropna().values

        non_rag_relevancy = evaluation_data["non_rag_answer_relevancy"].dropna().values
        non_rag_latency = evaluation_data["non_rag_latency_ms"].dropna().values

        if len(rag_faithfulness) > 0:
            print("\nRAG Faithfulness:")
            print_descriptive_stats(calculate_descriptive_stats(rag_faithfulness))

        if len(rag_relevancy) > 0:
            print("\nRAG Answer Relevancy:")
            print_descriptive_stats(calculate_descriptive_stats(rag_relevancy))

        if len(rag_latency) > 0:
            print("\nRAG Latency (ms):")
            print_descriptive_stats(calculate_descriptive_stats(rag_latency))

        if len(rag_planning) > 0 and np.any(rag_planning > 0):
            print("\nRAG Planning Latency (ms):")
            print_descriptive_stats(calculate_descriptive_stats(rag_planning))

        if len(rag_synthesis) > 0 and np.any(rag_synthesis > 0):
            print("\nRAG Synthesis Latency (ms):")
            print_descriptive_stats(calculate_descriptive_stats(rag_synthesis))

        if len(rag_avg_step) > 0 and np.any(rag_avg_step > 0):
            print("\nRAG Avg Step Latency (ms):")
            print_descriptive_stats(calculate_descriptive_stats(rag_avg_step))

        # ===== 2. PAIRED T-TESTS WITH ASSUMPTION CHECKING =====
        print("\n" + "=" * 60)
        print(
            "2. PAIRED T-TESTS WITH ASSUMPTION CHECKING / UJI T BERPASANGAN DENGAN VALIDASI ASUMSI"
        )
        print("-" * 50)

        if (
            len(rag_relevancy) > 0
            and len(non_rag_relevancy) > 0
            and len(rag_relevancy) == len(non_rag_relevancy)
        ):
            print("\n2.1 Answer Relevancy: RAG vs Non-RAG")

            assumption_check = check_t_test_assumptions(rag_relevancy, non_rag_relevancy)
            print("\n  [Assumption Check]")
            print_assumption_check(assumption_check)

            test_name, test_result = smart_statistical_test(
                [rag_relevancy, non_rag_relevancy], paired=True
            )
            print(f"\n  [Test Used: {test_name}]")
            print_test_result(test_result)

        if (
            len(rag_latency) > 0
            and len(non_rag_latency) > 0
            and len(rag_latency) == len(non_rag_latency)
        ):
            print("\n2.2 Latency: RAG vs Non-RAG")

            assumption_check = check_t_test_assumptions(rag_latency, non_rag_latency)
            print("\n  [Assumption Check]")
            print_assumption_check(assumption_check)

            test_name, test_result = smart_statistical_test(
                [rag_latency, non_rag_latency], paired=True
            )
            print(f"\n  [Test Used: {test_name}]")
            print_test_result(test_result)

        # ===== 3. CONFIDENCE INTERVALS =====
        print("\n" + "=" * 60)
        print("3. CONFIDENCE INTERVALS / INTERVAL KEPERCAYAAN")
        print("-" * 50)

        if len(rag_faithfulness) > 0:
            print("\n95% CI for RAG Faithfulness:")
            mean, lower, upper, margin = confidence_interval(rag_faithfulness, 0.95)
            print(f"  Mean: {mean:.4f}")
            print(f"  95% CI: [{lower:.4f}, {upper:.4f}]")
            print(f"  Margin of Error: ±{margin:.4f}")

            print("\nBootstrap 95% CI for RAG Faithfulness:")
            estimate, boot_lower, boot_upper = bootstrap_confidence_interval(
                rag_faithfulness, confidence=0.95
            )
            print(f"  Estimate: {estimate:.4f}")
            print(f"  95% CI: [{boot_lower:.4f}, {boot_upper:.4f}]")

    # ===== 4. ONE-WAY ANOVA (ABLATION STUDY) =====
    if len(ablation_data) > 2:
        print("\n" + "=" * 60)
        print("4. ONE-WAY ANOVA / ANOVA SATU ARAH (Ablation Study)")
        print("-" * 50)

        # Validate data structure
        print("\n[ANOVA Data Validation]")
        for config_name, df in ablation_data.items():
            n_samples = (
                len(df["faithfulness"]) if "faithfulness" in df.columns else 0
            )
            print(f'  Config "{config_name}": n = {n_samples} per-question scores')

        # Check sample sizes
        sample_sizes = [len(df) for df in ablation_data.values()]
        if len(set(sample_sizes)) == 1:
            print(f"  ✓ All configurations have equal sample sizes (n = {sample_sizes[0]})")
        else:
            print(
                f"  ⚠ Unequal sample sizes detected: {set(sample_sizes)} - ANOVA still valid but unbalanced"
            )

        min_size = min(sample_sizes)
        if min_size < 2:
            print(
                f"  ⚠ WARNING: Minimum sample size is {min_size}. ANOVA requires n >= 2 per group."
            )

        # Prepare groups for ANOVA
        groups = []
        for config_name, df in ablation_data.items():
            if "faithfulness" in df.columns:
                groups.append(df["faithfulness"].dropna().values)

        if len(groups) >= 3:
            # Check assumptions
            print("\n[ANOVA Assumption Check]")
            anova_assumptions = check_anova_assumptions(groups)
            print_assumption_check(anova_assumptions)
            print(
                f"  Assumptions Met: {'✓ Yes' if anova_assumptions.assumptions_met else '✗ No'}"
            )

            # Smart test selection
            test_name, test_result = smart_statistical_test(groups, paired=False)
            print(f"\n[Test Used: {test_name}]")

            print("\nResults for Faithfulness across configurations:")
            print(f"  Statistic: {test_result.statistic:.4f}")
            print(f"  p-value: {test_result.p_value:.4f}")
            print(
                f"  Significant: {'Yes / Ya' if test_result.significant else 'No / Tidak'}"
            )
            if test_result.effect_size is not None:
                print(f"  Effect size: {test_result.effect_size:.4f}")
                print(f"  Effect interpretation: {test_result.effect_size_interpretation}")
            print(f"\n  EN: {test_result.interpretation}")
            print(f"  ID: {test_result.interpretation_id}")

    # ===== 5. COMPREHENSIVE RAG COMPARISON =====
    if evaluation_data is not None and len(evaluation_data) > 0:
        print("\n" + "=" * 60)
        print("5. COMPREHENSIVE RAG vs NON-RAG COMPARISON")
        print("-" * 50)

        comparisons = []

        rag_rel = evaluation_data["rag_answer_relevancy"].dropna().values
        non_rag_rel = evaluation_data["non_rag_answer_relevancy"].dropna().values
        if len(rag_rel) > 0 and len(non_rag_rel) > 0 and len(rag_rel) == len(non_rag_rel):
            comparisons.append(
                compare_rag_vs_non_rag(
                    rag_rel, non_rag_rel, "Answer Relevancy", "Relevansi Jawaban"
                )
            )

        rag_corr = evaluation_data["rag_answer_correctness"].dropna().values
        non_rag_corr = evaluation_data["non_rag_answer_correctness"].dropna().values
        if (
            len(rag_corr) > 0
            and len(non_rag_corr) > 0
            and len(rag_corr) == len(non_rag_corr)
        ):
            comparisons.append(
                compare_rag_vs_non_rag(
                    rag_corr, non_rag_corr, "Answer Correctness", "Kebenaran Jawaban"
                )
            )

        rag_factual = 1 - evaluation_data["rag_hallucination_rate"].dropna().values
        non_rag_factual = (
            1 - evaluation_data["non_rag_hallucination_rate"].dropna().values
        )
        if (
            len(rag_factual) > 0
            and len(non_rag_factual) > 0
            and len(rag_factual) == len(non_rag_factual)
        ):
            comparisons.append(
                compare_rag_vs_non_rag(
                    rag_factual,
                    non_rag_factual,
                    "Factual Accuracy (1 - Hallucination)",
                    "Akurasi Faktual (1 - Halusinasi)",
                )
            )

        for comp in comparisons:
            print(f"\n{comp.metric} / {comp.metric_id}:")
            print(
                f"  RAG Mean: {comp.rag_stats.mean:.4f} (SD: {comp.rag_stats.std_dev:.4f})"
            )
            print(
                f"  Non-RAG Mean: {comp.non_rag_stats.mean:.4f} (SD: {comp.non_rag_stats.std_dev:.4f})"
            )
            sign = "+" if comp.improvement > 0 else ""
            print(
                f"  Improvement: {sign}{comp.improvement:.4f} ({comp.improvement_percent:.1f}%)"
            )
            print(
                f"  Significant: {'Yes / Ya' if comp.test_result.significant else 'No / Tidak'} (p = {comp.test_result.p_value:.4f})"
            )
            if comp.test_result.effect_size is not None:
                print(
                    f"  Effect Size: {comp.test_result.effect_size:.3f} ({comp.test_result.effect_size_interpretation})"
                )

    # ===== 6. ABLATION STUDY ANALYSIS =====
    if len(ablation_data) > 0:
        print("\n" + "=" * 60)
        print("6. ABLATION STUDY ANALYSIS / ANALISIS STUDI ABLASI")
        print("-" * 50)

        print("\nConfiguration Rankings (by Faithfulness):")
        print("Peringkat Konfigurasi (berdasarkan Faithfulness):\n")
        print(
            "| Rank | Configuration                 | Mean   | 95% CI                |"
        )
        print(
            "|------|------------------------------|--------|----------------------|"
        )

        rankings = []
        for config_name, df in ablation_data.items():
            if "faithfulness" in df.columns:
                faith_data = df["faithfulness"].dropna().values
                if len(faith_data) > 0:
                    mean, lower, upper, _ = confidence_interval(faith_data, 0.95)
                    rankings.append((config_name, mean, lower, upper))

        rankings.sort(key=lambda x: x[1], reverse=True)

        for i, (name, mean, lower, upper) in enumerate(rankings):
            ci_str = f"[{lower:.3f}, {upper:.3f}]"
            print(
                f"| {i+1:<4} | {name:<28} | {mean:.4f} | {ci_str:<20} |"
            )

        if rankings:
            print(f"\nBest Configuration / Konfigurasi Terbaik: {rankings[0][0]}")

        # ===== 7. LATENCY ANALYSIS =====
        print("\n" + "=" * 60)
        print("7. LATENCY ANALYSIS / ANALISIS LATENSI")
        print("-" * 50)

        print("\nLatency Statistics by Configuration (ms):")
        print("Statistik Latensi per Konfigurasi (ms):\n")
        print(
            "| Configuration                 | Mean    | Median  | P95     | Std Dev |"
        )
        print(
            "|------------------------------|---------|---------|---------|---------|"
        )

        for config_name, df in ablation_data.items():
            if "latency_ms" in df.columns:
                latency_data = df["latency_ms"].dropna().values
                if len(latency_data) > 0:
                    stat = calculate_descriptive_stats(latency_data)
                    p95 = np.percentile(latency_data, 95)
                    print(
                        f"| {config_name:<28} | {stat.mean:>7.1f} | {stat.median:>7.1f} | {p95:>7.1f} | {stat.std_dev:>7.1f} |"
                    )

        # Latency comparison: Agentic vs Non-Agentic
        agentic_latencies = []
        non_agentic_latencies = []

        for config_name, df in ablation_data.items():
            if "latency_ms" in df.columns:
                latency_data = df["latency_ms"].dropna().values
                if "Agentic" in config_name or "Full" in config_name:
                    agentic_latencies.extend(latency_data)
                else:
                    non_agentic_latencies.extend(latency_data)

        if len(agentic_latencies) > 0 and len(non_agentic_latencies) > 0:
            print("\nAgentic vs Non-Agentic Latency Comparison:")
            agentic_arr = np.array(agentic_latencies)
            non_agentic_arr = np.array(non_agentic_latencies)

            latency_result = independent_t_test(agentic_arr, non_agentic_arr)

            print(f"  Agentic Mean: {np.mean(agentic_arr):.1f}ms")
            print(f"  Non-Agentic Mean: {np.mean(non_agentic_arr):.1f}ms")
            print(
                f"  Difference: {np.mean(agentic_arr) - np.mean(non_agentic_arr):.1f}ms"
            )
            print(
                f"  Significant: {'Yes / Ya' if latency_result.significant else 'No / Tidak'} (p = {latency_result.p_value:.4f})"
            )

    print("\n" + "=" * 60)
    print("Analysis Complete / Analisis Selesai")
    print("=" * 60)


if __name__ == "__main__":
    run_analysis()
