import argparse
import json
import os
import sys
from dataclasses import dataclass, asdict
from datetime import datetime
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

# Visualization module
from statistical_visualization import FigureGenerator

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
    # Robust statistics for non-normal distributions
    p25: float  # 25th percentile (same as q1, but explicit)
    p75: float  # 75th percentile (same as q3, but explicit)
    p90: float
    p95: float
    p99: float
    mad: float  # Median Absolute Deviation
    trimmed_mean: float  # 10% trimmed mean


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
                rag_citation_accuracy,
                rag_hallucination_rate, rag_factual_consistency, rag_source_attribution,
                rag_contradiction_score,
                retrieval_ndcg, retrieval_mrr, retrieval_precision,
                rag_latency_ms, rag_retrieval_latency_ms,
                rag_reranking_latency_ms, rag_generation_latency_ms,
                rag_agent_reasoning_latency_ms, rag_planning_latency_ms,
                rag_synthesis_latency_ms, rag_avg_step_latency_ms,
                rag_tool_call_latency_ms, rag_tokens_per_second,
                agent_steps_used, retrieval_method, reranker_strategy,
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
            "rag_citation_accuracy",
            "rag_hallucination_rate",
            "rag_factual_consistency",
            "rag_source_attribution",
            "rag_contradiction_score",
            "retrieval_ndcg",
            "retrieval_mrr",
            "retrieval_precision",
            "rag_latency_ms",
            "rag_retrieval_latency_ms",
            "rag_reranking_latency_ms",
            "rag_generation_latency_ms",
            "rag_agent_reasoning_latency_ms",
            "rag_planning_latency_ms",
            "rag_synthesis_latency_ms",
            "rag_avg_step_latency_ms",
            "rag_tool_call_latency_ms",
            "rag_tokens_per_second",
            "agent_steps_used",
            "retrieval_method",
            "reranker_strategy",
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
                config_data[config_name] = []

            # Extract per-question metrics if available
            per_question = result.get("perQuestionMetrics", [])
            if per_question:
                for pq in per_question:
                    record = {
                        "faithfulness": pq.get("faithfulness"),
                        "answer_relevancy": pq.get("answerRelevancy"),
                        "context_precision": pq.get("contextPrecision"),
                        "context_recall": pq.get("contextRecall"),
                        "context_relevancy": pq.get("contextRelevancy"),
                        "answer_correctness": pq.get("answerCorrectness"),
                        "hallucination_rate": pq.get("hallucinationRate"),
                        "latency_ms": pq.get("totalLatencyMs"),
                        "planning_latency_ms": pq.get("planningLatencyMs"),
                        "synthesis_latency_ms": pq.get("synthesisLatencyMs"),
                        "avg_step_latency_ms": pq.get("avgStepLatencyMs"),
                    }
                    config_data[config_name].append(record)
            else:
                # Fallback to aggregated metrics
                metrics = result.get("metrics", {})
                if metrics:
                    record = {
                        "faithfulness": metrics.get("faithfulness"),
                        "answer_relevancy": metrics.get("answerRelevancy"),
                        "context_precision": metrics.get("contextPrecision"),
                        "context_recall": metrics.get("contextRecall"),
                        "context_relevancy": metrics.get("contextRelevancy"),
                        "answer_correctness": metrics.get("answerCorrectness"),
                        "hallucination_rate": metrics.get("hallucinationRate"),
                        "latency_ms": metrics.get("totalLatencyMs"),
                        "planning_latency_ms": metrics.get("planningLatencyMs"),
                        "synthesis_latency_ms": metrics.get("synthesisLatencyMs"),
                        "avg_step_latency_ms": metrics.get("avgStepLatencyMs"),
                    }
                    config_data[config_name].append(record)

        # Convert to DataFrames
        return {
            name: pd.DataFrame(data) for name, data in config_data.items() if data
        }


