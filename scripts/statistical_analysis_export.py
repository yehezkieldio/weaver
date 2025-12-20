"""
Export functionality for statistical analysis results.

This module provides helper functions to save statistical analysis results
to JSON and markdown files, following the pattern from run-simulated-user-tests.ts.
"""

import json
from dataclasses import asdict
from datetime import datetime
from typing import Any


def dataclass_to_dict(obj: Any) -> dict:
    """
    Convert dataclass to dict, handling nested structures.
    """
    if hasattr(obj, "__dataclass_fields__"):
        return asdict(obj)
    return obj


def save_json_results(data: dict, filepath: str) -> None:
    """
    Save analysis results to JSON file.

    Args:
        data: Dictionary containing analysis results
        filepath: Path to save JSON file
    """
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    print(f"\n📄 JSON results saved to: {filepath}")


def generate_markdown_report(
    analysis_results: dict,
    start_time: datetime,
    end_time: datetime,
) -> str:
    """
    Generate comprehensive markdown report from statistical analysis results.

    Args:
        analysis_results: Dictionary containing all analysis results
        start_time: Analysis start timestamp
        end_time: Analysis end timestamp

    Returns:
        Formatted markdown report string
    """
    duration = (end_time - start_time).total_seconds()

    report = f"""# RAG Evaluation Statistical Analysis Report

**Report Generated**: {end_time.isoformat()}
**Analysis Duration**: {duration:.1f}s
**Data Source**: {analysis_results.get('data_source', 'Unknown')}
**Question Count**: {analysis_results.get('n_questions', 0)}

---

## Executive Summary

This report presents comprehensive statistical analysis of RAG evaluation metrics,
including descriptive statistics, hypothesis testing, and distribution diagnostics.

### Key Findings

| Metric | Mean | Median | Std Dev | Status |
|--------|------|--------|---------|--------|
"""

    # Add key metrics summary
    desc_stats = analysis_results.get("descriptive_stats", {})
    for metric_name, stats in desc_stats.items():
        if isinstance(stats, dict):
            mean = stats.get("mean", 0)
            median = stats.get("median", 0)
            std_dev = stats.get("std_dev", 0)

            # Status based on mean value (assuming 0-1 scale)
            if mean >= 0.8:
                status = "✅ Excellent"
            elif mean >= 0.6:
                status = "⚠️ Acceptable"
            else:
                status = "❌ Needs Improvement"

            report += f"| {metric_name} | {mean:.3f} | {median:.3f} | {std_dev:.3f} | {status} |\n"

    report += f"""

---

## 1. Descriptive Statistics

### 1.1 Distribution Diagnostics

"""

    # Add distribution warnings
    warnings = analysis_results.get("distribution_warnings", [])
    if warnings:
        report += "**Warnings Detected:**\n\n"
        for warning in warnings:
            report += f"- {warning}\n"
        report += "\n"
    else:
        report += "✅ All metrics show acceptable distributions for parametric testing.\n\n"

    # Add detailed statistics
    for metric_name, stats in desc_stats.items():
        if isinstance(stats, dict):
            report += f"""
### {metric_name}

| Statistic | Value |
|-----------|-------|
| N | {stats.get('n', 0)} |
| Mean | {stats.get('mean', 0):.4f} |
| Median | {stats.get('median', 0):.4f} |
| Std Dev | {stats.get('std_dev', 0):.4f} |
| Min | {stats.get('min_val', 0):.4f} |
| Max | {stats.get('max_val', 0):.4f} |
| Skewness | {stats.get('skewness', 0):.4f} |
| Kurtosis | {stats.get('kurtosis', 0):.4f} |

"""

            # Add robust statistics if distribution is non-normal
            if abs(stats.get('kurtosis', 0)) > 3 or abs(stats.get('skewness', 0)) > 1:
                report += """**Robust Statistics** (non-normal distribution detected):

| Statistic | Value |
|-----------|-------|
"""
                report += f"| Trimmed Mean (10%) | {stats.get('trimmed_mean', 0):.4f} |\n"
                report += f"| MAD | {stats.get('mad', 0):.4f} |\n"
                report += f"| P90 | {stats.get('p90', 0):.4f} |\n"
                report += f"| P95 | {stats.get('p95', 0):.4f} |\n"
                report += f"| P99 | {stats.get('p99', 0):.4f} |\n\n"

    report += """
---

## 2. Hypothesis Testing

### 2.1 RAG vs Non-RAG Comparison

"""

    # Add comparison results
    comparisons = analysis_results.get("rag_comparisons", [])
    if comparisons:
        for comp in comparisons:
            metric = comp.get("metric", "Unknown")
            improvement_pct = comp.get("improvement_percent", 0)
            p_value = comp.get("p_value", 1.0)
            significant = comp.get("significant", False)

            sig_status = "✅ Significant" if significant else "❌ Not Significant"

            report += f"""
#### {metric}

- **Improvement**: {improvement_pct:+.1f}%
- **P-value**: {p_value:.4f}
- **Statistical Significance**: {sig_status}
- **Test Used**: {comp.get('test_name', 'Unknown')}

"""

    report += """
---

## 3. Statistical Validity

### 3.1 Assumption Checks

"""

    # Add assumption check results
    assumption_checks = analysis_results.get("assumption_checks", {})
    for test_name, check in assumption_checks.items():
        report += f"""
#### {test_name}

- **Normality**: {"✓ Passed" if check.get("normality_passed") else "✗ Failed"} (p = {check.get("normality_p_value", 0):.4f})
- **Homogeneity**: {"✓ Passed" if check.get("homogeneity_passed") else "✗ Failed"} (p = {check.get("homogeneity_p_value", 0):.4f})
- **Outliers**: {check.get("outlier_count", 0)} detected ({check.get("outlier_percentage", 0):.1f}%)
- **Recommended Test**: {check.get("recommended_test", "Unknown")}

"""

        warnings = check.get("warnings", [])
        if warnings:
            report += "**Warnings:**\n"
            for warning in warnings:
                report += f"- {warning}\n"
            report += "\n"

    report += """
---

## 4. Conclusions

"""

    # Add conclusions based on results
    n_significant = sum(1 for c in comparisons if c.get("significant", False))
    n_total = len(comparisons)

    if n_significant > 0:
        report += f"""
✅ **RAG System Shows Statistically Significant Improvements**

- {n_significant}/{n_total} metrics show significant improvement over baseline
- Results validate the effectiveness of the RAG implementation
- Suitable for academic publication with appropriate caveats

"""
    else:
        report += f"""
⚠️ **No Statistically Significant Improvements Detected**

- {n_total} metrics tested, none show significant improvement
- May require larger sample size or system optimization
- Consider investigating failure modes before publication

"""

    report += """
---

## References

- Shahul, E. S., et al. (2023). \"RAGAS: Automated Evaluation of Retrieval Augmented Generation\"
- Statistical tests performed using SciPy {scipy_version}
- Reporting follows APA guidelines for statistical significance

---

*Report generated by Statistical Analysis Framework*
*Complementary to RAGAS Component-Level Evaluation*
""".format(scipy_version="1.11+")  # Update with actual version if needed

    return report


def save_markdown_report(report: str, filepath: str) -> None:
    """
    Save markdown report to file.

    Args:
        report: Markdown report string
        filepath: Path to save markdown file
    """
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"📄 Markdown report saved to: {filepath}")
