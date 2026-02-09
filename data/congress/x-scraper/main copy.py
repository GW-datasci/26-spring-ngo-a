import asyncio
from twikit import Client, TooManyRequests
import time
from datetime import datetime
import csv
from random import randint
import os


MINIMUM_TWEETS = 4000
QUERY = '(from:mtgreenee) until:2023-12-30 since:2017-01-01'

async def get_tweets(client, tweets):
    if tweets is None:
        print(f'{datetime.now()} - Getting tweets...')
        tweets = await client.search_tweet(QUERY, product='Latest')
    else:
        wait_time = randint(5, 15)
        print(f'{datetime.now()} - Getting next tweets after {wait_time} seconds ...')
        time.sleep(wait_time)
        tweets = await tweets.next()

    return tweets


async def main():
    client = Client(language='en-US')
    client.load_cookies('cookies.json')

    # Load existing data
    csv_file = 'tweets.csv'
    seen_ids = set()
    tweet_count = 0

    if os.path.exists(csv_file):
        with open(csv_file, 'r') as file:
            reader = csv.reader(file)
            header = next(reader)
            for row in reader:
                tweet_count += 1
                if len(row) > 6:  # has Tweet_ID column
                    seen_ids.add(row[6])

        # Add Tweet_ID column to header if missing
        if 'Tweet_ID' not in header:
            # Rewrite file with new header
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


    tweets = None
    starting_count = tweet_count
    while tweet_count < starting_count + MINIMUM_TWEETS:
        try:
            tweets = await get_tweets(client, tweets)
            print(f'DEBUG: tweets type={type(tweets)}, len={len(tweets) if tweets else 0}')
        except TooManyRequests as e:
            rate_limit_reset = datetime.fromtimestamp(e.rate_limit_reset)
            print(f'{datetime.now()} - Rate limit reached. Waiting until {rate_limit_reset}')
            wait_time = rate_limit_reset - datetime.now()
            time.sleep(wait_time.total_seconds())
            continue

        if not tweets:
            print(f'{datetime.now()} - No more tweets found')
            break

        for tweet in tweets:
            tweet_count += 1
            tweet_data = [tweet_count, tweet.user.name, tweet.text, tweet.created_at, tweet.retweet_count, tweet.favorite_count]

            with open('tweets.csv', 'a', newline='') as file:
                writer = csv.writer(file)
                writer.writerow(tweet_data)

        print(f'{datetime.now()} - Got {tweet_count} tweets')

    print(f'{datetime.now()} - Done! Got {tweet_count} tweets found')


asyncio.run(main())