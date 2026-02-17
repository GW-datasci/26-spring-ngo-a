import asyncio
from twikit import Client, TooManyRequests
import time
from datetime import datetime, timedelta
import csv
from random import randint
import os


# === CONFIGURATION ===
SCREEN_NAMES = [
    'mtgreenee',
    'AOC',
    'BernieSanders',
    'Votejimjordan',
    'EliCrane_CEO',
    'ewarren',
    'TeamPelosi',
    'RandPaul',
    'Victoria_Spartz',
    'michaelcburgess',
]

TARGET_TWEETS_PER_PROFILE = 30000  # high number to exhaust all tweets
BATCH_LIMIT = float('inf')        # no limit, exhaust every window

# Date range to cover
END_DATE = datetime(2026, 2, 9)
START_DATE = datetime(2016, 1, 1)
WINDOW_MONTHS = 1


async def scrape_profile(client, screen_name, csv_file):
    """Scrape all tweets for a single profile."""
    seen_ids = set()
    tweet_count = 0

    # Load existing tweet IDs for this profile to avoid duplicates
    if os.path.exists(csv_file):
        with open(csv_file, 'r') as file:
            reader = csv.reader(file)
            next(reader)  # skip header
            for row in reader:
                if len(row) > 6 and row[6]:  # has Tweet_ID
                    if row[0] == screen_name:  # only count this profile's tweets
                        seen_ids.add(row[6])
                        tweet_count += 1

    print(f'\n{"="*60}')
    print(f'  @{screen_name} - Starting with {tweet_count} existing tweets')
    print(f'{"="*60}')

    # Generate date windows
    windows = []
    current_end = END_DATE
    while current_end > START_DATE:
        current_start = current_end - timedelta(days=WINDOW_MONTHS * 30)
        if current_start < START_DATE:
            current_start = START_DATE
        windows.append((current_start, current_end))
        current_end = current_start

    new_tweets = 0
    duplicates = 0

    for window_start, window_end in windows:
        since_str = window_start.strftime('%Y-%m-%d')
        until_str = window_end.strftime('%Y-%m-%d')
        query = f'(from:{screen_name}) include:nativeretweets include:replies until:{until_str} since:{since_str}'

        print(f'\n{datetime.now()} - === @{screen_name}: {since_str} to {until_str} ===')

        tweets = None
        window_count = 0

        while window_count < BATCH_LIMIT:

            try:
                if tweets is None:
                    print(f'{datetime.now()} - Searching...')
                    tweets = await client.search_tweet(query, product='Latest')
                else:
                    wait_time = randint(5, 15)
                    print(f'{datetime.now()} - Getting next batch after {wait_time}s...')
                    time.sleep(wait_time)
                    tweets = await tweets.next()
            except TooManyRequests as e:
                rate_limit_reset = datetime.fromtimestamp(e.rate_limit_reset)
                print(f'{datetime.now()} - Rate limit reached. Waiting until {rate_limit_reset}')
                wait_time = rate_limit_reset - datetime.now()
                time.sleep(wait_time.total_seconds())
                continue
            except Exception as e:
                if 'nodename' in str(e) or 'network' in str(e).lower() or 'connection' in str(e).lower():
                    print(f'{datetime.now()} - Network error: {e}. Retrying in 60s...')
                    time.sleep(60)
                    continue
                else:
                    print(f'{datetime.now()} - Error: {e}. Moving to next window.')
                    break

            if not tweets:
                print(f'{datetime.now()} - No more tweets in this window')
                break

            for tweet in tweets:
                if tweet.id in seen_ids:
                    duplicates += 1
                    continue
                seen_ids.add(tweet.id)
                tweet_count += 1
                new_tweets += 1
                window_count += 1
                tweet_data = [screen_name, tweet.user.name, tweet.text, tweet.created_at,
                              tweet.retweet_count, tweet.favorite_count, tweet.id]

                with open(csv_file, 'a', newline='') as file:
                    writer = csv.writer(file)
                    writer.writerow(tweet_data)

            print(f'{datetime.now()} - Window: {window_count} new | Total: {tweet_count} ({new_tweets} new, {duplicates} dupes)')

        if tweet_count >= TARGET_TWEETS_PER_PROFILE:
            print(f'{datetime.now()} - Reached target!')
            break

        # Pause between windows
        wait_time = randint(5, 10)
        print(f'{datetime.now()} - Pausing {wait_time}s before next window...')
        time.sleep(wait_time)

    print(f'\n{datetime.now()} - @{screen_name} done! {tweet_count} total ({new_tweets} new, {duplicates} dupes)')
    return tweet_count, new_tweets


async def main():
    client = Client(language='en-US')
    client.load_cookies('cookies.json')

    csv_file = 'tweets.csv'

    # Create CSV if it doesn't exist
    if not os.path.exists(csv_file):
        with open(csv_file, 'w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['Account', 'Display_Name', 'Text', 'Created_At',
                             'Retweets', 'Likes', 'Tweet_ID'])

    print(f'{datetime.now()} - Scraping {len(SCREEN_NAMES)} profiles: {", ".join(SCREEN_NAMES)}')

    results = {}
    for screen_name in SCREEN_NAMES:
        total, new = await scrape_profile(client, screen_name, csv_file)
        results[screen_name] = (total, new)

        # Pause between profiles
        if screen_name != SCREEN_NAMES[-1]:
            wait_time = randint(30, 60)
            print(f'\n{datetime.now()} - Pausing {wait_time}s before next profile...')
            time.sleep(wait_time)

    # Print summary
    print(f'\n{"="*60}')
    print(f'  SUMMARY')
    print(f'{"="*60}')
    for name, (total, new) in results.items():
        print(f'  @{name}: {total} total tweets ({new} new this run)')
    print(f'{"="*60}')


asyncio.run(main())