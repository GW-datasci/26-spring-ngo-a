

import csv
import os
import time
from datetime import datetime
from dotenv import load_dotenv
import requests

load_dotenv()

API_KEY = os.environ["FEC_API_KEY"]
BASE = "https://api.open.fec.gov/v1"
END_DATE = datetime.today().strftime("%Y-%m-%d")

CYCLES = [
    ("2016-01-01", "2017-12-31"),
    ("2018-01-01", "2019-12-31"),
    ("2020-01-01", "2021-12-31"),
    ("2022-01-01", "2023-12-31"),
    ("2024-01-01", END_DATE),
]

DELAY = 0.5
OUTPUT_DIR = "output"

FIELDS = [
    "contribution_receipt_date",
    "contribution_receipt_amount",
    "contributor_name",
    "contributor_city",
    "contributor_state",
    "contributor_zip",
    "contributor_employer",
    "contributor_occupation",
    "contributor_aggregate_ytd",
    "receipt_type",
    "receipt_type_description",
    "memo_text",
    "committee_id",
    "candidate_id",
    "candidate_name",
]


def api_get(endpoint, params, retries=5):
    params["api_key"] = API_KEY
    for attempt in range(retries):
        try:
            time.sleep(DELAY)
            r = requests.get(f"{BASE}{endpoint}", params=params, timeout=120)
            if r.status_code in (429, 502, 503, 504):
                wait = 30 * (attempt + 1)
                print(f"      {r.status_code} error, retrying in {wait}s...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
            wait = 30 * (attempt + 1)
            print(f"      Timeout/connection error, retrying in {wait}s...")
            time.sleep(wait)
    raise Exception(f"Failed after {retries} retries: {endpoint}")


def get_committee_ids(candidate_id):
    if candidate_id.startswith("C"):
        return [candidate_id]
    data = api_get(f"/candidate/{candidate_id}/committees/", {"designation": "P", "per_page": 100})
    ids = [c["committee_id"] for c in data.get("results", [])]
    if not ids:
        data = api_get(f"/candidate/{candidate_id}/committees/", {"per_page": 100})
        ids = [c["committee_id"] for c in data.get("results", [])]
    return ids


def fetch_and_write(committee_id, min_date, max_date, writer, cid, cname):
    """Fetch Schedule A records and write directly to CSV. Returns record count."""
    params = {
        "committee_id": committee_id,
        "min_date": min_date,
        "max_date": max_date,
        "sort": "contribution_receipt_date",
        "sort_hide_null": "true",
        "per_page": 100,
        "is_individual": "true",
    }
    count = 0
    pages = 0
    while True:
        data = api_get("/schedules/schedule_a/", params)
        results = data.get("results", [])
        if not results:
            break
        pages += 1
        for r in results:
            row = {f: r.get(f, "") for f in FIELDS}
            row["candidate_id"] = cid
            row["candidate_name"] = cname
            writer.writerow(row)
            count += 1
        last = data.get("pagination", {}).get("last_indexes", {})
        if not last.get("last_index"):
            break
        params["last_index"] = last["last_index"]
        params["last_contribution_receipt_date"] = last["last_contribution_receipt_date"]
        if pages % 100 == 0:
            print(f"    {pages} pages, {count} records...")
    return count


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open("accounts.csv", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    candidates = [(r["candidate_id"].strip(), r.get("Name", "").strip()) for r in rows if r.get("candidate_id", "").strip()]

    for cid, name in candidates:
        label = name or cid
        path = os.path.join(OUTPUT_DIR, f"{cid}.csv")

        if os.path.exists(path):
            print(f"Skipping {label} ({cid}) — already have {path}")
            continue

        print(f"\n{label} ({cid})")
        committees = get_committee_ids(cid)
        print(f"  Committees: {committees}")

        total = 0
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDS)
            writer.writeheader()
            for cmte in committees:
                for start, end in CYCLES:
                    print(f"  Fetching {cmte} ({start} to {end})...")
                    total += fetch_and_write(cmte, start, end, writer, cid, label)

        print(f"  Done: {total} total records saved to {path}")

    print("\nAll candidates complete.")


if __name__ == "__main__":
    main()