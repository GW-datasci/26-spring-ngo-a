import pandas as pd
from pathlib import Path

for f in sorted(Path("data/processed").glob("*")):
    try:
        df = pd.read_csv(f)
        print(f"\n{'='*60}\n{f.name}  ({len(df)} rows, {len(df.columns)} cols)\n{'='*60}")
        print(df.head(3).to_string())
        print(f"\nColumns: {list(df.columns)}")
    except Exception as e:
        print(f"\n{f.name} — could not read: {e}")