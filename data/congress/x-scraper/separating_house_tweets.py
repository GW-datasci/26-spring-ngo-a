import pandas as pd

# ── Export all tweets for sample_house members with >100 tweets ──────────────
sample_house = pd.read_csv("sample_house.csv")
tweets = pd.read_csv("tweets.csv")
sample_counts = pd.read_csv("sample_with_tweet_counts.csv")

# Find members with >100 tweets
active = sample_counts[sample_counts["tweet_count"] > 100].copy()
active["twitter_lower"] = active["twitter"].str.lower().str.strip()

# Get their handles
active_handles = set(active["twitter_lower"])

# Filter tweets by handle
tweets["handle_lower"] = tweets["Tweet_count"].str.lower().str.strip()
active_tweets = tweets[tweets["handle_lower"].isin(active_handles)].drop(columns="handle_lower")

active_tweets.to_csv("house_tweets.csv", index=False)
print(f"Members : {active['twitter'].nunique()}")
print(f"Tweets  : {len(active_tweets)}")