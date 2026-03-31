import pandas as pd

tweets = pd.read_csv("tweets.csv")
sample = pd.read_csv("sample_house.csv")

tweet_counts = tweets.groupby("Tweet_count").size().reset_index(name="tweet_count")

tweet_counts["handle_lower"] = tweet_counts["Tweet_count"].str.lower().str.strip()
sample["twitter_lower"] = sample["twitter"].str.lower().str.strip()

result = sample.merge(tweet_counts, left_on="twitter_lower", right_on="handle_lower", how="left")

print(result[["clean_name", "twitter", "tweet_count"]].sort_values("tweet_count", ascending=False).to_string())
print(f"\nMatched: {result['tweet_count'].notna().sum()} / {len(result)}")

result.to_csv("sample_with_tweet_counts.csv", index=False)