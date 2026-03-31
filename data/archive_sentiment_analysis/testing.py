import pandas as pd
from transformers import pipeline
from tqdm import tqdm

tqdm.pandas()

# 1) Load
tweets = pd.read_csv("/Users/anngo/Documents/GitHub/26-spring-ngo-a/data/congress/x-scraper/tweets.csv")

# 2) Clean / normalize
def preprocess_tweet(text):
    new_text = []
    for t in str(text).split():
        if t.startswith("@") and len(t) > 1:
            new_text.append("@user")
        elif t.startswith("http"):
            new_text.append("http")
        else:
            new_text.append(t)
    return " ".join(new_text)

tweets = tweets.dropna(subset=["Text"]).copy()
tweets["clean_text"] = tweets["Text"].progress_apply(preprocess_tweet)

# 3) Model
sentiment = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    batch_size=32,
)

# 4) Run in chunks (prevents huge list issues)
def run_in_chunks(texts, chunk_size=5000):
    out = []
    for i in tqdm(range(0, len(texts), chunk_size), desc="Scoring"):
        chunk = texts[i:i+chunk_size]
        out.extend(
            sentiment(
                chunk,
                truncation=True,
                max_length=512
            )
        )
    return out

preds = run_in_chunks(tweets["clean_text"].tolist(), chunk_size=5000)

tweets["label"] = [p["label"] for p in preds]
tweets["confidence"] = [p["score"] for p in preds]

# 5) Continuous sentiment score (-1..+1)
def continuous(label, score):
    if label == "Negative":
        return -score
    if label == "Positive":
        return score
    return 0.0

tweets["sentiment_score"] = [
    continuous(l, s) for l, s in zip(tweets["label"], tweets["confidence"])
]

# 6) Day aggregation
tweets["Created At"] = pd.to_datetime(tweets["Created At"], errors="coerce")
tweets = tweets.dropna(subset=["Created At"]).copy()
tweets["day"] = tweets["Created At"].dt.date

daily_sentiment = (
    tweets.groupby("day")
    .agg(
        mean_sentiment=("sentiment_score", "mean"),
        sentiment_volatility=("sentiment_score", "std"),
        extreme_share=("sentiment_score", lambda x: (abs(x) > 0.8).mean()),
        tweet_count=("sentiment_score", "count"),
    )
    .reset_index()
)

tweets.to_csv("tweets_with_sentiment.csv", index=False)
daily_sentiment.to_csv("daily_sentiment.csv", index=False)
print("Wrote tweets_with_sentiment.csv and daily_sentiment.csv")