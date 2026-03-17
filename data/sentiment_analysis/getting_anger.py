import pandas as pd
from transformers import pipeline
from tqdm import tqdm

tqdm.pandas()

# ---- LOAD YOUR DATA ----
df = pd.read_csv("tweets_with_sentiment.csv")

# If you don't already have clean_text, create it
if "clean_text" not in df.columns:
    def preprocess_tweet(text):
        new_text = []
        for t in str(text).split():
            if t.startswith("@"):
                new_text.append("@user")
            elif t.startswith("http"):
                new_text.append("http")
            else:
                new_text.append(t)
        return " ".join(new_text)

    df["clean_text"] = df["Text"].progress_apply(preprocess_tweet)

# ---- LOAD EMOTION MODEL ----
emo = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    return_all_scores=True,   # important
    truncation=True
)

# ---- RUN IN BATCHES (much faster + safer) ----
def run_in_chunks(texts, chunk_size=1000):
    all_results = []
    for i in tqdm(range(0, len(texts), chunk_size), desc="Scoring emotions"):
        chunk = texts[i:i+chunk_size]
        results = emo(chunk)
        all_results.extend(results)
    return all_results

emotion_results = run_in_chunks(df["clean_text"].tolist())

# ---- EXTRACT ANGER SCORE ----
def extract_score(result, label_name):
    for item in result:
        if item["label"].lower() == label_name:
            return item["score"]
    return 0.0

df["anger"] = [extract_score(r, "anger") for r in emotion_results]
df["fear"] = [extract_score(r, "fear") for r in emotion_results]
df["joy"] = [extract_score(r, "joy") for r in emotion_results]

df.to_csv("tweets_with_emotions.csv", index=False)

print("Saved tweets_with_emotions.csv")
print(df[["anger", "fear", "joy"]].head())