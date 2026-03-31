import pandas as pd

sample = pd.read_csv("sample_with_tweet_counts.csv")
low = sample[sample["tweet_count"] < 100]
print(low[["clean_name", "twitter", "tweet_count", "quartile", "party"]].to_string())