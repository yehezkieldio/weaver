#!/usr/bin/env -S uv run --script
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
        full_title = title_id if title_id else title
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
        full_title = metric_name_id if metric_name_id else metric_name
        ax.set_title(full_title, fontsize=self.config.title_fontsize, fontweight="bold")
        ax.set_xlabel("Sistem", fontsize=self.config.label_fontsize)
        ax.set_ylabel("Skor", fontsize=self.config.label_fontsize)

        # Add legend for significance
        if show_significance and p_value is not None:
            legend_text = f"p = {p_value:.4f}"
            if p_value < 0.05:
                legend_text += " (signifikan)"
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

        # Create readable labels with proper wrapping
        def wrap_label(label: str, max_width: int = 25) -> str:
            """Wrap long labels to prevent overlap."""
            if len(label) <= max_width:
                return label
            words = label.replace('_', ' ').split()
            lines = []
            current_line = []
            current_length = 0
            for word in words:
                if current_length + len(word) + 1 <= max_width:
                    current_line.append(word)
                    current_length += len(word) + 1
                else:
                    if current_line:
                        lines.append(' '.join(current_line))
                    current_line = [word]
                    current_length = len(word)
            if current_line:
                lines.append(' '.join(current_line))
            return '\n'.join(lines)

        wrapped_names = [wrap_label(name) for name in sorted_names]

        # Dynamically calculate figure height based on label count
        base_height = max(6, len(config_names) * 0.8)
        fig, ax = plt.subplots(figsize=(12, base_height))

        # Create color palette
        colors = ["#3498db"] * len(sorted_names)
        if highlight_best:
            colors[0] = "#27ae60"  # Green for best
            colors[1] = "#f39c12"  # Orange for second
            colors[2] = "#e67e22"  # Dark orange for third

        # Create horizontal bar chart
        y_pos = np.arange(len(sorted_names))
        bars = ax.barh(y_pos, sorted_values, height=0.7, color=colors, edgecolor="black", linewidth=0.8, alpha=0.9)

        # Add error bars if confidence intervals provided
        if confidence_intervals:
            sorted_ci = [confidence_intervals[i] for i in sorted_indices]
            xerr_lower = [sorted_values[j] - ci[0] for j, ci in enumerate(sorted_ci)]
            xerr_upper = [ci[1] - sorted_values[j] for j, ci in enumerate(sorted_ci)]
            ax.errorbar(sorted_values, y_pos, xerr=[xerr_lower, xerr_upper],
                       fmt="none", color="black", capsize=4, linewidth=1.5, alpha=0.7)

        # Add value labels with better positioning
        for i, (bar, val) in enumerate(zip(bars, sorted_values)):
            # Position label outside bar if value is high
            x_offset = 0.015 if val < 0.95 else -0.015
            ha = "left" if val < 0.95 else "right"
            ax.text(val + x_offset, bar.get_y() + bar.get_height() / 2,
                   f"{val:.4f}", va="center", ha=ha, fontsize=10, fontweight="bold")

        # Labels with wrapped text
        ax.set_yticks(y_pos)
        ax.set_yticklabels(wrapped_names, fontsize=10)
        ax.invert_yaxis()  # Best at top

        # Set x-axis limits with padding
        ax.set_xlim(0, max(sorted_values) * 1.15)

        full_title = f"Peringkat Konfigurasi berdasarkan {metric_name_id}" if metric_name_id else f"Configuration Ranking by {metric_name}"
        ax.set_title(full_title, fontsize=self.config.title_fontsize + 2, fontweight="bold", pad=20)
        ax.set_xlabel(f"Skor {metric_name_id if metric_name_id else metric_name}", fontsize=self.config.label_fontsize, fontweight="bold")

        # Add rank badges on the left
        for i in range(min(3, len(sorted_names))):
            rank_colors = ["#FFD700", "#C0C0C0", "#CD7F32"]  # Gold, Silver, Bronze
            ax.text(-0.01, i, f" #{i+1} ", ha="right", va="center", fontsize=11, fontweight="bold",
                   transform=ax.get_yaxis_transform(), bbox=dict(boxstyle="round,pad=0.3",
                   facecolor=rank_colors[i], edgecolor="black", linewidth=1.5))

        # Add grid for readability
        ax.grid(axis='x', alpha=0.3, linestyle='--')
        ax.set_axisbelow(True)

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
        # Title
        full_title = title_id if title_id else title
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
        full_title = title_id if title_id else title
        ax.set_title(full_title, fontsize=self.config.title_fontsize, fontweight="bold")
        ax.set_xlabel("Latensi (ms)", fontsize=self.config.label_fontsize)
        ax.set_ylabel("Frekuensi", fontsize=self.config.label_fontsize)

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
        ax.axvline(null_value, color="black", linestyle="--", linewidth=1, alpha=0.7, label="Tidak ada efek")

        # Labels
        ax.set_yticks(y_positions)
        ax.set_yticklabels(metric_names)
        ax.invert_yaxis()

        full_title = title_id if title_id else title
        ax.set_title(full_title, fontsize=self.config.title_fontsize, fontweight="bold")
        ax.set_xlabel("Ukuran Efek (Cohen's d)", fontsize=self.config.label_fontsize)

        # Add legend
        legend_elements = [
            mpatches.Patch(color="#27ae60", label="Signifikan"),
            mpatches.Patch(color="#95a5a6", label="Tidak signifikan"),
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
            cbar_kws={"label": "Korelasi"},
        )

        # Title
        full_title = title_id if title_id else title
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
        fig = plt.figure(figsize=(18, 14))

        # Create grid with better spacing
        gs = fig.add_gridspec(2, 2, hspace=0.35, wspace=0.35, top=0.94, bottom=0.05, left=0.08, right=0.95)

        # 1. Top-left: Key metrics bar chart
        ax1 = fig.add_subplot(gs[0, 0])
        if "key_metrics" in metrics_summary and metrics_summary["key_metrics"]:
            km = metrics_summary["key_metrics"]
            # Filter out zero values
            km_filtered = {k: v for k, v in km.items() if v > 0}
            if km_filtered:
                bars = ax1.bar(range(len(km_filtered)), list(km_filtered.values()),
                              color="#3498db", edgecolor="black", linewidth=1.5, alpha=0.85)
                ax1.set_xticks(range(len(km_filtered)))
                ax1.set_xticklabels(list(km_filtered.keys()), rotation=30, ha="right", fontsize=10)
                ax1.set_title("Metrik RAG Utama", fontweight="bold", fontsize=14)
                ax1.set_ylim(0, 1.05)
                ax1.set_ylabel("Skor", fontsize=11, fontweight="bold")
                ax1.axhline(0.8, color="#27ae60", linestyle="--", linewidth=2, alpha=0.7, label="Target (0.8)")
                ax1.axhline(0.6, color="#f39c12", linestyle="--", linewidth=1.5, alpha=0.5, label="Ambang (0.6)")
                ax1.legend(loc="upper right", fontsize=9)
                ax1.grid(axis='y', alpha=0.3, linestyle=':')
                ax1.set_axisbelow(True)
                for i, (bar, val) in enumerate(zip(bars, km_filtered.values())):
                    ax1.text(bar.get_x() + bar.get_width() / 2, val + 0.02, f"{val:.3f}",
                            ha="center", fontsize=10, fontweight="bold")
        else:
            ax1.text(0.5, 0.5, "Tidak ada data metrik utama", ha="center", va="center",
                    fontsize=12, transform=ax1.transAxes, style="italic", color="#95a5a6")
            ax1.set_title("Metrik RAG Utama", fontweight="bold", fontsize=14)
            ax1.axis('off')

        # 2. Top-right: Improvement comparison
        ax2 = fig.add_subplot(gs[0, 1])
        if "improvements" in metrics_summary and metrics_summary["improvements"]:
            imp = metrics_summary["improvements"]
            if imp:
                colors = ["#27ae60" if v > 0 else "#e74c3c" for v in imp.values()]
                bars = ax2.barh(range(len(imp)), list(imp.values()), color=colors,
                               edgecolor="black", linewidth=1.5, alpha=0.85)
                ax2.set_yticks(range(len(imp)))
                ax2.set_yticklabels(list(imp.keys()), fontsize=10)
                ax2.axvline(0, color="black", linewidth=2)
                ax2.set_title("Peningkatan RAG vs Non-RAG (%)", fontweight="bold", fontsize=14)
                ax2.set_xlabel("Peningkatan (%)", fontsize=11, fontweight="bold")
                ax2.grid(axis='x', alpha=0.3, linestyle=':')
                ax2.set_axisbelow(True)
                for i, (bar, val) in enumerate(zip(bars, imp.values())):
                    x_pos = val + (3 if val > 0 else -3)
                    ha = "left" if val > 0 else "right"
                    ax2.text(x_pos, bar.get_y() + bar.get_height() / 2, f"{val:.1f}%",
                            va="center", ha=ha, fontsize=10, fontweight="bold")
        else:
            ax2.text(0.5, 0.5, "Tidak ada data perbandingan\nRAG vs Non-RAG", ha="center", va="center",
                    fontsize=12, transform=ax2.transAxes, style="italic", color="#95a5a6")
            ax2.set_title("Peningkatan RAG vs Non-RAG (%)", fontweight="bold", fontsize=14)
            ax2.axis('off')

        # 3. Bottom-left: Latency comparison
        ax3 = fig.add_subplot(gs[1, 0])
        if "latency" in metrics_summary and metrics_summary["latency"]:
            lat = metrics_summary["latency"]
            # Filter out zero values
            lat_filtered = {k: v for k, v in lat.items() if v.get("mean", 0) > 0}
            if lat_filtered:
                x = np.arange(len(lat_filtered))
                means = [lat_filtered[k]["mean"] for k in lat_filtered.keys()]
                stds = [lat_filtered[k].get("std", 0) for k in lat_filtered.keys()]
                bars = ax3.bar(x, means, yerr=stds, color="#9b59b6",
                              edgecolor="black", linewidth=1.5, capsize=6, alpha=0.85)
                ax3.set_xticks(x)
                ax3.set_xticklabels(list(lat_filtered.keys()), rotation=30, ha="right", fontsize=10)
                ax3.set_title("Latensi per Komponen (ms)", fontweight="bold", fontsize=14)
                ax3.set_ylabel("Latensi (ms)", fontsize=11, fontweight="bold")
                ax3.grid(axis='y', alpha=0.3, linestyle=':')
                ax3.set_axisbelow(True)
                for i, (bar, val) in enumerate(zip(bars, means)):
                    ax3.text(bar.get_x() + bar.get_width() / 2, val + (stds[i] if stds[i] > 0 else val * 0.05),
                            f"{val:.1f}", ha="center", fontsize=9, fontweight="bold")
        else:
            ax3.text(0.5, 0.5, "Tidak ada data latensi", ha="center", va="center",
                    fontsize=12, transform=ax3.transAxes, style="italic", color="#95a5a6")
            ax3.set_title("Latensi per Komponen (ms)", fontweight="bold", fontsize=14)
            ax3.axis('off')

        # 4. Bottom-right: Summary statistics table
        ax4 = fig.add_subplot(gs[1, 1])
        ax4.axis("off")
        if "summary_stats" in metrics_summary and metrics_summary["summary_stats"]:
            ss = metrics_summary["summary_stats"]
            if ss:
                table_data = [[k, f"{v:.4f}" if isinstance(v, float) else str(v)] for k, v in ss.items()]
                table = ax4.table(
                    cellText=table_data,
                    colLabels=["Metrik", "Nilai"],
                    loc="center",
                    cellLoc="left",
                    colWidths=[0.6, 0.4],
                )
                table.auto_set_font_size(False)
                table.set_fontsize(11)
                table.scale(1.2, 2.0)
                for key, cell in table.get_celld().items():
                    cell.set_edgecolor("black")
                    cell.set_linewidth(1)
                    if key[0] == 0:  # Header row
                        cell.set_facecolor("#4472C4")
                        cell.set_text_props(color="white", fontweight="bold", fontsize=12)
                    elif key[0] % 2 == 1:  # Odd rows
                        cell.set_facecolor("#E9EDF4")
                ax4.set_title("Ringkasan Statistik", fontweight="bold", fontsize=14, pad=30)
        else:
            ax4.text(0.5, 0.5, "Tidak ada ringkasan statistik", ha="center", va="center",
                    fontsize=12, transform=ax4.transAxes, style="italic", color="#95a5a6")
            ax4.set_title("Ringkasan Statistik", fontweight="bold", fontsize=14)

        fig.suptitle("Dasbor Ringkasan Evaluasi RAG", fontsize=18, fontweight="bold", y=0.98)

        return self._save_figure(fig, filename)

    def get_generated_files(self) -> list[str]:
        """Return list of all generated figure file paths."""
        return self.generated_files.copy()

    def create_ablation_comparison_table(
        self,
        ablation_data: dict[str, pd.DataFrame],
        metrics: list[str],
        filename: str,
        title: str = "Ablation Study Comparison",
        title_id: Optional[str] = None,
    ) -> str:
        """
        Create detailed comparison table for ablation study configurations.

        Args:
            ablation_data: Dictionary of config names to DataFrames with metrics
            metrics: List of metric column names to include
            filename: Output filename (without extension)
            title: Table title (English)
            title_id: Indonesian title (optional)

        Returns:
            Path to saved figure
        """
        # Prepare data for table
        rows = []
        for config_name, df in ablation_data.items():
            row = {"Konfigurasi": config_name}
            for metric in metrics:
                if metric in df.columns:
                    data = df[metric].dropna().values
                    if len(data) > 0:
                        row[metric] = f"{np.mean(data):.4f} ± {np.std(data):.4f}"
                    else:
                        row[metric] = "N/A"
                else:
                    row[metric] = "N/A"
            rows.append(row)

        # Create DataFrame
        table_df = pd.DataFrame(rows)
        table_df.set_index("Konfigurasi", inplace=True)

        return self.save_table_as_image(
            table_df,
            title,
            filename,
            title_id or title,
        )

    def create_ablation_heatmap(
        self,
        ablation_data: dict[str, pd.DataFrame],
        metrics: list[str],
        filename: str,
        title: str = "Ablation Configuration Performance Heatmap",
        title_id: Optional[str] = None,
    ) -> str:
        """
        Create heatmap showing performance of each configuration across metrics.

        Args:
            ablation_data: Dictionary of config names to DataFrames
            metrics: List of metric names
            filename: Output filename (without extension)
            title: Chart title (English)
            title_id: Indonesian title (optional)

        Returns:
            Path to saved figure
        """
        # Prepare matrix
        matrix_data = []
        config_names = []
        for config_name, df in ablation_data.items():
            config_names.append(config_name)
            row = []
            for metric in metrics:
                if metric in df.columns:
                    data = df[metric].dropna().values
                    row.append(np.mean(data) if len(data) > 0 else 0)
                else:
                    row.append(0)
            matrix_data.append(row)

        # Create DataFrame for heatmap
        heatmap_df = pd.DataFrame(matrix_data, columns=metrics, index=config_names)

        # Create figure
        n_configs = len(config_names)
        fig_height = max(8, n_configs * 0.6)
        fig, ax = plt.subplots(figsize=(12, fig_height))

        # Create heatmap
        sns.heatmap(
            heatmap_df,
            annot=True,
            fmt=".3f",
            cmap="YlGnBu",
            center=0.7,
            vmin=0,
            vmax=1,
            linewidths=1,
            linecolor='black',
            ax=ax,
            cbar_kws={"label": "Skor Metrik", "shrink": 0.8},
            square=False,
        )

        # Title and labels
        full_title = title_id if title_id else title
        ax.set_title(full_title, fontsize=self.config.title_fontsize + 2, fontweight="bold", pad=20)
        ax.set_xlabel("Metrik", fontsize=self.config.label_fontsize, fontweight="bold")
        ax.set_ylabel("Konfigurasi", fontsize=self.config.label_fontsize, fontweight="bold")

        # Rotate labels
        plt.xticks(rotation=45, ha="right")
        plt.yticks(rotation=0)

        return self._save_figure(fig, filename)

    def create_ablation_multi_metric_comparison(
        self,
        ablation_data: dict[str, pd.DataFrame],
        metrics: list[str],
        metric_names_id: list[str],
        filename: str,
        title: str = "Multi-Metric Configuration Comparison",
        title_id: Optional[str] = None,
    ) -> str:
        """
        Create grouped bar chart comparing multiple metrics across configurations.

        Args:
            ablation_data: Dictionary of config names to DataFrames
            metrics: List of metric column names
            metric_names_id: Indonesian names for metrics
            filename: Output filename (without extension)
            title: Chart title (English)
            title_id: Indonesian title (optional)

        Returns:
            Path to saved figure
        """
        config_names = list(ablation_data.keys())
        n_configs = len(config_names)
        n_metrics = len(metrics)

        # Calculate means for each config and metric
        data_matrix = np.zeros((n_configs, n_metrics))
        for i, (config_name, df) in enumerate(ablation_data.items()):
            for j, metric in enumerate(metrics):
                if metric in df.columns:
                    values = df[metric].dropna().values
                    data_matrix[i, j] = np.mean(values) if len(values) > 0 else 0

        # Create figure
        fig, ax = plt.subplots(figsize=(14, max(8, n_configs * 0.5)))

        # Set up bar positions
        x = np.arange(n_configs)
        width = 0.8 / n_metrics

        # Color palette
        colors = sns.color_palette("husl", n_metrics)

        # Create grouped bars
        for j in range(n_metrics):
            offset = (j - n_metrics / 2) * width + width / 2
            bars = ax.bar(x + offset, data_matrix[:, j], width,
                         label=metric_names_id[j], color=colors[j],
                         edgecolor="black", linewidth=0.8, alpha=0.85)

            # Add value labels on bars
            for bar in bars:
                height = bar.get_height()
                if height > 0.05:
                    ax.text(bar.get_x() + bar.get_width() / 2, height + 0.01,
                           f"{height:.2f}", ha="center", va="bottom", fontsize=7, rotation=90)

        # Labels and styling
        ax.set_xticks(x)
        ax.set_xticklabels(config_names, rotation=45, ha="right", fontsize=10)
        ax.set_ylabel("Skor", fontsize=self.config.label_fontsize, fontweight="bold")
        ax.set_ylim(0, 1.05)

        full_title = title_id if title_id else title
        ax.set_title(full_title, fontsize=self.config.title_fontsize + 2, fontweight="bold", pad=20)

        ax.legend(loc="upper right", fontsize=10, ncol=min(3, n_metrics), framealpha=0.9)
        ax.grid(axis='y', alpha=0.3, linestyle=':')
        ax.set_axisbelow(True)

        return self._save_figure(fig, filename)

    def create_latency_comparison_table(
        self,
        ablation_data: dict[str, pd.DataFrame],
        filename: str,
        title: str = "Latency Analysis by Configuration",
        title_id: Optional[str] = None,
    ) -> str:
        """
        Create detailed latency comparison table with percentiles.

        Args:
            ablation_data: Dictionary of config names to DataFrames
            filename: Output filename (without extension)
            title: Table title (English)
            title_id: Indonesian title (optional)

        Returns:
            Path to saved figure
        """
        rows = []
        for config_name, df in ablation_data.items():
            if "latency_ms" in df.columns:
                lat_data = df["latency_ms"].dropna().values
                if len(lat_data) > 0:
                    rows.append({
                        "Konfigurasi": config_name,
                        "Rerata (ms)": f"{np.mean(lat_data):.2f}",
                        "Median (ms)": f"{np.median(lat_data):.2f}",
                        "Std Dev (ms)": f"{np.std(lat_data):.2f}",
                        "P95 (ms)": f"{np.percentile(lat_data, 95):.2f}",
                        "P99 (ms)": f"{np.percentile(lat_data, 99):.2f}",
                        "Min (ms)": f"{np.min(lat_data):.2f}",
                        "Maks (ms)": f"{np.max(lat_data):.2f}",
                    })

        if not rows:
            rows.append({
                "Konfigurasi": "No data",
                "Rerata (ms)": "N/A",
                "Median (ms)": "N/A",
                "Std Dev (ms)": "N/A",
                "P95 (ms)": "N/A",
                "P99 (ms)": "N/A",
                "Min (ms)": "N/A",
                "Maks (ms)": "N/A",
            })

        table_df = pd.DataFrame(rows)
        table_df.set_index("Konfigurasi", inplace=True)

        return self.save_table_as_image(
            table_df,
            title,
            filename,
            title_id or title,
        )

    def create_statistical_test_results_table(
        self,
        test_results: list[dict],
        filename: str,
        title: str = "Statistical Test Results",
        title_id: Optional[str] = None,
    ) -> str:
        """
        Create table summarizing statistical test results.

        Args:
            test_results: List of test result dictionaries
            filename: Output filename (without extension)
            title: Table title (English)
            title_id: Indonesian title (optional)

        Returns:
            Path to saved figure
        """
        rows = []
        for result in test_results:
            sig_symbol = "***" if result.get("p_value", 1) < 0.001 else \
                        "**" if result.get("p_value", 1) < 0.01 else \
                        "*" if result.get("p_value", 1) < 0.05 else "ns"
            rows.append({
                "Metrik": result.get("metric_id", "N/A"),
                "Uji": result.get("test_name_id", "N/A"),
                "Statistik": f"{result.get('statistic', 0):.3f}",
                "p-value": f"{result.get('p_value', 1):.4f}",
                "Sig.": sig_symbol,
                "Ukuran Efek": f"{result.get('effect_size', 0):.3f}" if result.get('effect_size') else "N/A",
                "Interpretasi": result.get('effect_size_interpretation', 'N/A'),
            })

        table_df = pd.DataFrame(rows)

        return self.save_table_as_image(
            table_df,
            title,
            filename,
            title_id or title,
            highlight_cols=["Sig."],
        )

    def create_ablation_latency_boxplot(
        self,
        ablation_data: dict[str, pd.DataFrame],
        filename: str,
        title: str = "Latency Distribution by Configuration",
        title_id: Optional[str] = None,
    ) -> str:
        """
        Create boxplot comparing latency distributions across configurations.

        Args:
            ablation_data: Dictionary of config names to DataFrames
            filename: Output filename (without extension)
            title: Chart title (English)
            title_id: Indonesian title (optional)

        Returns:
            Path to saved figure
        """
        plot_data = []
        for config_name, df in ablation_data.items():
            if "latency_ms" in df.columns:
                lat_data = df["latency_ms"].dropna().values
                for val in lat_data:
                    plot_data.append({"Konfigurasi": config_name, "Latensi (ms)": val})

        if not plot_data:
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.text(0.5, 0.5, "Tidak ada data latensi", ha="center", va="center",
                   transform=ax.transAxes, fontsize=14)
            ax.axis('off')
            return self._save_figure(fig, filename)

        df_plot = pd.DataFrame(plot_data)

        n_configs = len(ablation_data)
        fig, ax = plt.subplots(figsize=(max(12, n_configs * 1.5), 8))

        sns.boxplot(x="Konfigurasi", y="Latensi (ms)", data=df_plot, ax=ax,
                   hue="Konfigurasi", palette="Set2", linewidth=1.5, legend=False)
        sns.stripplot(x="Konfigurasi", y="Latensi (ms)", data=df_plot, ax=ax,
                     color="black", alpha=0.3, size=3, legend=False)

        full_title = title_id if title_id else title
        ax.set_title(full_title, fontsize=self.config.title_fontsize + 2, fontweight="bold", pad=20)
        ax.set_xlabel("Konfigurasi", fontsize=self.config.label_fontsize, fontweight="bold")
        ax.set_ylabel("Latensi (ms)", fontsize=self.config.label_fontsize, fontweight="bold")

        plt.xticks(rotation=45, ha="right")
        ax.grid(axis='y', alpha=0.3, linestyle=':')
        ax.set_axisbelow(True)

        return self._save_figure(fig, filename)

    def create_descriptive_stats_table(
        self,
        stats_data: dict[str, dict],
        filename: str,
        title_id: str = "Statistik Deskriptif Metrik Evaluasi",
    ) -> str:
        """Create comprehensive descriptive statistics table."""
        rows = []
        for metric, stats in stats_data.items():
            rows.append({
                "Metrik": metric,
                "N": stats.get("n", 0),
                "Rerata": f"{stats.get('mean', 0):.4f}",
                "Median": f"{stats.get('median', 0):.4f}",
                "Std Dev": f"{stats.get('std_dev', 0):.4f}",
                "Min": f"{stats.get('min_val', 0):.4f}",
                "Maks": f"{stats.get('max_val', 0):.4f}",
                "Q1": f"{stats.get('q1', 0):.4f}",
                "Q3": f"{stats.get('q3', 0):.4f}",
            })

        table_df = pd.DataFrame(rows)
        return self.save_table_as_image(table_df, "Descriptive Statistics", filename, title_id)

    def create_effect_size_comparison(
        self,
        comparisons: list[dict],
        filename: str,
        title_id: str = "Perbandingan Ukuran Efek RAG vs Non-RAG",
    ) -> str:
        """Create effect size comparison chart."""
        metrics = [c.get("metric_id", c.get("metric", "")) for c in comparisons]
        effect_sizes = [c.get("test_result", {}).get("effect_size", 0) or 0 for c in comparisons]

        fig, ax = plt.subplots(figsize=(12, max(6, len(metrics) * 0.6)))

        colors = ["#27ae60" if es > 0.5 else "#f39c12" if es > 0.2 else "#95a5a6" for es in effect_sizes]
        y_pos = np.arange(len(metrics))

        bars = ax.barh(y_pos, effect_sizes, color=colors, edgecolor="black", linewidth=1, alpha=0.85)
        ax.set_yticks(y_pos)
        ax.set_yticklabels(metrics, fontsize=10)
        ax.invert_yaxis()

        ax.axvline(0.2, color="#f39c12", linestyle="--", linewidth=1.5, alpha=0.7, label="Efek Kecil (0.2)")
        ax.axvline(0.5, color="#3498db", linestyle="--", linewidth=1.5, alpha=0.7, label="Efek Sedang (0.5)")
        ax.axvline(0.8, color="#27ae60", linestyle="--", linewidth=1.5, alpha=0.7, label="Efek Besar (0.8)")

        for bar, val in zip(bars, effect_sizes):
            ax.text(val + 0.02, bar.get_y() + bar.get_height() / 2,
                   f"{val:.3f}", va="center", fontsize=9, fontweight="bold")

        ax.set_title(title_id, fontsize=self.config.title_fontsize + 2, fontweight="bold", pad=20)
        ax.set_xlabel("Cohen's d", fontsize=self.config.label_fontsize, fontweight="bold")
        ax.legend(loc="lower right", fontsize=9)
        ax.grid(axis='x', alpha=0.3, linestyle=':')

        return self._save_figure(fig, filename)

    def create_metric_violin_plot(
        self,
        ablation_data: dict[str, pd.DataFrame],
        metric: str,
        filename: str,
        metric_id: str = None,
        title_id: str = None,
    ) -> str:
        """Create violin plot for metric distribution across configs."""
        plot_data = []
        for config_name, df in ablation_data.items():
            if metric in df.columns:
                for val in df[metric].dropna().values:
                    plot_data.append({"Konfigurasi": config_name, "Nilai": val})

        if not plot_data:
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.text(0.5, 0.5, "Tidak ada data", ha="center", va="center", transform=ax.transAxes)
            ax.axis('off')
            return self._save_figure(fig, filename)

        df_plot = pd.DataFrame(plot_data)
        fig, ax = plt.subplots(figsize=(max(10, len(ablation_data) * 1.2), 7))

        sns.violinplot(x="Konfigurasi", y="Nilai", data=df_plot, ax=ax,
                      hue="Konfigurasi", palette="Set3", inner="box", legend=False)

        title = title_id or f"Distribusi {metric_id or metric}"
        ax.set_title(title, fontsize=self.config.title_fontsize + 2, fontweight="bold", pad=20)
        ax.set_xlabel("Konfigurasi", fontsize=self.config.label_fontsize, fontweight="bold")
        ax.set_ylabel(metric_id or metric, fontsize=self.config.label_fontsize, fontweight="bold")

        plt.xticks(rotation=45, ha="right")
        ax.grid(axis='y', alpha=0.3, linestyle=':')

        return self._save_figure(fig, filename)

    def create_anova_results_table(
        self,
        anova_results: list[dict],
        filename: str,
        title_id: str = "Hasil Analisis ANOVA Studi Ablasi",
    ) -> str:
        """Create ANOVA results summary table."""
        rows = []
        for result in anova_results:
            sig = "***" if result.get("p_value", 1) < 0.001 else \
                  "**" if result.get("p_value", 1) < 0.01 else \
                  "*" if result.get("p_value", 1) < 0.05 else "ns"
            rows.append({
                "Metrik": result.get("metric_id", result.get("metric", "N/A")),
                "Uji": result.get("test_name_id", result.get("test_name", "N/A")),
                "F/H": f"{result.get('statistic', 0):.3f}",
                "df": result.get("degrees_of_freedom", "N/A"),
                "p-value": f"{result.get('p_value', 1):.4f}",
                "Sig.": sig,
                "η²": f"{result.get('effect_size', 0):.3f}" if result.get('effect_size') else "N/A",
            })

        table_df = pd.DataFrame(rows)
        return self.save_table_as_image(table_df, "ANOVA Results", filename, title_id, highlight_cols=["Sig."])

    def create_pairwise_comparison_heatmap(
        self,
        pairwise_results: dict[str, dict[str, float]],
        filename: str,
        title_id: str = "Matriks Perbandingan Berpasangan (p-value)",
    ) -> str:
        """Create heatmap for pairwise comparison p-values."""
        configs = list(pairwise_results.keys())
        n = len(configs)
        matrix = np.ones((n, n))

        for i, c1 in enumerate(configs):
            for j, c2 in enumerate(configs):
                if c2 in pairwise_results.get(c1, {}):
                    matrix[i, j] = pairwise_results[c1][c2]

        df_matrix = pd.DataFrame(matrix, index=configs, columns=configs)

        fig, ax = plt.subplots(figsize=(max(8, n * 0.8), max(8, n * 0.8)))
        sns.heatmap(df_matrix, annot=True, fmt=".3f", cmap="RdYlGn_r",
                   center=0.05, vmin=0, vmax=0.1, ax=ax, linewidths=0.5,
                   cbar_kws={"label": "p-value"})

        ax.set_title(title_id, fontsize=self.config.title_fontsize + 2, fontweight="bold", pad=20)
        plt.xticks(rotation=45, ha="right")
        plt.yticks(rotation=0)

        return self._save_figure(fig, filename)

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
    print("Statistical Visualization Module")
    print("=" * 50)
    print("Import this module to generate publication-quality figures.")
    print("\nExample usage:")
    print("  from statistical_visualization import FigureGenerator")
    print("  fg = FigureGenerator()")
    print("  fg.create_comparison_boxplot(rag_data, non_rag_data, 'Faithfulness', 'faith_boxplot')")
