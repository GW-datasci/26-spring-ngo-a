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

import asyncio
from twikit import Client, TooManyRequests
from datetime import datetime, timedelta
import csv
from random import randint
import os
from dateutil import parser as dateparser
import pandas as pd
from dotenv import load_dotenv
load_dotenv()

# === CONFIGURATION ===
df = pd.read_csv('sample_house.csv')
SCREEN_NAMES = df['twitter'].dropna().str.strip().tolist()
SCREEN_NAMES = [name for name in SCREEN_NAMES if name]

TARGET_TWEETS_PER_PROFILE = 30000
END_DATE = datetime(2024, 11, 30)
START_DATE = datetime(2023, 1, 1)
WINDOW_DAYS = 3
COOKIES_DIR = 'cookies'

CREDENTIALS = {}
for key, value in os.environ.items():
    if key.startswith('ACCOUNT_'):
        username, email, password, cookie_file = value.split(',', 3)
        CREDENTIALS[cookie_file.strip()] = (username.strip(), email.strip(), password.strip())


class RotatingClient:
    def __init__(self, cookies_dir, credentials):
        self.cookies_dir = cookies_dir
        self.credentials = credentials
        self.cookie_files = sorted(credentials.keys())
        self.current_index = 0
        self.client = None
        self.rate_limits = {}

    async def init(self):
        os.makedirs(self.cookies_dir, exist_ok=True)
        await self._load_client(self.current_index)

    async def _load_client(self, index):
        cookie_file = self.cookie_files[index]
        cookie_path = os.path.join(self.cookies_dir, cookie_file)
        creds = self.credentials[cookie_file]
        self.client = Client(language='en-US')
        await self.client.login(
            auth_info_1=creds[0],
            auth_info_2=creds[1],
            password=creds[2],
            cookies_file=cookie_path,
        )
        self.current_index = index
        print(f'{datetime.now()} - [Rotation] Loaded account: {creds[0]} ({cookie_file})')

    def current_account(self):
        return self.cookie_files[self.current_index]

    def mark_limited(self, reset_timestamp):
        self.rate_limits[self.current_account()] = datetime.fromtimestamp(reset_timestamp)

    def all_limited(self):
        return len(self.rate_limits) >= len(self.cookie_files)

    def earliest_reset(self):
        return min(self.rate_limits.values())

    async def handle_rate_limit(self, e):
        self.mark_limited(e.rate_limit_reset)
        if self.all_limited():
            wait_until = self.earliest_reset()
            wait_secs = (wait_until - datetime.now()).total_seconds()
            if wait_secs > 0:
                print(f'{datetime.now()} - All accounts exhausted. Waiting {wait_secs:.0f}s until {wait_until}...')
                await asyncio.sleep(wait_secs)
            expired_account = min(self.rate_limits, key=self.rate_limits.get)
            expired_index = self.cookie_files.index(expired_account)
            self.rate_limits.pop(expired_account)
            await self._load_client(expired_index)
        else:
            next_index = (self.current_index + 1) % len(self.cookie_files)
            while self.cookie_files[next_index] in self.rate_limits:
                next_index = (next_index + 1) % len(self.cookie_files)
            print(f'{datetime.now()} - [Rotation] Switching accounts...')
            await self._load_client(next_index)

    async def rotate(self):
        next_index = (self.current_index + 1) % len(self.cookie_files)
        print(f'{datetime.now()} - [Rotation] Rotating due to 404...')
        await self._load_client(next_index)


def load_existing(csv_file, screen_name):
    seen_ids = set()
    earliest_date = None

    if not os.path.exists(csv_file):
        return seen_ids, earliest_date

    with open(csv_file, 'r') as file:
        reader = csv.reader(file)
        next(reader)
        for row in reader:
            if len(row) > 6 and row[0] == screen_name and row[6]:
                seen_ids.add(row[6])
                try:
                    tweet_date = dateparser.parse(row[3], ignoretz=True)
                    if earliest_date is None or tweet_date < earliest_date:
                        earliest_date = tweet_date
                except (ValueError, IndexError):
                    pass
            elif len(row) > 2 and row[0] == screen_name and row[2] == 'SENTINEL':
                earliest_date = START_DATE

    return seen_ids, earliest_date


