import pandas as pd

tweets = pd.read_csv("tweets.csv")
print(tweets["Tweet_count"].value_counts())
print(f"\nTotal unique accounts: {tweets['Tweet_count'].nunique()}")