# ===== STATISTICAL FUNCTIONS =====
def calculate_descriptive_stats(data: np.ndarray) -> DescriptiveStats:
    """Calculate comprehensive descriptive statistics including robust measures."""
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
            p25=0,
            p75=0,
            p90=0,
            p95=0,
            p99=0,
            mad=0,
            trimmed_mean=0,
        )

    # Basic percentiles
    q1 = np.percentile(data, 25)
    q3 = np.percentile(data, 75)
    p90 = np.percentile(data, 90)
    p95 = np.percentile(data, 95)
    p99 = np.percentile(data, 99)

    # Robust statistics
    median = np.median(data)
    mad = np.median(np.abs(data - median))  # Median Absolute Deviation
    trimmed_mean = stats.trim_mean(data, 0.1) if len(data) > 10 else np.mean(data)  # 10% trimmed

    # Standard statistics with edge case protection
    try:
        # Check if data has enough variance for reliable statistics
        if np.std(data) < 1e-10:  # Nearly identical values
            kurtosis_val = 0.0
            skewness_val = 0.0
        else:
            kurtosis_val = stats.kurtosis(data) if len(data) > 3 else 0
            skewness_val = stats.skew(data) if len(data) > 2 else 0
    except Exception:
        kurtosis_val = 0.0
        skewness_val = 0.0

    return DescriptiveStats(
        n=len(data),
        mean=np.mean(data),
        median=median,
        std_dev=np.std(data, ddof=1) if len(data) > 1 else 0,
        variance=np.var(data, ddof=1) if len(data) > 1 else 0,
        min_val=np.min(data),
        max_val=np.max(data),
        sem=stats.sem(data) if len(data) > 1 else 0,
        skewness=skewness_val,
        kurtosis=kurtosis_val,
        q1=q1,
        q3=q3,
        iqr=q3 - q1,
        p25=q1,  # Same as q1, but explicit
        p75=q3,  # Same as q3, but explicit
        p90=p90,
        p95=p95,
        p99=p99,
        mad=mad,
        trimmed_mean=trimmed_mean,
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

    # Check for zero variance (identical data) - Shapiro-Wilk will fail
    if np.std(data) < 1e-10:
        return True, 1.0  # No variance means we can't test normality

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

    # Effect size (epsilon-squared) with protection for negative values
    n = sum(len(g) for g in groups)
    epsilon_sq = (stat - len(groups) + 1) / (n - len(groups)) if n > len(groups) else 0
    epsilon_sq = max(0, epsilon_sq)  # Ensure non-negative for sqrt

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
def print_descriptive_stats(stats: DescriptiveStats, show_robust: bool = True):
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

    # Show robust statistics if requested (useful for non-normal distributions)
    if show_robust and (abs(stats.kurtosis) > 3 or abs(stats.skewness) > 1):
        print("\n  Robust Statistics (for non-normal distribution):")
        print(f"    Trimmed Mean (10%): {stats.trimmed_mean:.4f}")
        print(f"    MAD (Median Absolute Deviation): {stats.mad:.4f}")
        print(f"    Percentiles: P25={stats.p25:.4f}, P75={stats.p75:.4f}, P90={stats.p90:.4f}, P95={stats.p95:.4f}, P99={stats.p99:.4f}")
        print(f"    IQR: {stats.iqr:.4f}")


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
    parser.add_argument(
        "--figures", action="store_true", help="Generate publication-quality figures (PNG)"
    )
    parser.add_argument(
        "--output-dir", default=".results/figures", help="Output directory for figures"
    )
    args = parser.parse_args()

    # Initialize figure generator if figures requested
    fig_gen = None
    if args.figures:
        fig_gen = FigureGenerator(output_dir=args.output_dir)
        print(f"📊 Figure generation enabled. Output: {args.output_dir}")

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
            print("  uv run scripts/run-statistical-analysis.py --latest")
            print("  uv run scripts/run-statistical-analysis.py --run-id=<uuid>")
            print("  uv run scripts/run-statistical-analysis.py --ablation-id=<uuid>")
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
        rag_citation_accuracy = evaluation_data["rag_citation_accuracy"].dropna().values
        rag_factual_consistency = evaluation_data["rag_factual_consistency"].dropna().values
        rag_source_attribution = evaluation_data["rag_source_attribution"].dropna().values
        rag_contradiction_score = evaluation_data["rag_contradiction_score"].dropna().values
        retrieval_ndcg = evaluation_data["retrieval_ndcg"].dropna().values
        retrieval_mrr = evaluation_data["retrieval_mrr"].dropna().values
        retrieval_precision = evaluation_data["retrieval_precision"].dropna().values
        rag_latency = evaluation_data["rag_latency_ms"].dropna().values
        rag_planning = evaluation_data["rag_planning_latency_ms"].dropna().values
        rag_synthesis = evaluation_data["rag_synthesis_latency_ms"].dropna().values
        rag_avg_step = evaluation_data["rag_avg_step_latency_ms"].dropna().values
        rag_tool_call = evaluation_data["rag_tool_call_latency_ms"].dropna().values
        rag_tokens_per_sec = evaluation_data["rag_tokens_per_second"].dropna().values

        non_rag_relevancy = evaluation_data["non_rag_answer_relevancy"].dropna().values
        non_rag_latency = evaluation_data["non_rag_latency_ms"].dropna().values

        if len(rag_faithfulness) > 0:
            print("\nRAG Faithfulness:")
            print_descriptive_stats(calculate_descriptive_stats(rag_faithfulness))

        if len(rag_citation_accuracy) > 0:
            print("\nRAG Citation Accuracy:")
            print_descriptive_stats(calculate_descriptive_stats(rag_citation_accuracy))

        if len(rag_factual_consistency) > 0:
            print("\nRAG Factual Consistency:")
            print_descriptive_stats(calculate_descriptive_stats(rag_factual_consistency))

        if len(rag_source_attribution) > 0:
            print("\nRAG Source Attribution:")
            print_descriptive_stats(calculate_descriptive_stats(rag_source_attribution))

        if len(rag_contradiction_score) > 0:
            print("\nRAG Contradiction Score (lower is better):")
            print_descriptive_stats(calculate_descriptive_stats(rag_contradiction_score))

        if len(retrieval_ndcg) > 0:
            print("\nRetrieval NDCG:")
            print_descriptive_stats(calculate_descriptive_stats(retrieval_ndcg))

        if len(retrieval_mrr) > 0:
            print("\nRetrieval MRR (Mean Reciprocal Rank):")
            print_descriptive_stats(calculate_descriptive_stats(retrieval_mrr))

        if len(retrieval_precision) > 0:
            print("\nRetrieval Precision:")
            print_descriptive_stats(calculate_descriptive_stats(retrieval_precision))

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

        if len(rag_tool_call) > 0 and np.any(rag_tool_call > 0):
            print("\nRAG Tool Call Latency (ms):")
            print_descriptive_stats(calculate_descriptive_stats(rag_tool_call))

        if len(rag_tokens_per_sec) > 0 and np.any(rag_tokens_per_sec > 0):
            print("\nRAG Tokens Per Second:")
            print_descriptive_stats(calculate_descriptive_stats(rag_tokens_per_sec))

        # ===== FIGURE: Descriptive Statistics Table =====
        if fig_gen:
            print("\n[Generating Descriptive Statistics Figure...]")
            stats_data = {
                "Kesetiaan": calculate_descriptive_stats(rag_faithfulness),
                "Relevansi Jawaban": calculate_descriptive_stats(rag_relevancy),
                "Akurasi Sitasi": calculate_descriptive_stats(rag_citation_accuracy),
                "Konsistensi Faktual": calculate_descriptive_stats(rag_factual_consistency),
                "NDCG": calculate_descriptive_stats(retrieval_ndcg),
                "MRR": calculate_descriptive_stats(retrieval_mrr),
            }
            stats_df = pd.DataFrame({
                metric: {
                    "N": int(s.n),
                    "Rerata": round(s.mean, 4),
                    "Median": round(s.median, 4),
                    "Std Dev": round(s.std_dev, 4),
                    "Min": round(s.min_val, 4),
                    "Maks": round(s.max_val, 4),
                }
                for metric, s in stats_data.items() if s.n > 0
            }).T
            fig_gen.save_table_as_image(
                stats_df,
                "RAG Metrics - Descriptive Statistics",
                "descriptive_stats_table",
                "Metrik RAG - Statistik Deskriptif",
            )

            # ===== FIGURE: Latency Histogram =====
            if len(rag_latency) > 0:
                fig_gen.create_latency_histogram(
                    rag_latency,
                    "latency_distribution",
                    "RAG Response Latency Distribution",
                    "Distribusi Latensi Respons RAG",
                    comparison_data=non_rag_latency if len(non_rag_latency) > 0 else None,
                    labels=("RAG", "Non-RAG"),
                )

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

        # Additional hallucination sub-metrics (RAG only - no non-RAG comparison)
        rag_factual_consistency = evaluation_data["rag_factual_consistency"].dropna().values
        rag_source_attribution = evaluation_data["rag_source_attribution"].dropna().values
        rag_citation_accuracy = evaluation_data["rag_citation_accuracy"].dropna().values

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

        # Display RAG-only detailed metrics
        if len(rag_factual_consistency) > 0:
            print("\n" + "-" * 50)
            print("RAG Factual Consistency (detailed metric):")
            stats = calculate_descriptive_stats(rag_factual_consistency)
            mean, lower, upper, _ = confidence_interval(rag_factual_consistency, 0.95)
            print(f"  Mean: {stats.mean:.4f} (SD: {stats.std_dev:.4f})")
            print(f"  95% CI: [{lower:.4f}, {upper:.4f}]")

        if len(rag_source_attribution) > 0:
            print("\n" + "-" * 50)
            print("RAG Source Attribution:")
            stats = calculate_descriptive_stats(rag_source_attribution)
            mean, lower, upper, _ = confidence_interval(rag_source_attribution, 0.95)
            print(f"  Mean: {stats.mean:.4f} (SD: {stats.std_dev:.4f})")
            print(f"  95% CI: [{lower:.4f}, {upper:.4f}]")

        if len(rag_citation_accuracy) > 0:
            print("\n" + "-" * 50)
            print("RAG Citation Accuracy:")
            stats = calculate_descriptive_stats(rag_citation_accuracy)
            mean, lower, upper, _ = confidence_interval(rag_citation_accuracy, 0.95)
            print(f"  Mean: {stats.mean:.4f} (SD: {stats.std_dev:.4f})")
            print(f"  95% CI: [{lower:.4f}, {upper:.4f}]")

        # ===== FIGURE: Comparison Boxplots and Forest Plot =====
        if fig_gen and comparisons:
            print("\n[Generating Comparison Figures...]")

            # Generate boxplots for each comparison
            for comp in comparisons:
                # Get raw data for the comparison
                if comp.metric == "Answer Relevancy":
                    rag_d, non_rag_d = rag_rel, non_rag_rel
                elif comp.metric == "Answer Correctness":
                    rag_d, non_rag_d = rag_corr, non_rag_corr
                else:
                    rag_d, non_rag_d = rag_factual, non_rag_factual

                fig_gen.create_comparison_boxplot(
                    rag_d,
                    non_rag_d,
                    comp.metric,
                    f"comparison_{comp.metric.lower().replace(' ', '_').replace('(', '').replace(')', '')}",
                    comp.metric_id,
                    comp.test_result.p_value,
                )

            # ===== FIGURE: Statistical Test Results Table =====
            test_results_list = []
            for comp in comparisons:
                test_results_list.append({
                    "metric_id": comp.metric_id,
                    "test_name_id": comp.test_result.test_name_id,
                    "statistic": comp.test_result.statistic,
                    "p_value": comp.test_result.p_value,
                    "effect_size": comp.test_result.effect_size,
                    "effect_size_interpretation": comp.test_result.effect_size_interpretation,
                })

            fig_gen.create_statistical_test_results_table(
                test_results_list,
                "statistical_test_results_table",
                "Statistical Test Results: RAG vs Non-RAG",
                "Hasil Uji Statistik: RAG vs Non-RAG",
            )

            # ===== FIGURE: Comparison Summary Table =====
            comparison_summary = []
            for comp in comparisons:
                comparison_summary.append({
                    "Metrik": comp.metric_id,
                    "RAG (μ)": f"{comp.rag_stats.mean:.4f}",
                    "Non-RAG (μ)": f"{comp.non_rag_stats.mean:.4f}",
                    "Δ": f"{comp.improvement:.4f}",
                    "Δ%": f"{comp.improvement_percent:.1f}%",
                    "p-value": f"{comp.test_result.p_value:.4f}",
                    "Cohen's d": f"{comp.test_result.effect_size:.3f}" if comp.test_result.effect_size else "N/A",
                })

            comp_df = pd.DataFrame(comparison_summary)
            fig_gen.save_table_as_image(
                comp_df,
                "RAG vs Non-RAG Comparison Summary",
                "rag_vs_nonrag_comparison_summary",
                "Ringkasan Perbandingan RAG vs Non-RAG",
                highlight_cols=["Δ%"],
            )

            # ===== FIGURE: Forest Plot for Effect Sizes =====
            effect_sizes = [comp.test_result.effect_size or 0 for comp in comparisons]
            cis = []
            for comp in comparisons:
                if comp.test_result.confidence_interval:
                    cis.append(comp.test_result.confidence_interval)
                else:
                    # Estimate CI from effect size if not available
                    d = comp.test_result.effect_size or 0
                    cis.append((d - 0.3, d + 0.3))

            fig_gen.create_forest_plot(
                effect_sizes,
                cis,
                [comp.metric_id for comp in comparisons],
                "effect_sizes_forest_plot",
                "RAG vs Non-RAG Effect Sizes",
                "Ukuran Efek RAG vs Non-RAG",
            )

            # ===== FIGURE: Radar Chart for Multi-Metric Overview =====
            rag_metrics = {
                "Kesetiaan": np.mean(rag_faithfulness) if len(rag_faithfulness) > 0 else 0,
                "Relevansi": np.mean(rag_relevancy) if len(rag_relevancy) > 0 else 0,
                "Akurasi Sitasi": np.mean(rag_citation_accuracy) if len(rag_citation_accuracy) > 0 else 0,
                "Konsistensi Faktual": np.mean(rag_factual_consistency) if len(rag_factual_consistency) > 0 else 0,
                "NDCG": np.mean(retrieval_ndcg) if len(retrieval_ndcg) > 0 else 0,
            }
            non_rag_metrics = {
                "Kesetiaan": 0,  # N/A for non-RAG
                "Relevansi": np.mean(non_rag_rel) if len(non_rag_rel) > 0 else 0,
                "Akurasi Sitasi": 0,  # N/A for non-RAG
                "Konsistensi Faktual": 0,  # N/A for non-RAG
                "NDCG": 0,  # N/A for non-RAG
            }
            fig_gen.create_radar_chart(
                rag_metrics,
                "radar_metrics_overview",
                "Multi-Metric Overview",
                "Ikhtisar Multi-Metrik",
                comparison_metrics=non_rag_metrics,
                labels=("RAG", "Non-RAG (jika ada)"),
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

            # ===== COMPREHENSIVE ABLATION FIGURES =====
            if fig_gen:
                print("\n[Generating Comprehensive Ablation Study Figures...]")

                # 1. Ranking bar chart for Faithfulness
                config_names = [r[0] for r in rankings]
                metric_values = [r[1] for r in rankings]
                confidence_intervals = [(r[2], r[3]) for r in rankings]

                fig_gen.create_ablation_bar_chart(
                    config_names,
                    metric_values,
                    "Faithfulness",
                    "ablation_ranking_faithfulness",
                    "Kesetiaan",
                    confidence_intervals=confidence_intervals,
                    highlight_best=True,
                )

                # 2. Additional rankings for other metrics
                for metric, metric_id in [
                    ("answer_relevancy", "Relevansi Jawaban"),
                    ("context_precision", "Presisi Konteks"),
                    ("answer_correctness", "Kebenaran Jawaban"),
                ]:
                    metric_rankings = []
                    for config_name, df in ablation_data.items():
                        if metric in df.columns:
                            data = df[metric].dropna().values
                            if len(data) > 0:
                                mean, lower, upper, _ = confidence_interval(data, 0.95)
                                metric_rankings.append((config_name, mean, lower, upper))

                    if metric_rankings:
                        metric_rankings.sort(key=lambda x: x[1], reverse=True)
                        fig_gen.create_ablation_bar_chart(
                            [r[0] for r in metric_rankings],
                            [r[1] for r in metric_rankings],
                            metric.replace("_", " ").title(),
                            f"ablation_ranking_{metric}",
                            metric_id,
                            confidence_intervals=[(r[2], r[3]) for r in metric_rankings],
                            highlight_best=True,
                        )

                # 3. Multi-metric comparison grouped bar chart
                metrics = ["faithfulness", "answer_relevancy", "context_precision", "context_recall", "answer_correctness"]
                metric_names_id = ["Kesetiaan", "Relevansi", "Presisi Konteks", "Recall Konteks", "Kebenaran"]
                available_metrics = [m for m in metrics if any(m in df.columns for df in ablation_data.values())]
                available_names_id = [metric_names_id[metrics.index(m)] for m in available_metrics]

                if available_metrics:
                    fig_gen.create_ablation_multi_metric_comparison(
                        ablation_data,
                        available_metrics,
                        available_names_id,
                        "ablation_multi_metric_comparison",
                        "Multi-Metric Configuration Comparison",
                        "Perbandingan Multi-Metrik Konfigurasi",
                    )

                # 4. Heatmap of all configurations and metrics
                if available_metrics:
                    fig_gen.create_ablation_heatmap(
                        ablation_data,
                        available_metrics,
                        "ablation_performance_heatmap",
                        "Ablation Configuration Performance Heatmap",
                        "Peta Panas Performa Konfigurasi Ablasi",
                    )

                # 5. Detailed comparison table
                fig_gen.create_ablation_comparison_table(
                    ablation_data,
                    available_metrics,
                    "ablation_detailed_comparison_table",
                    "Ablation Study: Detailed Metric Comparison",
                    "Studi Ablasi: Perbandingan Detail Metrik",
                )

                # 6. Latency analysis
                fig_gen.create_latency_comparison_table(
                    ablation_data,
                    "ablation_latency_comparison_table",
                    "Ablation Study: Latency Analysis",
                    "Studi Ablasi: Analisis Latensi",
                )

                # 7. Latency boxplot
                fig_gen.create_ablation_latency_boxplot(
                    ablation_data,
                    "ablation_latency_boxplot",
                    "Latency Distribution by Configuration",
                    "Distribusi Latensi per Konfigurasi",
                )

                # 8. Radar chart for top 3 configurations
                if len(rankings) >= 3 and available_metrics:
                    top_3_configs = [r[0] for r in rankings[:3]]
                    for i, config_name in enumerate(top_3_configs):
                        if config_name in ablation_data:
                            df = ablation_data[config_name]
                            metrics_dict = {}
                            for metric, metric_id in zip(available_metrics, available_names_id):
                                if metric in df.columns:
                                    data = df[metric].dropna().values
                                    metrics_dict[metric_id] = np.mean(data) if len(data) > 0 else 0

                            if i == 0:
                                # For best config, compare with second best
                                if rankings[1][0] in ablation_data:
                                    df2 = ablation_data[rankings[1][0]]
                                    comparison_dict = {}
                                    for metric, metric_id in zip(available_metrics, available_names_id):
                                        if metric in df2.columns:
                                            data = df2[metric].dropna().values
                                            comparison_dict[metric_id] = np.mean(data) if len(data) > 0 else 0

                                    fig_gen.create_radar_chart(
                                        metrics_dict,
                                        f"ablation_radar_top2_comparison",
                                        f"Top 2 Configurations Comparison",
                                        f"Perbandingan 2 Konfigurasi Teratas",
                                        comparison_metrics=comparison_dict,
                                        labels=(rankings[0][0], rankings[1][0]),
                                    )

                # 9. ANOVA results table for all metrics
                anova_results_for_table = []
                for metric, metric_id in [
                    ("faithfulness", "Kesetiaan"),
                    ("answer_relevancy", "Relevansi Jawaban"),
                    ("context_precision", "Presisi Konteks"),
                    ("context_recall", "Recall Konteks"),
                    ("answer_correctness", "Kebenaran Jawaban"),
                ]:
                    metric_groups = []
                    for config_name, df in ablation_data.items():
                        if metric in df.columns:
                            data = df[metric].dropna().values
                            if len(data) > 0:
                                metric_groups.append(data)

                    if len(metric_groups) >= 3:
                        test_name, test_result = smart_statistical_test(metric_groups, paired=False)
                        anova_results_for_table.append({
                            "metric": metric,
                            "metric_id": metric_id,
                            "test_name": test_name,
                            "test_name_id": test_result.test_name_id,
                            "statistic": test_result.statistic,
                            "p_value": test_result.p_value,
                            "degrees_of_freedom": test_result.degrees_of_freedom,
                            "effect_size": test_result.effect_size,
                        })

                if anova_results_for_table:
                    fig_gen.create_anova_results_table(
                        anova_results_for_table,
                        "anova_results_summary_table",
                        "Hasil Analisis ANOVA/Kruskal-Wallis Semua Metrik",
                    )

                # 10. Violin plots for key metrics distribution
                for metric, metric_id in [
                    ("faithfulness", "Kesetiaan"),
                    ("answer_relevancy", "Relevansi Jawaban"),
                    ("answer_correctness", "Kebenaran Jawaban"),
                ]:
                    if any(metric in df.columns for df in ablation_data.values()):
                        fig_gen.create_metric_violin_plot(
                            ablation_data,
                            metric,
                            f"violin_{metric}",
                            metric_id,
                            f"Distribusi {metric_id} per Konfigurasi",
                        )

                # 11. Descriptive stats table for all configurations
                all_config_stats = {}
                for config_name, df in ablation_data.items():
                    config_stats = {}
                    for metric in ["faithfulness", "answer_relevancy", "answer_correctness", "latency_ms"]:
                        if metric in df.columns:
                            data = df[metric].dropna().values
                            if len(data) > 0:
                                stats = calculate_descriptive_stats(data)
                                config_stats[metric] = {
                                    "n": stats.n,
                                    "mean": stats.mean,
                                    "median": stats.median,
                                    "std_dev": stats.std_dev,
                                    "min_val": stats.min_val,
                                    "max_val": stats.max_val,
                                    "q1": stats.q1,
                                    "q3": stats.q3,
                                }
                    if config_stats:
                        all_config_stats[config_name] = config_stats

                if all_config_stats:
                    # Create summary table for faithfulness across all configs
                    faith_summary_rows = []
                    for config_name, metrics in all_config_stats.items():
                        if "faithfulness" in metrics:
                            s = metrics["faithfulness"]
                            faith_summary_rows.append({
                                "Konfigurasi": config_name,
                                "N": s["n"],
                                "Rerata": f"{s['mean']:.4f}",
                                "Median": f"{s['median']:.4f}",
                                "Std Dev": f"{s['std_dev']:.4f}",
                                "Min": f"{s['min_val']:.4f}",
                                "Maks": f"{s['max_val']:.4f}",
                            })

                    if faith_summary_rows:
                        faith_df = pd.DataFrame(faith_summary_rows)
                        fig_gen.save_table_as_image(
                            faith_df,
                            "Descriptive Statistics: Faithfulness by Configuration",
                            "descriptive_stats_faithfulness_all_configs",
                            "Statistik Deskriptif: Kesetiaan per Konfigurasi",
                        )

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

    # ===== FIGURE: Summary Dashboard =====
    if fig_gen:
        print("\n[Generating Summary Dashboard...]")

        # Prepare summary data
        metrics_summary = {}

        if evaluation_data is not None and len(evaluation_data) > 0:
            rag_faith = evaluation_data["rag_faithfulness"].dropna().values
            rag_rel = evaluation_data["rag_answer_relevancy"].dropna().values
            rag_cit = evaluation_data["rag_citation_accuracy"].dropna().values
            rag_fact = evaluation_data["rag_factual_consistency"].dropna().values

            metrics_summary["key_metrics"] = {
                "Kesetiaan": np.mean(rag_faith) if len(rag_faith) > 0 else 0,
                "Relevansi": np.mean(rag_rel) if len(rag_rel) > 0 else 0,
                "Akurasi Sitasi": np.mean(rag_cit) if len(rag_cit) > 0 else 0,
                "Konsistensi": np.mean(rag_fact) if len(rag_fact) > 0 else 0,
            }

            non_rag_rel = evaluation_data["non_rag_answer_relevancy"].dropna().values
            if len(non_rag_rel) > 0 and len(rag_rel) > 0:
                metrics_summary["improvements"] = {
                    "Relevansi Jawaban": ((np.mean(rag_rel) - np.mean(non_rag_rel)) / np.mean(non_rag_rel) * 100) if np.mean(non_rag_rel) > 0 else 0,
                }

            rag_lat = evaluation_data["rag_latency_ms"].dropna().values
            rag_ret_lat = evaluation_data["rag_retrieval_latency_ms"].dropna().values
            rag_gen_lat = evaluation_data["rag_generation_latency_ms"].dropna().values

            metrics_summary["latency"] = {
                "Total": {"mean": np.mean(rag_lat) if len(rag_lat) > 0 else 0, "std": np.std(rag_lat) if len(rag_lat) > 0 else 0},
                "Retrival": {"mean": np.mean(rag_ret_lat) if len(rag_ret_lat) > 0 else 0, "std": np.std(rag_ret_lat) if len(rag_ret_lat) > 0 else 0},
                "Generasi": {"mean": np.mean(rag_gen_lat) if len(rag_gen_lat) > 0 else 0, "std": np.std(rag_gen_lat) if len(rag_gen_lat) > 0 else 0},
            }

            metrics_summary["summary_stats"] = {
                "Total Pertanyaan": len(evaluation_data),
                "Rerata Kesetiaan": np.mean(rag_faith) if len(rag_faith) > 0 else 0,
                "Rerata Latensi (ms)": np.mean(rag_lat) if len(rag_lat) > 0 else 0,
            }

        fig_gen.create_summary_dashboard(metrics_summary, "summary_dashboard")
        fig_gen.print_summary()


if __name__ == "__main__":
    run_analysis()
