import pandas as pd

df = pd.read_csv("tweets_with_sentiment.csv")

# Normalize label casing/spacing
df["label"] = df["label"].astype(str).str.strip().str.lower()

# Ensure confidence is numeric
df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce")

# Map sentiment to continuous score (-1..+1)
def continuous_score(label, conf):
    if label == "negative":
        return -conf
    elif label == "positive":
        return conf
    else:  # neutral / mixed
        return 0.0

df["sentiment_score"] = [
    continuous_score(l, c) for l, c in zip(df["label"], df["confidence"])
]

# Quick sanity checks
print(df[["label", "confidence", "sentiment_score"]].head(10))
print("Nonzero rows:", (df["sentiment_score"] != 0).sum())

df.to_csv("tweets_with_sentiment_FIXED.csv", index=False)
print("Wrote tweets_with_sentiment_FIXED.csv")