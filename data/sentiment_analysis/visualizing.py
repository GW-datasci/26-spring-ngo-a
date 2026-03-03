import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# ---- LOAD ----
df = pd.read_csv("tweets_with_sentiment.csv")

# ---- FIX SENTIMENT SCORE (safe recompute) ----
df["label"] = df["label"].astype(str).str.strip().str.lower()
df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce")

def continuous_score(label, conf):
    if label == "negative":
        return -conf
    elif label == "positive":
        return conf
    else:
        return 0.0

df["sentiment_score"] = [
    continuous_score(l, c) for l, c in zip(df["label"], df["confidence"])
]

# ---- CLEAN DATES ----
df["Created At"] = pd.to_datetime(df["Created At"], errors="coerce")
df = df.dropna(subset=["Created At", "sentiment_score", "Username"])

# ---- CREATE MONTH VARIABLE ----
df["month"] = df["Created At"].dt.to_period("M")

# ---- CREATE COMPLETE MONTH RANGE ----
all_months = pd.period_range(
    df["month"].min(),
    df["month"].max(),
    freq="M"
)

# ---- AGGREGATE ----
pivot = (
    df.groupby(["Username", "month"])["sentiment_score"]
      .mean()
      .unstack()
)

# Reindex columns to include missing months
pivot = pivot.reindex(columns=all_months)

# Sort users alphabetically
pivot = pivot.sort_index()

# Convert PeriodIndex to string for plotting
pivot.columns = pivot.columns.astype(str)

# ---- PREPARE DATA WITH MASK FOR NaN ----
data = np.ma.masked_invalid(pivot.values)

# ---- CREATE COLORMAP ----
cmap = plt.cm.coolwarm  # diverging colormap (good for -1 to +1 sentiment)
cmap.set_bad(color="lightgrey")  # missing months → light grey

# ---- PLOT (single plot only) ----
plt.figure(figsize=(14, 6))
im = plt.imshow(data, aspect="auto", cmap=cmap, vmin=-1, vmax=1)

plt.xticks(range(len(pivot.columns)), pivot.columns, rotation=90)
plt.yticks(range(len(pivot.index)), pivot.index)

plt.title("Average Monthly Sentiment by User")
plt.xlabel("Month")
plt.ylabel("User")

# ---- ADD COLORBAR (KEY) ----
cbar = plt.colorbar(im)
cbar.set_label("Average Sentiment (-1 = Negative, +1 = Positive)")

plt.tight_layout()
plt.show()