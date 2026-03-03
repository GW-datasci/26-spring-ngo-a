import pandas as pd

df = pd.read_csv("tweets_with_sentiment_FIXED.csv")

df["sentiment_score"] = pd.to_numeric(df["sentiment_score"], errors="coerce")
df = df.dropna(subset=["Username", "sentiment_score"])

user_summary = (
    df.groupby("Username")
      .agg(
          avg_sentiment=("sentiment_score", "mean"),
          sentiment_std=("sentiment_score", "std"),
          tweet_count=("sentiment_score", "count"),
          pct_negative=("sentiment_score", lambda x: (x < 0).mean()),
          pct_positive=("sentiment_score", lambda x: (x > 0).mean()),
          pct_extreme=("sentiment_score", lambda x: (abs(x) > 0.8).mean()),
      )
      .reset_index()
      .sort_values("avg_sentiment")
)

user_summary.to_csv("user_sentiment_summary.csv", index=False)
print("Saved user_sentiment_summary.csv")
print(user_summary)