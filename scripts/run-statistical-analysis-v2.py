#!/usr/bin/env python3
"""
Simple wrapper around run-statistical-analysis.py that saves output to files.

This script runs the statistical analysis and saves both console output
and a structured report to the research/results directory with timestamps.
Figures are automatically generated and saved to timestamped subdirectories.

Usage:
    python scripts/run-statistical-analysis-v2.py --latest
    python scripts/run-statistical-analysis-v2.py --run-id=<uuid>
    python scripts/run-statistical-analysis-v2.py --latest --no-figures
"""

import subprocess
import sys
import os
from datetime import datetime

def main():
    # Create research/results directory
    os.makedirs("research/results/statistical", exist_ok=True)

    # Generate timestamp
    timestamp = int(datetime.now().timestamp() * 1000)
    output_file = f"research/results/statistical/statistical-analysis-report-{timestamp}.txt"
    figures_dir = f"research/results/statistical/figures-{timestamp}"

    # Get command line arguments (everything after script name)
    args = sys.argv[1:]

    # Check if user explicitly disabled figures
    enable_figures = "--no-figures" not in args
    args = [a for a in args if a != "--no-figures"]

    # Build command with default arguments
    cmd = ["uv", "run",  "scripts/run-statistical-analysis.py"] + args

    # Add figures flag if not disabled
    if enable_figures:
        cmd.extend(["--figures", f"--output-dir={figures_dir}"])

    print(f"Running statistical analysis...")
    print(f"Arguments: {' '.join(args) if args else '--latest'}")
    print(f"Output will be saved to: {output_file}")
    if enable_figures:
        print(f"Figures will be saved to: {figures_dir}/")
    print()

    try:
        # Run and capture output
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )

        # Save to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result.stdout)
            if result.stderr:
                f.write("\n\n=== STDERR ===\n")
                f.write(result.stderr)

        # Also print to console
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)

        print(f"\n✅ Analysis complete!")
        print(f"📄 Report saved to: {output_file}")

        # List generated figures if any
        if enable_figures and os.path.exists(figures_dir):
            figures = os.listdir(figures_dir)
            if figures:
                print(f"📊 {len(figures)} figures saved to: {figures_dir}/")
                for fig in sorted(figures):
                    print(f"   • {fig}")

    except subprocess.CalledProcessError as e:
        print(f"Error running analysis: {e}")
        if e.stdout:
            print(f"Output: {e.stdout}")
        if e.stderr:
            print(f"Stderr: {e.stderr}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
