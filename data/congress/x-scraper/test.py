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
from twikit import Client

async def test():
    client = Client(language='en-US')
    client.load_cookies('cookies.json')  # change to match your cookie file

    # Test 1: Simple search
    print("Test 1: Simple search...")
    try:
        tweets = await client.search_tweet('hello', product='Latest')
        print(f"  SUCCESS: {len(tweets)} tweets found")
    except Exception as e:
        print(f"  FAILED: {e}")
        return

    # Test 2: Search specific handles
    handles = ['SenRandPaul', 'RepAOC', 'SenSanders']
    for handle in handles:
        print(f"\nTest 2: from:{handle}...")
        try:
            tweets = await client.search_tweet(f'from:{handle}', product='Latest')
            if tweets:
                print(f"  @{handle}: {len(tweets)} tweets found")
                print(f"  Sample: {tweets[0].text[:80]}...")
            else:
                print(f"  @{handle}: 0 tweets")
        except Exception as e:
            print(f"  @{handle}: ERROR - {e}")

asyncio.run(test())