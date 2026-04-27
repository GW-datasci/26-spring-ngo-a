"""
Preprocess pipeline for the Congress Sentiment Dashboard.

Reads:
    data/processed/user_full.csv
    data/processed/house_tweets_enriched.csv
    data/processed/fec_legislators_matched.csv  (for bioguide IDs)

Writes:
    dashboard/src/data/members.json
    dashboard/src/data/top_tweets.json

Run from project root:
    python dashboard/scripts/preprocess.py
"""

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

PROCESSED = Path("data/processed")
OUT_DIR   = Path("dashboard/src/data")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def clean_value(v):
    """Coerce numpy/pandas scalars + NaN/Inf to JSON-safe equivalents."""
    if v is None:
        return None
    if isinstance(v, float):
        return None if (math.isnan(v) or math.isinf(v)) else round(v, 4)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else round(f, 4)
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, np.ndarray):
        return v.tolist()
    if pd.isna(v):
        return None
    return v


def write_json(obj, path):
    """Write strict JSON — fails loudly if NaN/Inf sneaks through."""
    with open(path, "w") as f:
        json.dump(obj, f, separators=(",", ":"), allow_nan=False)


# ── 1. members.json ──────────────────────────────────────────────────────────

KEEP_COLS = [
    "handle_lower", "official_full", "state_abbrev", "district_code",
    "bioguide",
    "party_code", "quartile",
    "pct_small_donors", "avg_retweets_raw", "avg_likes_raw", "followers",
    "tweet_count",
    "avg_sentiment", "sentiment_slope", "outrage_index",
    "pct_negative", "pct_positive", "pct_extreme_neg", "pct_extreme_pos", "pct_neutral",
    "avg_anger", "avg_fear", "avg_joy", "avg_disgust", "avg_sadness",
    "pct_anger_dominant", "pct_joy_dominant", "pct_disgust_dominant",
    "pct_fear_dominant", "pct_neutral_dominant",
    "nominate_dim1", "nominate_abs",
    "terms_served", "is_female", "age_in_2024",
    "margin_of_victory", "competitive",
    "is_freedom_caucus", "is_progressive", "is_squad",
    "is_problem_solver", "is_blue_dog", "is_new_dem", "is_rsc",
    "pct_small_2008", "pct_small_2010", "pct_small_2012", "pct_small_2014",
    "pct_small_2016", "pct_small_2018", "pct_small_2020", "pct_small_2022",
    "pct_change_22_24",
]

df = pd.read_csv(PROCESSED / "user_full.csv")

# Merge bioguide from house_with_features.csv — this file was built from the same
# tweet handles as user_full, so handle_lower matches perfectly.
print("Merging bioguide IDs from house_with_features.csv...")
features = pd.read_csv(PROCESSED / "house_with_features.csv")
bio_lookup = (
    features[["handle_lower", "bioguide"]]
    .dropna(subset=["bioguide"])
    .drop_duplicates(subset="handle_lower")
)

if "bioguide" in df.columns:
    df = df.drop(columns="bioguide")
df = df.merge(bio_lookup, on="handle_lower", how="left")

n_with_bioguide = df["bioguide"].notna().sum()
print(f"  bioguide coverage: {n_with_bioguide} / {len(df)} members")

missing_bio = df[df["bioguide"].isna()][["handle_lower", "official_full"]]
if len(missing_bio):
    print(f"  Still missing ({len(missing_bio)}):")
    print(missing_bio.to_string())

cols = [c for c in KEEP_COLS if c in df.columns]
missing = [c for c in KEEP_COLS if c not in df.columns]
if missing:
    print(f"WARNING: missing columns: {missing}")

records = [
    {k: clean_value(v) for k, v in row.items()}
    for row in df[cols].to_dict("records")
]

write_json(records, OUT_DIR / "members.json")
print(f"members.json     → {len(records):>4} members, {len(cols)} columns")


# ── 2. top_tweets.json ───────────────────────────────────────────────────────
# Multi-criteria sample per member: top by retweets, top by positive sentiment,
# top by negative sentiment, and most recent. Up to ~30 tweets per member.

print("Loading house_tweets_enriched.csv (this will take ~30s)...")

tweets = pd.read_csv(
    PROCESSED / "house_tweets_enriched.csv",
    low_memory=False,
    usecols=["handle_lower", "Text", "Created At", "Tweet_ID",
             "Retweets", "Likes", "sentiment_score", "label"],
)

tweets = tweets.dropna(subset=["handle_lower", "Text"])

valid_handles = {r["handle_lower"] for r in records if r.get("handle_lower")}
tweets = tweets[tweets["handle_lower"].isin(valid_handles)]

tweets["Retweets"] = pd.to_numeric(tweets["Retweets"], errors="coerce").fillna(0)
tweets["Likes"]    = pd.to_numeric(tweets["Likes"],    errors="coerce").fillna(0)

# Parse dates so we can pick recent
tweets["_dt"] = pd.to_datetime(tweets["Created At"], errors="coerce", utc=True)
tweets["Created At"] = tweets["Created At"].astype(str)


def collect_for_member(g):
    """
    Return up to ~50 unique tweets per member across four ranking strategies,
    ensuring the dashboard's filtered views draw from a comprehensive pool.
    """
    take = []
    take.append(g.nlargest(20, "Retweets"))           # most viral
    take.append(g.nlargest(15, "sentiment_score"))    # most positive
    take.append(g.nsmallest(15, "sentiment_score"))   # most negative
    take.append(g.nlargest(10, "_dt"))                # most recent

    out = pd.concat(take, ignore_index=True)
    if "Tweet_ID" in out.columns:
        out = out.drop_duplicates(subset="Tweet_ID")
    else:
        out = out.drop_duplicates(subset="Text")
    return out


print("Sampling tweets per member...")
out_tweets = {}
for handle, group in tweets.groupby("handle_lower"):
    sample = collect_for_member(group)
    out_tweets[handle] = [
        {k: clean_value(v) for k, v in row.items()
         if k not in ("handle_lower", "_dt")}
        for row in sample.to_dict("records")
    ]

write_json(out_tweets, OUT_DIR / "top_tweets.json")
total_tweets = sum(len(v) for v in out_tweets.values())
print(f"top_tweets.json  → {len(out_tweets):>4} members, {total_tweets:>5} total tweets "
      f"(avg {total_tweets / max(1, len(out_tweets)):.1f} per member)")
print("Done.")
