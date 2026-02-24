import glob, pandas as pd, re, os

rows = []
for f in sorted(glob.glob('*.csv')):
    if f.endswith('_merged.csv') or f == 'summary.csv':
        continue
    df = pd.read_csv(f)
    name = re.match(r'([a-z_]+?)_\d', f).group(1).replace('_', ' ').title()
    rows.append({
        'candidate': name,
        'file': f,
        'total_records': len(df),
        'total_receipt_amount': df['contribution_receipt_amount'].sum()
    })

summary = pd.DataFrame(rows)
summary.to_csv('summary.csv', index=False)
print(summary.to_string(index=False))