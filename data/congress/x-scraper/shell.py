import asyncio
from twikit import Client

async def test():
    client = Client(language='en-US')
    client.load_cookies('cookies2.json')  # match what your script uses
    
    # Test 1: Can we search at all?
    print("Test 1: Simple search...")
    try:
        tweets = await client.search_tweet('hello', product='Latest')
        print(f"  Result: {len(tweets)} tweets found - cookies work!")
    except Exception as e:
        print(f"  FAILED: {e}")
        return
    
    # Test 2: Test each handle
    handles = ['FmrRepMTG', 'RepAOC', 'SenSanders', 'SenRandPaul']
    for handle in handles:
        print(f"\nTest 2: Searching from:{handle}...")
        try:
            tweets = await client.search_tweet(f'from:{handle}', product='Latest')
            print(f"  @{handle}: {len(tweets)} tweets found")
        except Exception as e:
            print(f"  @{handle}: ERROR - {e}")

asyncio.run(test())