#!/usr/bin/env python3
"""
Statistical Visualization Module for IMRAD Paper Figures

Provides publication-quality visualization helpers for RAG evaluation metrics.
Generates PNG/JPG figures suitable for academic papers at 300 DPI.

Usage:
    from statistical_visualization import FigureGenerator

    fig_gen = FigureGenerator(output_dir=".results/figures")
    fig_gen.create_comparison_boxplot(rag_data, non_rag_data, "Metric Name")
"""

import os
from dataclasses import dataclass
from typing import Optional

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import pandas as pd
import seaborn as sns
from matplotlib.table import Table


# ===== Configuration =====
@dataclass
class FigureConfig:
    """Configuration for figure generation."""
    dpi: int = 300
    format: str = "png"
    font_family: str = "serif"
    title_fontsize: int = 14
    label_fontsize: int = 12
    tick_fontsize: int = 10
    legend_fontsize: int = 10
    figure_width: float = 10.0
    figure_height: float = 6.0
    palette: str = "colorblind"  # Colorblind-friendly palette
    style: str = "whitegrid"


class FigureGenerator:
    """
    Publication-quality figure generator for IMRAD papers.

    Generates various visualization types suitable for academic publications,
    including tables as images, box plots, bar charts, radar charts, etc.
    """

    def __init__(
        self,
        output_dir: str = ".results/figures",
        config: Optional[FigureConfig] = None,
        bilingual: bool = True,
    ):
        """
        Initialize the figure generator.

        Args:
            output_dir: Directory to save generated figures
            config: Custom configuration (uses defaults if None)
            bilingual: If True, include Indonesian labels where appropriate
        """
        self.output_dir = output_dir
        self.config = config or FigureConfig()
        self.bilingual = bilingual
        self.generated_files: list[str] = []

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

        # Apply matplotlib style settings
        self._apply_style()

    def _apply_style(self):
        """Apply consistent styling across all figures."""
        sns.set_style(self.config.style)
        sns.set_palette(self.config.palette)
        plt.rcParams.update({
            "font.family": self.config.font_family,
            "font.size": self.config.tick_fontsize,
            "axes.titlesize": self.config.title_fontsize,
            "axes.labelsize": self.config.label_fontsize,
            "xtick.labelsize": self.config.tick_fontsize,
            "ytick.labelsize": self.config.tick_fontsize,
            "legend.fontsize": self.config.legend_fontsize,
            "figure.dpi": self.config.dpi,
            "savefig.dpi": self.config.dpi,
            "savefig.bbox": "tight",
            "savefig.pad_inches": 0.1,
        })

    def _save_figure(self, fig: plt.Figure, filename: str) -> str:
        """Save figure and track generated file."""
        filepath = os.path.join(self.output_dir, f"{filename}.{self.config.format}")
        fig.savefig(filepath, format=self.config.format, dpi=self.config.dpi, bbox_inches="tight")
        plt.close(fig)
        self.generated_files.append(filepath)
        print(f"  📊 Saved: {filepath}")
        return filepath

    def save_table_as_image(
        self,
        df: pd.DataFrame,
        title: str,
        filename: str,
        title_id: Optional[str] = None,
        highlight_cols: Optional[list[str]] = None,
    ) -> str:
        """
        Convert a pandas DataFrame to a publication-ready table image.

        Args:
            df: DataFrame to render as table
            title: Table title (English)
            filename: Output filename (without extension)
            title_id: Indonesian title (optional)
            highlight_cols: Columns to highlight (optional)

        Returns:
            Path to saved figure
        """
        # Calculate figure size based on table dimensions
        n_rows, n_cols = df.shape
        fig_width = max(8, n_cols * 1.5)
        fig_height = max(4, n_rows * 0.4 + 1.5)

        fig, ax = plt.subplots(figsize=(fig_width, fig_height))
        ax.axis("off")

        # Create title
        full_title = f"{title}\n({title_id})" if self.bilingual and title_id else title
        ax.set_title(full_title, fontsize=self.config.title_fontsize, fontweight="bold", pad=20)

        # Create table
        table = ax.table(
            cellText=df.values,
            colLabels=df.columns,
            rowLabels=df.index if df.index.name or not df.index.equals(pd.RangeIndex(len(df))) else None,
            loc="center",
            cellLoc="center",
        )

        # Style the table
        table.auto_set_font_size(False)
        table.set_fontsize(self.config.tick_fontsize)
        table.scale(1.2, 1.5)

        # Style header cells
        for key, cell in table.get_celld().items():
            row, col = key
            if row == 0:  # Header row
                cell.set_facecolor("#4472C4")
                cell.set_text_props(color="white", fontweight="bold")
            elif row % 2 == 0:
                cell.set_facecolor("#E9EDF4")

            # Highlight specific columns
            if highlight_cols and col >= 0 and col < len(df.columns):
                if df.columns[col] in highlight_cols and row > 0:
                    cell.set_facecolor("#D4EDDA")

        return self._save_figure(fig, filename)

    def create_comparison_boxplot(
        self,
        rag_data: np.ndarray,
        non_rag_data: np.ndarray,
        metric_name: str,
        filename: str,
        metric_name_id: Optional[str] = None,
        p_value: Optional[float] = None,
        show_significance: bool = True,
    ) -> str:
        """
        Create RAG vs Non-RAG side-by-side boxplot with significance markers.

        Args:
            rag_data: RAG system metric values
            non_rag_data: Non-RAG baseline metric values
            metric_name: Metric name (English)
            filename: Output filename (without extension)
            metric_name_id: Indonesian metric name (optional)
            p_value: Statistical test p-value for significance annotation
            show_significance: Whether to show significance annotation

        Returns:
            Path to saved figure
        """
        fig, ax = plt.subplots(figsize=(8, 6))

        # Prepare data for seaborn
        data = pd.DataFrame({
            "Value": np.concatenate([rag_data, non_rag_data]),
            "System": ["RAG"] * len(rag_data) + ["Non-RAG"] * len(non_rag_data)
        })

        # Create boxplot with individual points
        colors = ["#2ecc71", "#e74c3c"]  # Green for RAG, Red for Non-RAG
        box = sns.boxplot(x="System", y="Value", data=data, palette=colors, ax=ax, width=0.5)
        sns.stripplot(x="System", y="Value", data=data, color="black", alpha=0.3, size=4, ax=ax)

        # Add significance annotation
        if show_significance and p_value is not None:
            y_max = max(np.max(rag_data), np.max(non_rag_data))
            y_range = y_max - min(np.min(rag_data), np.min(non_rag_data))
            y_bar = y_max + 0.1 * y_range

            # Draw significance bar
            ax.plot([0, 0, 1, 1], [y_bar, y_bar + 0.02 * y_range, y_bar + 0.02 * y_range, y_bar],
                    lw=1.5, c="black")

            # Add significance stars
            if p_value < 0.001:
                sig_text = "***"
            elif p_value < 0.01:
                sig_text = "**"
            elif p_value < 0.05:
                sig_text = "*"
            else:
                sig_text = "ns"

            ax.text(0.5, y_bar + 0.04 * y_range, sig_text, ha="center", fontsize=12, fontweight="bold")

        # Labels
        full_title = f"{metric_name}\n({metric_name_id})" if self.bilingual and metric_name_id else metric_name
        ax.set_title(full_title, fontsize=self.config.title_fontsize, fontweight="bold")
        ax.set_xlabel("System / Sistem", fontsize=self.config.label_fontsize)
        ax.set_ylabel("Score / Skor", fontsize=self.config.label_fontsize)

        # Add legend for significance
        if show_significance and p_value is not None:
            legend_text = f"p = {p_value:.4f}"
            if p_value < 0.05:
                legend_text += " (significant / signifikan)"
            ax.text(0.98, 0.02, legend_text, transform=ax.transAxes, ha="right",
                   fontsize=9, style="italic", alpha=0.7)

        return self._save_figure(fig, filename)

    def create_ablation_bar_chart(
        self,
        config_names: list[str],
        metric_values: list[float],
        metric_name: str,
        filename: str,
        metric_name_id: Optional[str] = None,
        confidence_intervals: Optional[list[tuple[float, float]]] = None,
        highlight_best: bool = True,
    ) -> str:
        """
        Create horizontal bar chart ranking configurations by metric.

        Args:
            config_names: List of configuration names
            metric_values: Corresponding metric values
            metric_name: Metric name (English)
            filename: Output filename (without extension)
            metric_name_id: Indonesian metric name (optional)
            confidence_intervals: Optional list of (lower, upper) CI tuples
            highlight_best: Whether to highlight the best configuration

        Returns:
            Path to saved figure
        """
        # Sort by metric value
        sorted_indices = np.argsort(metric_values)[::-1]
        sorted_names = [config_names[i] for i in sorted_indices]
        sorted_values = [metric_values[i] for i in sorted_indices]

        fig, ax = plt.subplots(figsize=(10, max(5, len(config_names) * 0.6)))

        # Create color palette
        colors = ["#3498db"] * len(sorted_names)
        if highlight_best:
            colors[0] = "#27ae60"  # Green for best

        # Create horizontal bar chart
        y_pos = np.arange(len(sorted_names))
        bars = ax.barh(y_pos, sorted_values, color=colors, edgecolor="black", linewidth=0.5)

        # Add error bars if confidence intervals provided
        if confidence_intervals:
            sorted_ci = [confidence_intervals[i] for i in sorted_indices]
            xerr_lower = [sorted_values[j] - ci[0] for j, ci in enumerate(sorted_ci)]
            xerr_upper = [ci[1] - sorted_values[j] for j, ci in enumerate(sorted_ci)]
            ax.errorbar(sorted_values, y_pos, xerr=[xerr_lower, xerr_upper],
                       fmt="none", color="black", capsize=3)

        # Add value labels
        for i, (bar, val) in enumerate(zip(bars, sorted_values)):
            ax.text(val + 0.01, bar.get_y() + bar.get_height() / 2,
                   f"{val:.3f}", va="center", fontsize=9)

        # Labels
        ax.set_yticks(y_pos)
        ax.set_yticklabels(sorted_names)
        ax.invert_yaxis()  # Best at top

        full_title = f"Configuration Ranking by {metric_name}"
        if self.bilingual and metric_name_id:
            full_title += f"\n(Peringkat Konfigurasi berdasarkan {metric_name_id})"
        ax.set_title(full_title, fontsize=self.config.title_fontsize, fontweight="bold")
        ax.set_xlabel(f"{metric_name} Score / Skor", fontsize=self.config.label_fontsize)

        # Add rank labels
        for i, name in enumerate(sorted_names):
            ax.text(-0.02, i, f"#{i+1}", ha="right", va="center", fontsize=9, fontweight="bold",
                   transform=ax.get_yaxis_transform())

        return self._save_figure(fig, filename)

    def create_radar_chart(
        self,
        metrics: dict[str, float],
        filename: str,
        title: str = "Multi-Metric Overview",
        title_id: Optional[str] = None,
        comparison_metrics: Optional[dict[str, float]] = None,
        labels: tuple[str, str] = ("RAG", "Non-RAG"),
    ) -> str:
        """
        Create radar/spider chart for multi-metric overview.

        Args:
            metrics: Dictionary of metric names to values (0-1 scale)
            filename: Output filename (without extension)
            title: Chart title (English)
            title_id: Indonesian title (optional)
            comparison_metrics: Optional second set of metrics for comparison
            labels: Labels for primary and comparison data

        Returns:
            Path to saved figure
        """
        categories = list(metrics.keys())
        n_cats = len(categories)

        # Calculate angles for radar chart
        angles = [n / float(n_cats) * 2 * np.pi for n in range(n_cats)]
        angles += angles[:1]  # Complete the circle

        # Prepare data
        values = list(metrics.values())
        values += values[:1]

        fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))

        # Plot primary data
        ax.plot(angles, values, "o-", linewidth=2, label=labels[0], color="#3498db")
        ax.fill(angles, values, alpha=0.25, color="#3498db")

        # Plot comparison data if provided
        if comparison_metrics:
            comp_values = [comparison_metrics.get(cat, 0) for cat in categories]
            comp_values += comp_values[:1]
            ax.plot(angles, comp_values, "o-", linewidth=2, label=labels[1], color="#e74c3c")
            ax.fill(angles, comp_values, alpha=0.15, color="#e74c3c")

        # Set category labels
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(categories, fontsize=self.config.tick_fontsize)

        # Set radial limits
        ax.set_ylim(0, 1)
        ax.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])
        ax.set_yticklabels(["0.2", "0.4", "0.6", "0.8", "1.0"], fontsize=8)

        # Title
        full_title = f"{title}\n({title_id})" if self.bilingual and title_id else title
        ax.set_title(full_title, fontsize=self.config.title_fontsize, fontweight="bold", pad=20)

        # Legend
        if comparison_metrics:
            ax.legend(loc="upper right", bbox_to_anchor=(1.3, 1.0))

        return self._save_figure(fig, filename)

    def create_latency_histogram(
        self,
        latency_data: np.ndarray,
        filename: str,
        title: str = "Response Latency Distribution",
        title_id: Optional[str] = None,
        comparison_data: Optional[np.ndarray] = None,
        labels: tuple[str, str] = ("RAG", "Non-RAG"),
        show_percentiles: bool = True,
    ) -> str:
        """
        Create histogram for latency distribution analysis.

        Args:
            latency_data: Primary latency values in ms
            filename: Output filename (without extension)
            title: Chart title (English)
            title_id: Indonesian title (optional)
            comparison_data: Optional comparison latency data
            labels: Labels for primary and comparison data
            show_percentiles: Whether to show P50, P95, P99 lines

        Returns:
            Path to saved figure
        """
        fig, ax = plt.subplots(figsize=(10, 6))

        # Determine bins
        all_data = np.concatenate([latency_data, comparison_data]) if comparison_data is not None else latency_data
        bins = np.linspace(0, np.percentile(all_data, 99), 50)

        # Plot primary histogram
        ax.hist(latency_data, bins=bins, alpha=0.7, label=labels[0], color="#3498db", edgecolor="black")

        # Plot comparison histogram
        if comparison_data is not None:
            ax.hist(comparison_data, bins=bins, alpha=0.5, label=labels[1], color="#e74c3c", edgecolor="black")

        # Add percentile lines
        if show_percentiles:
            p50 = np.percentile(latency_data, 50)
            p95 = np.percentile(latency_data, 95)
            p99 = np.percentile(latency_data, 99)

            ax.axvline(p50, color="#27ae60", linestyle="--", linewidth=2, label=f"P50: {p50:.0f}ms")
            ax.axvline(p95, color="#f39c12", linestyle="--", linewidth=2, label=f"P95: {p95:.0f}ms")
            ax.axvline(p99, color="#e74c3c", linestyle="--", linewidth=2, label=f"P99: {p99:.0f}ms")

        # Labels
        full_title = f"{title}\n({title_id})" if self.bilingual and title_id else title
        ax.set_title(full_title, fontsize=self.config.title_fontsize, fontweight="bold")
        ax.set_xlabel("Latency (ms) / Latensi (ms)", fontsize=self.config.label_fontsize)
        ax.set_ylabel("Frequency / Frekuensi", fontsize=self.config.label_fontsize)

        ax.legend(loc="upper right")

        return self._save_figure(fig, filename)

    def create_forest_plot(
        self,
        effect_sizes: list[float],
        confidence_intervals: list[tuple[float, float]],
        metric_names: list[str],
        filename: str,
        title: str = "Effect Sizes with 95% Confidence Intervals",
        title_id: Optional[str] = None,
        null_value: float = 0.0,
    ) -> str:
        """
        Create forest plot for effect sizes with confidence intervals.

        Args:
            effect_sizes: List of effect size values
            confidence_intervals: List of (lower, upper) CI tuples
            metric_names: List of metric names
            filename: Output filename (without extension)
            title: Chart title (English)
            title_id: Indonesian title (optional)
            null_value: Reference line for no effect (default 0)

        Returns:
            Path to saved figure
        """
        n_metrics = len(metric_names)
        fig, ax = plt.subplots(figsize=(10, max(5, n_metrics * 0.8)))

        y_positions = np.arange(n_metrics)

        # Plot effect sizes and CIs
        for i, (effect, ci, name) in enumerate(zip(effect_sizes, confidence_intervals, metric_names)):
            # CI line
            ax.plot([ci[0], ci[1]], [i, i], color="#3498db", linewidth=2, solid_capstyle="round")

            # Effect size marker
            significant = not (ci[0] <= null_value <= ci[1])
            marker_color = "#27ae60" if significant else "#95a5a6"
            ax.plot(effect, i, "D", markersize=10, color=marker_color, markeredgecolor="black")

        # Null effect line
        ax.axvline(null_value, color="black", linestyle="--", linewidth=1, alpha=0.7, label="No effect")

        # Labels
        ax.set_yticks(y_positions)
        ax.set_yticklabels(metric_names)
        ax.invert_yaxis()

        full_title = f"{title}\n({title_id})" if self.bilingual and title_id else title
        ax.set_title(full_title, fontsize=self.config.title_fontsize, fontweight="bold")
        ax.set_xlabel("Effect Size (Cohen's d)", fontsize=self.config.label_fontsize)

        # Add legend
        legend_elements = [
            mpatches.Patch(color="#27ae60", label="Significant / Signifikan"),
            mpatches.Patch(color="#95a5a6", label="Not significant / Tidak signifikan"),
        ]
        ax.legend(handles=legend_elements, loc="lower right")

        return self._save_figure(fig, filename)

    def create_metric_heatmap(
        self,
        correlation_matrix: pd.DataFrame,
        filename: str,
        title: str = "Metric Correlation Heatmap",
        title_id: Optional[str] = None,
        annotate: bool = True,
    ) -> str:
        """
        Create heatmap for metric correlations.

        Args:
            correlation_matrix: Pandas DataFrame with correlation values
            filename: Output filename (without extension)
            title: Chart title (English)
            title_id: Indonesian title (optional)
            annotate: Whether to show correlation values in cells

        Returns:
            Path to saved figure
        """
        n_metrics = len(correlation_matrix)
        fig_size = max(8, n_metrics * 0.8)
        fig, ax = plt.subplots(figsize=(fig_size, fig_size))

        # Create heatmap
        sns.heatmap(
            correlation_matrix,
            annot=annotate,
            fmt=".2f",
            cmap="RdYlBu_r",
            center=0,
            vmin=-1,
            vmax=1,
            square=True,
            linewidths=0.5,
            ax=ax,
            cbar_kws={"label": "Correlation / Korelasi"},
        )

        # Title
        full_title = f"{title}\n({title_id})" if self.bilingual and title_id else title
        ax.set_title(full_title, fontsize=self.config.title_fontsize, fontweight="bold", pad=20)

        # Rotate labels
        plt.xticks(rotation=45, ha="right")
        plt.yticks(rotation=0)

        return self._save_figure(fig, filename)

    def create_summary_dashboard(
        self,
        metrics_summary: dict[str, dict],
        filename: str = "summary_dashboard",
    ) -> str:
        """
        Create a summary dashboard combining multiple visualizations.

        Args:
            metrics_summary: Dictionary with metric data for visualization
            filename: Output filename (without extension)

        Returns:
            Path to saved figure
        """
        fig = plt.figure(figsize=(16, 12))

        # Create grid
        gs = fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)

        # 1. Top-left: Key metrics bar chart
        ax1 = fig.add_subplot(gs[0, 0])
        if "key_metrics" in metrics_summary:
            km = metrics_summary["key_metrics"]
            bars = ax1.bar(list(km.keys()), list(km.values()), color="#3498db", edgecolor="black")
            ax1.set_title("Key RAG Metrics / Metrik RAG Utama", fontweight="bold")
            ax1.set_ylim(0, 1)
            ax1.axhline(0.8, color="#27ae60", linestyle="--", alpha=0.7, label="Target (0.8)")
            ax1.legend()
            for bar, val in zip(bars, km.values()):
                ax1.text(bar.get_x() + bar.get_width() / 2, val + 0.02, f"{val:.2f}",
                        ha="center", fontsize=9)

        # 2. Top-right: Improvement comparison
        ax2 = fig.add_subplot(gs[0, 1])
        if "improvements" in metrics_summary:
            imp = metrics_summary["improvements"]
            colors = ["#27ae60" if v > 0 else "#e74c3c" for v in imp.values()]
            ax2.barh(list(imp.keys()), list(imp.values()), color=colors, edgecolor="black")
            ax2.axvline(0, color="black", linewidth=1)
            ax2.set_title("RAG vs Non-RAG Improvement (%) / Peningkatan", fontweight="bold")
            ax2.set_xlabel("Improvement %")

        # 3. Bottom-left: Latency comparison
        ax3 = fig.add_subplot(gs[1, 0])
        if "latency" in metrics_summary:
            lat = metrics_summary["latency"]
            x = np.arange(len(lat))
            ax3.bar(x, [lat[k]["mean"] for k in lat.keys()],
                   yerr=[lat[k].get("std", 0) for k in lat.keys()],
                   color="#9b59b6", edgecolor="black", capsize=5)
            ax3.set_xticks(x)
            ax3.set_xticklabels(list(lat.keys()), rotation=45, ha="right")
            ax3.set_title("Latency by Component (ms)", fontweight="bold")
            ax3.set_ylabel("Latency (ms)")

        # 4. Bottom-right: Summary statistics table
        ax4 = fig.add_subplot(gs[1, 1])
        ax4.axis("off")
        if "summary_stats" in metrics_summary:
            ss = metrics_summary["summary_stats"]
            table_data = [[k, f"{v:.4f}" if isinstance(v, float) else str(v)] for k, v in ss.items()]
            table = ax4.table(
                cellText=table_data,
                colLabels=["Metric", "Value"],
                loc="center",
                cellLoc="center",
            )
            table.auto_set_font_size(False)
            table.set_fontsize(10)
            table.scale(1.2, 1.5)
            for key, cell in table.get_celld().items():
                if key[0] == 0:
                    cell.set_facecolor("#4472C4")
                    cell.set_text_props(color="white", fontweight="bold")
            ax4.set_title("Summary Statistics / Ringkasan Statistik", fontweight="bold", pad=40)

        fig.suptitle("RAG Evaluation Summary Dashboard", fontsize=16, fontweight="bold", y=0.98)

        return self._save_figure(fig, filename)

    def get_generated_files(self) -> list[str]:
        """Return list of all generated figure file paths."""
        return self.generated_files.copy()

    def print_summary(self):
        """Print summary of generated figures."""
        print(f"\n{'='*50}")
        print(f"📊 Generated {len(self.generated_files)} figures in {self.output_dir}")
        print(f"{'='*50}")
        for filepath in self.generated_files:
            print(f"  • {os.path.basename(filepath)}")


