# Data files

This directory will hold two generated JSON files:

- `members.json` — 403 House members with aggregated metrics
- `top_tweets.json` — top 10 tweets per member, keyed by handle

Generate them by running from the project root:

```bash
python dashboard/scripts/preprocess.py
```
