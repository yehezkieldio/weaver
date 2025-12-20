#!/usr/bin/env python3
"""
Simple wrapper around run-statistical-analysis.py that saves output to files.

This script runs the statistical analysis and saves both console output
and a structured report to the .results/ directory with timestamps.

Usage:
    python scripts/run-statistical-analysis-v2.py --latest
    python scripts/run-statistical-analysis-v2.py --run-id=<uuid>
"""

import subprocess
import sys
import os
from datetime import datetime

def main():
    # Create .results directory
    os.makedirs(".results", exist_ok=True)

    # Generate timestamp
    timestamp = int(datetime.now().timestamp() * 1000)
    output_file = f".results/statistical-analysis-report-{timestamp}.txt"

    # Get command line arguments (everything after script name)
    args = sys.argv[1:]

    # Run the original script and capture output
    cmd = ["python3", "scripts/run-statistical-analysis.py"] + args

    print(f"Running statistical analysis...")
    print(f"Arguments: {' '.join(args) if args else '--latest'}")
    print(f"Output will be saved to: {output_file}\n")

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

    except subprocess.CalledProcessError as e:
        print(f"Error running analysis: {e}")
        print(f"Output: {e.output}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
