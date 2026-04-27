# Congress Sentiment Dashboard

Interactive visualization of Twitter sentiment patterns across U.S. House members of the 118th Congress, exploring how virality and emotional tone relate to small-donor funding share.

## Setup

From the project root (`26-spring-ngo-a/`):

```bash
# 1. Generate the JSON data files (only needs to be run once, or after data updates)
python dashboard/scripts/preprocess.py

# 2. Install and start the dev server
cd dashboard
npm install
npm run dev
```

Then open <http://localhost:5173>.

## Project structure

```
dashboard/
├── scripts/
│   └── preprocess.py      ← reads data/processed/*.csv, outputs JSON
└── src/
    ├── data/              ← generated JSON lives here (gitignored)
    │   ├── members.json
    │   └── top_tweets.json
    ├── hooks/
    │   └── useMembers.js  ← data layer + shared constants
    ├── components/
    │   ├── Nav.jsx
    │   ├── ScatterPlot.jsx
    │   ├── EmotionRadar.jsx
    │   ├── StatTile.jsx
    │   └── TweetCard.jsx
    └── pages/
        ├── Explore.jsx    ← scatter plot explorer (Act 1)
        └── Member.jsx     ← member deep dive (Act 3)
```

## Routes

- `/explore` — Scatter plot of all 403 members. Toggle X axis between virality, outrage, sentiment, anger, ideology. Filter by party, virality quartile, or caucus. Click any dot to drill down.
- `/member/:handle` — Per-member view: emotion radar, tone breakdown, historical small-donor trend, and top 10 tweets.

## Data dependencies

Reads from `../data/processed/`:
- `user_full.csv` — primary member-level table (87 cols)
- `house_tweets_enriched.csv` — tweet-level with sentiment scores

The preprocess script trims to ~50 fields, cleans `NaN` to `null`, and writes valid JSON with `allow_nan=False` as a guard.
