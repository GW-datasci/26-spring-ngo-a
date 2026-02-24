import glob, pandas as pd, re
from collections import defaultdict

files = defaultdict(list)
for f in glob.glob('*.csv'):
    match = re.match(r'([a-z_]+?)_\d', f)
    if match:
        files[match.group(1)].append(f)

for name, flist in files.items():
    if len(flist) > 1:
        pd.concat([pd.read_csv(f) for f in flist]).sort_values('contribution_receipt_date').to_csv(f'{name}_2015-25.csv', index=False)
        print(f'Merged: {name} ({len(flist)} files)')