async def scrape_profile(rc, screen_name, csv_file):
    seen_ids, earliest_date = load_existing(csv_file, screen_name)
    tweet_count = len(seen_ids)

    print(f'\n{"="*60}')
    print(f'  @{screen_name} - {tweet_count} existing tweets')
    if earliest_date:
        print(f'  Earliest tweet: {earliest_date.strftime("%Y-%m-%d")}')
    print(f'{"="*60}')

    windows = []
    current_end = END_DATE
    while current_end > START_DATE:
        current_start = current_end - timedelta(days=WINDOW_DAYS)
        if current_start < START_DATE:
            current_start = START_DATE
        windows.append((current_start, current_end))
        current_end = current_start

    if earliest_date:
        skip_count = 0
        for i, (ws, we) in enumerate(windows):
            if we <= earliest_date:
                break
            skip_count += 1
        else:
            skip_count = len(windows)
        if skip_count > 0:
            print(f'  Skipping {skip_count} already-covered windows')
            windows = windows[max(skip_count - 1, 0):]

    new_tweets = 0
    duplicates = 0

    for window_start, window_end in windows:
        since_str = window_start.strftime('%Y-%m-%d')
        until_str = window_end.strftime('%Y-%m-%d')
        query = f'from:{screen_name} until:{until_str} since:{since_str}'

        print(f'\n{datetime.now()} - === @{screen_name}: {since_str} to {until_str} ===')

        tweets = None
        while True:
            try:
                print(f'{datetime.now()} - Searching...')
                tweets = await rc.client.search_tweet(query, product='Latest')
                break
            except TooManyRequests as e:
                print(f'{datetime.now()} - Rate limit hit on {rc.current_account()}')
                await rc.handle_rate_limit(e)
            except Exception as e:
                if '404' in str(e):
                    print(f'{datetime.now()} - 404 error, rotating and retrying...')
                    await asyncio.sleep(3)
                    await rc.rotate()
                elif 'nodename' in str(e) or 'network' in str(e).lower() or 'connection' in str(e).lower():
                    print(f'{datetime.now()} - Network error: {e}. Retrying in 60s...')
                    await asyncio.sleep(60)
                else:
                    print(f'{datetime.now()} - Error: {e}. Skipping window.')
                    tweets = None
                    break

        if not tweets:
            print(f'{datetime.now()} - No more tweets in this window')
        else:
            for tweet in tweets:
                if tweet.id in seen_ids:
                    duplicates += 1
                    continue
                seen_ids.add(tweet.id)
                tweet_count += 1
                new_tweets += 1
                tweet_data = [screen_name, tweet.user.name, tweet.text, tweet.created_at,
                              tweet.retweet_count, tweet.favorite_count, tweet.id]
                with open(csv_file, 'a', newline='') as file:
                    writer = csv.writer(file)
                    writer.writerow(tweet_data)
            print(f'{datetime.now()} - Total: {tweet_count} ({new_tweets} new, {duplicates} dupes)')

        if tweet_count >= TARGET_TWEETS_PER_PROFILE:
            print(f'{datetime.now()} - Reached target!')
            break

        wait_time = randint(5, 10)
        print(f'{datetime.now()} - Pausing {wait_time}s before next window...')
        await asyncio.sleep(wait_time)

    if new_tweets == 0 and tweet_count == 0:
        with open(csv_file, 'a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow([screen_name, '', 'SENTINEL', START_DATE.strftime('%Y-%m-%d'), 0, 0, ''])

    print(f'\n{datetime.now()} - @{screen_name} done! {tweet_count} total ({new_tweets} new, {duplicates} dupes)')
    return tweet_count, new_tweets


async def main():
    rc = RotatingClient(cookies_dir=COOKIES_DIR, credentials=CREDENTIALS)
    await rc.init()

    csv_file = 'tweets.csv'

    if not os.path.exists(csv_file):
        with open(csv_file, 'w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['Account', 'Display_Name', 'Text', 'Created_At',
                             'Retweets', 'Likes', 'Tweet_ID'])

    # Resume from last profile in CSV
    last_profile = None
    if os.path.exists(csv_file):
        with open(csv_file, 'r') as f:
            reader = csv.reader(f)
            next(reader)
            for row in reader:
                if row and row[0]:
                    last_profile = row[0]

    screen_names_to_run = SCREEN_NAMES
    if last_profile and last_profile in SCREEN_NAMES:
        start_index = SCREEN_NAMES.index(last_profile)
        print(f'{datetime.now()} - Resuming from @{last_profile} (index {start_index})')
        screen_names_to_run = SCREEN_NAMES[start_index:]

    print(f'{datetime.now()} - Scraping {len(screen_names_to_run)} profiles: {", ".join(screen_names_to_run)}')

    results = {}
    for screen_name in screen_names_to_run:
        total, new = await scrape_profile(rc, screen_name, csv_file)
        results[screen_name] = (total, new)

        if screen_name != screen_names_to_run[-1]:
            wait_time = randint(30, 60)
            print(f'\n{datetime.now()} - Pausing {wait_time}s before next profile...')
            await asyncio.sleep(wait_time)

    print(f'\n{"="*60}')
    print(f'  SUMMARY')
    print(f'{"="*60}')
    for name, (total, new) in results.items():
        print(f'  @{name}: {total} total tweets ({new} new this run)')
    print(f'{"="*60}')


asyncio.run(main())