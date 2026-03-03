import pandas as pd

files = [
    "/Users/anngo/Documents/GitHub/26-spring-ngo-a/data/congress/fec/contributions/marjorie_taylor_greene_2015-25.csv",
    "/Users/anngo/Documents/GitHub/26-spring-ngo-a/data/congress/x-scraper/tweets.csv",
]

for f in files:
    print(f"=== {f.split('/')[-1]} ===")
    df = pd.read_csv(f, nrows=5)
    print(f"Columns: {list(df.columns)}")
    print(df.head())
    print()
