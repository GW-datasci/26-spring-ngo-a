import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# -----------------------------
# Config
# -----------------------------
SENTIMENT_FILE = "tweets_with_sentiment.csv"
EMOTIONS_FILE  = "tweets_with_emotions.csv"   # produced by your getting_anger.py script
TIME_FREQ = "M"  # "M" = monthly, "Q" = quarterly
MISSING_COLOR = "lightgrey"


# -----------------------------
# Helpers
# -----------------------------
def ensure_sentiment_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensures df has a correct continuous sentiment_score in [-1, 1]
    based on label + confidence. Your labels are lowercase.
    """
    df = df.copy()
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
    return df


def make_time_index(df: pd.DataFrame, time_col="Created At") -> pd.DataFrame:
    df = df.copy()
    df[time_col] = pd.to_datetime(df[time_col], errors="coerce")
    df = df.dropna(subset=[time_col, "Username"])
    df["period"] = df[time_col].dt.to_period(TIME_FREQ)
    return df


def full_period_range(df: pd.DataFrame) -> pd.PeriodIndex:
    return pd.period_range(df["period"].min(), df["period"].max(), freq=TIME_FREQ)


def plot_heatmap(pivot: pd.DataFrame, title: str, cbar_label: str, vmin=None, vmax=None, cmap_name=None):
    """
    pivot: index=Username, columns=period (as strings), values=metric (float), NaN for missing.
    Missing (NaN) will be shown as light grey.
    """
    # Mask NaNs so they render as "bad" color
    data = np.ma.masked_invalid(pivot.values)

    cmap = plt.get_cmap(cmap_name) if cmap_name else plt.get_cmap()
    cmap = cmap.copy()
    cmap.set_bad(color=MISSING_COLOR)

    plt.figure(figsize=(14, 6))
    im = plt.imshow(data, aspect="auto", cmap=cmap, vmin=vmin, vmax=vmax)

    plt.xticks(range(len(pivot.columns)), pivot.columns, rotation=90)
    plt.yticks(range(len(pivot.index)), pivot.index)

    plt.title(title)
    plt.xlabel("Time")
    plt.ylabel("User")

    cbar = plt.colorbar(im)
    cbar.set_label(cbar_label)

    plt.tight_layout()
    plt.show()


# -----------------------------
# 1) Sentiment heatmap
# -----------------------------
sent = pd.read_csv(SENTIMENT_FILE)
sent = ensure_sentiment_score(sent)
sent = make_time_index(sent, time_col="Created At")

periods = full_period_range(sent)

sent_pivot = (
    sent.groupby(["Username", "period"])["sentiment_score"]
        .mean()
        .unstack()                # keep NaN for missing
        .reindex(columns=periods) # force missing periods to exist
        .sort_index()
)

sent_pivot.columns = sent_pivot.columns.astype(str)

plot_heatmap(
    sent_pivot,
    title=f"Average {('Monthly' if TIME_FREQ=='M' else 'Quarterly')} Sentiment by User",
    cbar_label="Average Sentiment (-1 = Negative, +1 = Positive)",
    vmin=-1,
    vmax=1,
    cmap_name="coolwarm"  # diverging for sentiment
)


# -----------------------------
# 2) Emotion heatmaps (anger/fear/joy)
# -----------------------------
emo = pd.read_csv(EMOTIONS_FILE)
emo = make_time_index(emo, time_col="Created At")

# Ensure emotion columns exist and are numeric
for col in ["anger", "fear", "joy"]:
    if col not in emo.columns:
        raise ValueError(f"Column '{col}' not found in {EMOTIONS_FILE}.")
    emo[col] = pd.to_numeric(emo[col], errors="coerce")

# Use same full timeline across emotions
emo_periods = full_period_range(emo)

for metric in ["anger", "fear", "joy"]:
    pivot = (
        emo.groupby(["Username", "period"])[metric]
           .mean()
           .unstack()
           .reindex(columns=emo_periods)
           .sort_index()
    )
    pivot.columns = pivot.columns.astype(str)

    # Emotion scores are usually in [0, 1]
    plot_heatmap(
        pivot,
        title=f"Average {('Monthly' if TIME_FREQ=='M' else 'Quarterly')} {metric.title()} by User",
        cbar_label=f"Average {metric.title()} (0 to 1)",
        vmin=0,
        vmax=1,
        cmap_name=None  # default colormap is fine for 0..1 intensity
    )