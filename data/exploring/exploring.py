"""
Exploration script for FEC contribution data and tweet data.

This script does three things:
  1. Loads and merges all contribution CSVs + the tweets CSV
  2. Categorizes the data (amount buckets, retweet buckets, tweet type)
  3. Exports summary CSVs and static charts to an output folder

Requirements: pandas, matplotlib
Install with: pip install pandas matplotlib
"""

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import os
import glob

# -------------------------------------------------------
# PATHS — change these to match your machine
# -------------------------------------------------------
CONTRIBUTIONS_DIR = "/Users/anngo/Documents/GitHub/26-spring-ngo-a/data/congress/fec/contributions/"
TWEETS_PATH = "/Users/anngo/Documents/GitHub/26-spring-ngo-a/data/congress/x-scraper/tweets.csv"
OUTPUT_DIR = "/Users/anngo/Documents/GitHub/26-spring-ngo-a/data/exploring/output/"

os.makedirs(OUTPUT_DIR, exist_ok=True)


# =======================================================
# PART 1: LOAD DATA
# =======================================================

# -- Contributions --
# glob finds all csv files in the contributions folder.
# We read each one and stack them into a single dataframe.
# -- Contributions --
# Each CSV file corresponds to one candidate.
# We derive the candidate name from the filename.
# Map filename stems to clean display names.
CANDIDATE_FILE_MAP = {
    "marjorie_taylor_greene": "Marjorie Taylor Greene",
    "alexandria_ocasio-cortez": "Alexandria Ocasio-Cortez",
    "alexandria_ocasio_cortez": "Alexandria Ocasio-Cortez",
    "bernie_sanders": "Bernie Sanders",

    "eli_crane": "Eli Crane",
    "elizabeth_warren": "Elizabeth Warren",
}

contrib_files = glob.glob(os.path.join(CONTRIBUTIONS_DIR, "*.csv"))
print(f"Found {len(contrib_files)} contribution files")

dfs = []
for f in contrib_files:
    # Extract the part of the filename before the year range, e.g. "marjorie_taylor_greene"
    stem = os.path.basename(f).rsplit("_", 1)[0]  # drop "_2015-25.csv" etc.
    # Try to match it to a known candidate
    matched = None
    for key, name in CANDIDATE_FILE_MAP.items():
        if key in stem.lower():
            matched = name
            break
    if matched is None:
        print(f"  Skipping unrecognized file: {os.path.basename(f)}")
        continue
    print(f"  {os.path.basename(f)} → {matched}")
    df = pd.read_csv(f, low_memory=False)
    df["candidate"] = matched
    dfs.append(df)

contributions = pd.concat(dfs, ignore_index=True)

# Parse dates/amounts
contributions["date"] = pd.to_datetime(contributions["contribution_receipt_date"], errors="coerce")
contributions["amount"] = pd.to_numeric(contributions["contribution_receipt_amount"], errors="coerce")
contributions = contributions.dropna(subset=["date", "amount"])

# Create a "week" column by flooring each date to the start of its week
contributions["week"] = contributions["date"].dt.to_period("W").dt.start_time

# -- Tweets --
tweets = pd.read_csv(TWEETS_PATH, low_memory=False)

tweets["date"] = pd.to_datetime(tweets["Created At"], format="mixed", errors="coerce")
tweets["retweets"] = pd.to_numeric(tweets["Retweets"], errors="coerce").fillna(0).astype(int)
tweets["candidate"] = tweets["Username"].str.strip()
tweets = tweets.dropna(subset=["date", "candidate"])

# Keep only our 5 candidates
TWEET_KEEP = [
    "Marjorie Taylor Greene 🇺🇸",
    "Alexandria Ocasio-Cortez",
    "Bernie Sanders",
    "Eli Crane",
    "Elizabeth Warren",
]
tweets = tweets[tweets["candidate"].isin(TWEET_KEEP)]

tweets["week"] = tweets["date"].dt.tz_localize(None).dt.to_period("W").dt.start_time

print(f"Loaded {len(contributions):,} contributions and {len(tweets):,} tweets\n")


# =======================================================
# PART 2: CATEGORIZE DATA
# =======================================================

# -- Contribution amount buckets --
# pd.cut assigns each contribution to a bin based on its dollar amount.
# right=False means the left edge is inclusive: [0, 50), [50, 100), etc.
AMOUNT_BINS = [-np.inf, 50, 100, 200, 500, 1000, np.inf]
AMOUNT_LABELS = ["Under $50", "$50–$99", "$100–$199", "$200–$499", "$500–$999", "$1,000+"]

contributions["amount_category"] = pd.cut(
    contributions["amount"].abs(),   # abs() handles refunds (negative amounts)
    bins=AMOUNT_BINS,
    labels=AMOUNT_LABELS,
    right=False
)

# -- Tweet type: original vs retweet --
# On Twitter/X, retweets start with "RT @"
tweets["tweet_type"] = tweets["Text"].astype(str).str.startswith("RT @")
tweets["tweet_type"] = tweets["tweet_type"].map({True: "Retweet", False: "Original"})

# -- Retweet engagement buckets --
# How many retweets did each tweet receive?
RT_BINS = [-1, 0, 100, 1000, 10000, np.inf]
RT_LABELS = ["0", "1–100", "101–1K", "1K–10K", "10K+"]

