import asyncio
from twikit import Client, TooManyRequests
import time
from datetime import datetime, timedelta
import csv
from random import randint
import os


SCREEN_NAME = 'mtgreenee' # Twitter handle to scrape
TARGET_TWEETS = 19000 # When to stop. Set a realistic ammount based on account history and rate limits. You can always run multiple times to get more.
BATCH_LIMIT = float('inf')  # Max tweets to collect per date window before moving on

# Date range to cover (adjust as needed)
END_DATE = datetime(2026, 2, 9)    # today
START_DATE = datetime(2017, 1, 1)  # when account started
WINDOW_MONTHS = 1  # size of each date window in months


async def main():
    client = Client(language='en-US')
    client.load_cookies('cookies.json')

    csv_file = 'tweets.csv'
    seen_ids = set()
    tweet_count = 0

    # Load existing data if CSV exists
    if os.path.exists(csv_file):
        with open(csv_file, 'r') as file:
            reader = csv.reader(file)
            header = next(reader)
            for row in reader:
                tweet_count += 1
                if len(row) > 6:
                    seen_ids.add(row[6])

        if 'Tweet_ID' not in header:
            with open(csv_file, 'r') as file:
                rows = list(csv.reader(file))
            rows[0].append('Tweet_ID')
            with open(csv_file, 'w', newline='') as file:
                writer = csv.writer(file)
                writer.writerows(rows)
    else:
        with open(csv_file, 'w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['Tweet_count', 'Username', 'Text', 'Created At', 'Retweets', 'Likes', 'Tweet_ID'])

    print(f'{datetime.now()} - Starting with {tweet_count} existing tweets, {len(seen_ids)} known IDs')

    # Generate date windows (newest first, stepping backward)
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
        query = f'(from:{SCREEN_NAME}) include:nativeretweets include:replies until:{until_str} since:{since_str}'

        print(f'\n{datetime.now()} - === Window: {since_str} to {until_str} ===')

        tweets = None
        window_count = 0

        while window_count < BATCH_LIMIT:

            try:
                if tweets is None:
                    print(f'{datetime.now()} - Searching: {query}')
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
                tweet_data = [tweet_count, tweet.user.name, tweet.text, tweet.created_at,
                              tweet.retweet_count, tweet.favorite_count, tweet.id]

                with open(csv_file, 'a', newline='') as file:
                    writer = csv.writer(file)
                    writer.writerow(tweet_data)

            print(f'{datetime.now()} - Window: {window_count} new | Total: {tweet_count} ({new_tweets} new, {duplicates} dupes)')

        if tweet_count >= TARGET_TWEETS:
            print(f'{datetime.now()} - Reached target!')
            break

        # Pause between windows
        wait_time = randint(10, 20)
        print(f'{datetime.now()} - Pausing {wait_time}s before next window...')
        time.sleep(wait_time)

    print(f'\n{datetime.now()} - Done! {tweet_count} total tweets ({new_tweets} new this run, {duplicates} duplicates skipped)')


asyncio.run(main())