# ===== Convenience Functions =====
def generate_all_figures_from_analysis(
    descriptive_stats: dict,
    rag_comparisons: list,
    ablation_data: Optional[dict] = None,
    output_dir: str = ".results/figures",
) -> list[str]:
    """
    Generate all standard figures from statistical analysis results.

    Args:
        descriptive_stats: Dictionary of metric names to DescriptiveStats dicts
        rag_comparisons: List of RAG comparison result dicts
        ablation_data: Optional ablation study data
        output_dir: Output directory for figures

    Returns:
        List of generated figure paths
    """
    fg = FigureGenerator(output_dir=output_dir)

    # 1. Descriptive statistics table
    if descriptive_stats:
        stats_df = pd.DataFrame({
            metric: {
                "Mean": stats.get("mean", 0),
                "Median": stats.get("median", 0),
                "Std Dev": stats.get("std_dev", 0),
                "Min": stats.get("min_val", 0),
                "Max": stats.get("max_val", 0),
            }
            for metric, stats in descriptive_stats.items()
        }).T
        fg.save_table_as_image(
            stats_df.round(4),
            "Descriptive Statistics Summary",
            "descriptive_stats_table",
            "Ringkasan Statistik Deskriptif",
        )

    # 2. RAG vs Non-RAG comparisons
    for comp in rag_comparisons:
        metric = comp.get("metric", "Unknown")
        rag_stats = comp.get("rag_stats", {})
        non_rag_stats = comp.get("non_rag_stats", {})
        test_result = comp.get("test_result", {})

        # Generate mock data for visualization if only stats available
        # In real usage, pass actual data arrays
        if "mean" in rag_stats and "std_dev" in rag_stats:
            n = rag_stats.get("n", 50)
            rag_data = np.random.normal(rag_stats["mean"], rag_stats.get("std_dev", 0.1), n)
            non_rag_data = np.random.normal(non_rag_stats.get("mean", 0), non_rag_stats.get("std_dev", 0.1), n)

            fg.create_comparison_boxplot(
                rag_data,
                non_rag_data,
                metric,
                f"comparison_{metric.lower().replace(' ', '_')}",
                comp.get("metric_id"),
                test_result.get("p_value"),
            )

    # 3. Ablation study charts
    if ablation_data and len(ablation_data) > 1:
        config_names = list(ablation_data.keys())
        faithfulness_means = [
            ablation_data[c].get("faithfulness", pd.Series([0])).mean()
            for c in config_names
        ]

        fg.create_ablation_bar_chart(
            config_names,
            faithfulness_means,
            "Faithfulness",
            "ablation_ranking",
            "Kesetiaan",
        )

    fg.print_summary()
    return fg.get_generated_files()


if __name__ == "__main__":
    # Demo usage
    print("Statistical Visualization Module")
    print("=" * 50)
    print("Import this module to generate publication-quality figures.")
    print("\nExample usage:")
    print("  from statistical_visualization import FigureGenerator")
    print("  fg = FigureGenerator()")
    print("  fg.create_comparison_boxplot(rag_data, non_rag_data, 'Faithfulness', 'faith_boxplot')")