tweets["rt_category"] = pd.cut(
    tweets["retweets"],
    bins=RT_BINS,
    labels=RT_LABELS
)


# =======================================================
# PART 3: SUMMARY CSVs
# =======================================================

# Each groupby counts rows per group, then saves to CSV.

contributions.groupby(["candidate", "week"]).size() \
    .reset_index(name="count") \
    .to_csv(os.path.join(OUTPUT_DIR, "contributions_weekly.csv"), index=False)

contributions.groupby(["candidate", "amount_category"]).size() \
    .reset_index(name="count") \
    .to_csv(os.path.join(OUTPUT_DIR, "contributions_by_amount.csv"), index=False)

tweets.groupby(["candidate", "week"]).size() \
    .reset_index(name="count") \
    .to_csv(os.path.join(OUTPUT_DIR, "tweets_weekly.csv"), index=False)

tweets.groupby(["candidate", "tweet_type"]).size() \
    .reset_index(name="count") \
    .to_csv(os.path.join(OUTPUT_DIR, "tweets_by_type.csv"), index=False)

tweets.groupby(["candidate", "rt_category"]).size() \
    .reset_index(name="count") \
    .to_csv(os.path.join(OUTPUT_DIR, "tweets_by_rt_category.csv"), index=False)

# Save one merged file with all candidates' contributions
contributions.to_csv(os.path.join(OUTPUT_DIR, "all_contributions_merged.csv"), index=False)

print("Summary CSVs saved ✓")


# =======================================================
# PART 4: CHARTS
# =======================================================

# Helper: format x-axis to show a date label every 3 months
def format_dates(ax):
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", fontsize=8)

# Assign one consistent color to each candidate across all charts
all_candidates = sorted(
    set(contributions["candidate"].unique()) | set(tweets["candidate"].unique())
)
candidate_colors = {
    c: plt.cm.Set2(i / max(len(all_candidates) - 1, 1))
    for i, c in enumerate(all_candidates)
}


# -- Chart 1: Weekly contributions over time --
fig, ax = plt.subplots(figsize=(14, 5))
for cand in all_candidates:
    data = contributions[contributions["candidate"] == cand].groupby("week").size()
    if not data.empty:
        ax.plot(data.index, data.values, label=cand, color=candidate_colors[cand], linewidth=1)
ax.set_title("Weekly Contributions Over Time")
ax.set_ylabel("Number of Contributions")
ax.legend(fontsize=8)
format_dates(ax)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "chart_contributions_weekly.png"), dpi=150)
plt.close()


# -- Chart 2: Contribution amount distribution --
fig, ax = plt.subplots(figsize=(12, 5))
# unstack turns the amount_category groups into columns for a stacked bar
pivot = contributions.groupby(["candidate", "amount_category"]).size().unstack(fill_value=0)
pivot = pivot[AMOUNT_LABELS]
pivot.plot(kind="bar", stacked=True, ax=ax, colormap="YlOrRd")
ax.set_title("Contributions by Amount Category")
ax.set_ylabel("Count")
ax.legend(title="Amount", fontsize=8, bbox_to_anchor=(1.05, 1))
plt.xticks(rotation=30, ha="right", fontsize=8)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "chart_contributions_amount_dist.png"), dpi=150)
plt.close()


# -- Chart 3: Weekly tweets over time --
fig, ax = plt.subplots(figsize=(14, 5))
for cand in all_candidates:
    data = tweets[tweets["candidate"] == cand].groupby("week").size()
    if not data.empty:
        ax.plot(data.index, data.values, label=cand, color=candidate_colors[cand], linewidth=1)
ax.set_title("Weekly Tweets Over Time")
ax.set_ylabel("Number of Tweets")
ax.legend(fontsize=8)
format_dates(ax)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "chart_tweets_weekly.png"), dpi=150)
plt.close()


# -- Chart 4: Original vs Retweet per candidate --
fig, ax = plt.subplots(figsize=(10, 5))
pivot = tweets.groupby(["candidate", "tweet_type"]).size().unstack(fill_value=0)
pivot.plot(kind="bar", stacked=True, ax=ax, color=["#4C78A8", "#F58518"])
ax.set_title("Original Tweets vs Retweets")
ax.set_ylabel("Count")
ax.legend(title="Type")
plt.xticks(rotation=30, ha="right", fontsize=8)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "chart_tweets_type.png"), dpi=150)
plt.close()


# -- Chart 5: Retweet engagement distribution per candidate --
fig, ax = plt.subplots(figsize=(12, 5))
pivot = tweets.groupby(["candidate", "rt_category"]).size().unstack(fill_value=0)
pivot = pivot[RT_LABELS]
pivot.plot(kind="bar", stacked=True, ax=ax, colormap="Blues")
ax.set_title("Tweets by Retweet Engagement")
ax.set_ylabel("Count")
ax.legend(title="Retweets Received", fontsize=8, bbox_to_anchor=(1.05, 1))
plt.xticks(rotation=30, ha="right", fontsize=8)
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, "chart_tweets_rt_categories.png"), dpi=150)
plt.close()


print("Charts saved ✓")
print(f"\nAll output in: {OUTPUT_DIR}")