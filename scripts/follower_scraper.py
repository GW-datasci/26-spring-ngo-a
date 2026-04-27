# follower_scraper.py
# Fetches follower counts for all members in sample_house_full.csv

# MONKEY PATCH: Fix for twikit broken since March 18 2026
import re
_tx_mod = __import__('twikit.x_client_transaction.transaction', fromlist=['ClientTransaction'])
_tx_mod.ON_DEMAND_FILE_REGEX = re.compile(
    r""",(\d+):["']ondemand\.s["']""", flags=(re.VERBOSE | re.MULTILINE))
_tx_mod.ON_DEMAND_HASH_PATTERN = r',{}:"([0-9a-f]+)"'

async def _patched_get_indices(self, home_page_response, session, headers):
    key_byte_indices = []
    response = self.validate_response(home_page_response) or self.home_page_response
    on_demand_file_index = _tx_mod.ON_DEMAND_FILE_REGEX.search(str(response)).group(1)
    regex = re.compile(_tx_mod.ON_DEMAND_HASH_PATTERN.format(on_demand_file_index))
    filename = regex.search(str(response)).group(1)
    on_demand_file_url = f"https://abs.twimg.com/responsive-web/client-web/ondemand.s.{filename}a.js"
    on_demand_file_response = await session.request(method="GET", url=on_demand_file_url, headers=headers)
    key_byte_indices_match = _tx_mod.INDICES_REGEX.finditer(str(on_demand_file_response.text))
    for item in key_byte_indices_match:
        key_byte_indices.append(item.group(2))
    if not key_byte_indices:
        raise Exception("Couldn't get KEY_BYTE indices")
    key_byte_indices = list(map(int, key_byte_indices))
    return key_byte_indices[0], key_byte_indices[1:]

_tx_mod.ClientTransaction.get_indices = _patched_get_indices
# END MONKEY PATCH

# MONKEY PATCH 2: Fix twikit User.__init__ KeyError on missing fields
import twikit.user as _user_mod

_original_user_init = _user_mod.User.__init__

def _patched_user_init(self, client, data, *args, **kwargs):
    # Pre-fill missing fields before the original __init__ runs
    legacy = data.get('legacy', {})
    
    # Ensure nested entities exist
    if 'entities' not in legacy:
        legacy['entities'] = {}
    if 'description' not in legacy['entities']:
        legacy['entities']['description'] = {}
    if 'urls' not in legacy['entities']['description']:
        legacy['entities']['description']['urls'] = []
    if 'url' not in legacy['entities']:
        legacy['entities']['url'] = {}
    if 'urls' not in legacy['entities']['url']:
        legacy['entities']['url']['urls'] = []
    
    # Ensure other commonly missing fields
    legacy.setdefault('pinned_tweet_ids_str', [])
    legacy.setdefault('withheld_in_countries', [])
    legacy.setdefault('location', '')
    legacy.setdefault('description', '')
    legacy.setdefault('verified', False)
    
    data['legacy'] = legacy
    data.setdefault('is_blue_verified', False)
    
    _original_user_init(self, client, data, *args, **kwargs)

_user_mod.User.__init__ = _patched_user_init
# END MONKEY PATCH 2

import asyncio
import csv
import os
import pandas as pd
from twikit import Client, TooManyRequests
from datetime import datetime
from random import randint
from dotenv import load_dotenv
load_dotenv()

# === CONFIGURATION ===
SAMPLE_CSV = "sample_house_full.csv"
OUTPUT_CSV = "follower_counts.csv"
COOKIES_DIR = "cookies"

CREDENTIALS = {}
for key, value in os.environ.items():
    if key.startswith('ACCOUNT_'):
        username, email, password, cookie_file = value.split(',', 3)
        CREDENTIALS[cookie_file.strip()] = (username.strip(), email.strip(), password.strip())


async def get_follower_count(client, screen_name):
    """Fetch a single user's follower count."""
    try:
        user = await client.get_user_by_screen_name(screen_name)
        return {
            "screen_name": screen_name,
            "followers": user.followers_count,
            "following": user.following_count,
            "tweets_count": user.statuses_count,
            "verified": user.is_blue_verified,
            "created_at": user.created_at,
        }
    except Exception as e:
        print(f"  Error for @{screen_name}: {e}")
        return None


async def main():
    # Load sample
    sample = pd.read_csv(SAMPLE_CSV)
    handles = sample["twitter"].dropna().str.strip().tolist()
    handles = [h for h in handles if h]
    print(f"Members to fetch: {len(handles)}")

    # Load already-fetched handles
    already_done = set()
    if os.path.exists(OUTPUT_CSV):
        with open(OUTPUT_CSV, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                already_done.add(row["screen_name"].lower())
        print(f"Already fetched: {len(already_done)}")

    remaining = [h for h in handles if h.lower() not in already_done]
    print(f"Remaining: {len(remaining)}")

    if not remaining:
        print("All done!")
        return

    # Initialize client
    cookie_files = sorted(CREDENTIALS.keys())
    current_idx = 0
    cookie_file = cookie_files[current_idx]
    creds = CREDENTIALS[cookie_file]

    client = Client(language='en-US')
    cookie_path = os.path.join(COOKIES_DIR, cookie_file)
    await client.login(
        auth_info_1=creds[0],
        auth_info_2=creds[1],
        password=creds[2],
        cookies_file=cookie_path,
    )
    print(f"Logged in as {creds[0]}")

    # Create output file if needed
    if not os.path.exists(OUTPUT_CSV):
        with open(OUTPUT_CSV, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["screen_name", "followers", "following", "tweets_count", "verified", "created_at"])

    # Fetch follower counts
    for i, handle in enumerate(remaining):
        print(f"[{i+1}/{len(remaining)}] @{handle}...", end=" ")

        try:
            result = await get_follower_count(client, handle)
        except TooManyRequests as e:
            print(f"Rate limited. Waiting 60s then rotating...")
            await asyncio.sleep(60)
            current_idx = (current_idx + 1) % len(cookie_files)
            cookie_file = cookie_files[current_idx]
            creds = CREDENTIALS[cookie_file]
            client = Client(language='en-US')
            cookie_path = os.path.join(COOKIES_DIR, cookie_file)
            await client.login(
                auth_info_1=creds[0],
                auth_info_2=creds[1],
                password=creds[2],
                cookies_file=cookie_path,
            )
            print(f"Rotated to {creds[0]}")
            # Retry
            try:
                result = await get_follower_count(client, handle)
            except Exception as e2:
                print(f"  Still failed: {e2}")
                result = None
        except RecursionError:
            print(f"Recursion error — rotating account...")
            current_idx = (current_idx + 1) % len(cookie_files)
            cookie_file = cookie_files[current_idx]
            creds = CREDENTIALS[cookie_file]
            client = Client(language='en-US')
            cookie_path = os.path.join(COOKIES_DIR, cookie_file)
            await client.login(
                auth_info_1=creds[0],
                auth_info_2=creds[1],
                password=creds[2],
                cookies_file=cookie_path,
            )
            try:
                result = await get_follower_count(client, handle)
            except Exception as e2:
                print(f"  Still failed: {e2}")
                result = None

        if result:
            print(f"{result['followers']:,} followers")
            with open(OUTPUT_CSV, "a", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    result["screen_name"],
                    result["followers"],
                    result["following"],
                    result["tweets_count"],
                    result["verified"],
                    result["created_at"],
                ])
        else:
            print("FAILED")

        # Rate limit courtesy
        wait = randint(4, 8)
        await asyncio.sleep(wait)

    print(f"\nDone! Results in {OUTPUT_CSV}")


asyncio.run(main())