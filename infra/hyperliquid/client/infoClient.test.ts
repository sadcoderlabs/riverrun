/**
 * Manual test script for infoClient HIP-3 handling
 *
 * Run with: npx tsx --env-file=.env.local infra/hyperliquid/client/infoClient.test.ts
 */

import * as hl from '@nktkas/hyperliquid';

// Read URLs from .env, with defaults to official endpoints
const HTTP_URL = process.env.HYPERLIQUID_HTTP_URL || 'https://api.hyperliquid.xyz';
const WS_URL = process.env.HYPERLIQUID_WS_URL || 'wss://api.hyperliquid.xyz/ws';

async function main() {
  console.log(`Using HTTP: ${HTTP_URL}`);
  console.log(`Using WS: ${WS_URL}\n`);

  const transport = new hl.HttpTransport({
    server: { mainnet: { api: HTTP_URL } },
  });
  const infoClient = new hl.InfoClient({ transport });
  const wsTransport = new hl.WebSocketTransport({ url: WS_URL });
  const subscriptionClient = new hl.SubscriptionClient({ transport: wsTransport });

  console.log('=== Testing HIP-3 vs Regular Asset Handling ===\n');

  // 1. Get perpDexs to find HIP-3 DEXs
  console.log('1. Fetching perpDexs...');
  const perpDexs = await infoClient.perpDexs();
  console.log('perpDexs:', JSON.stringify(perpDexs.slice(0, 3), null, 2));
  console.log(`Total DEXs: ${perpDexs.length} (index 0 = null for validator perps)\n`);

  // 2. Get metaAndAssetCtxs for validator perps
  console.log('2. Fetching metaAndAssetCtxs (validator perps)...');
  const [meta, assetCtxs] = await infoClient.metaAndAssetCtxs();
  console.log(`Validator perps: ${meta.universe.length} markets`);
  console.log(
    'First 3 markets:',
    meta.universe.slice(0, 3).map(m => m.name),
  );
  console.log();

  // 3. Get metaAndAssetCtxs for first HIP-3 DEX (if exists)
  const firstHip3Dex = perpDexs.find((d, i) => i > 0 && d !== null);
  if (firstHip3Dex) {
    console.log(`3. Fetching metaAndAssetCtxs for HIP-3 DEX: ${firstHip3Dex.name}...`);
    const [hip3Meta, hip3Ctxs] = await infoClient.metaAndAssetCtxs({ dex: firstHip3Dex.name });
    console.log(`HIP-3 DEX "${firstHip3Dex.name}": ${hip3Meta.universe.length} markets`);
    console.log(
      'First 3 markets:',
      hip3Meta.universe.slice(0, 3).map(m => m.name),
    );
    console.log();

    // 4. Test allMids for both
    console.log('4. Fetching allMids (validator perps)...');
    const mids = await infoClient.allMids();
    console.log('Sample mids (BTC, ETH):', { BTC: mids['BTC'], ETH: mids['ETH'] });
    console.log();

    console.log(`5. Fetching allMids for HIP-3 DEX: ${firstHip3Dex.name}...`);
    const hip3Mids = await infoClient.allMids({ dex: firstHip3Dex.name });
    const hip3MidKeys = Object.keys(hip3Mids).slice(0, 5);
    console.log(
      'Sample HIP-3 mids:',
      hip3MidKeys.map(k => ({ [k]: hip3Mids[k] })),
    );
    console.log();

    // 5. Test l2Book with different coin formats
    console.log('6. Testing l2Book subscriptions...');

    // Regular asset
    console.log('   a) l2Book for BTC (regular):');
    try {
      const btcBook = await infoClient.l2Book({ coin: 'BTC' });
      console.log(
        `      Success! Levels: ${btcBook.levels[0].length} bids, ${btcBook.levels[1].length} asks`,
      );
    } catch (e) {
      console.log(`      Error: ${e}`);
    }

    // HIP-3 with coin name (e.g., "xyz:GOOGL")
    const hip3CoinName = hip3Meta.universe[0]?.name;
    if (hip3CoinName) {
      console.log(`   b) l2Book for "${hip3CoinName}" (HIP-3 coin name):"`);
      try {
        const hip3Book = await infoClient.l2Book({ coin: hip3CoinName });
        console.log(
          `      Success! Levels: ${hip3Book.levels[0].length} bids, ${hip3Book.levels[1].length} asks`,
        );
      } catch (e) {
        console.log(`      Error: ${e}`);
      }

      // HIP-3 with asset ID
      const perpDexIndex = perpDexs.findIndex(d => d?.name === firstHip3Dex.name);
      const assetId = 100000 + perpDexIndex * 10000 + 0; // First asset in DEX
      console.log(`   c) l2Book for "${assetId}" (HIP-3 asset ID as string):`);
      try {
        const hip3BookById = await infoClient.l2Book({ coin: String(assetId) });
        console.log(
          `      Success! Levels: ${hip3BookById.levels[0].length} bids, ${hip3BookById.levels[1].length} asks`,
        );
      } catch (e) {
        console.log(`      Error: ${e}`);
      }
    }
  } else {
    console.log('3. No HIP-3 DEXs found');
  }

  // 7. Test WebSocket l2Book subscription
  console.log('\n7. Testing WebSocket l2Book subscriptions...');

  // Regular asset via WebSocket
  console.log('   a) WebSocket l2Book for BTC (regular):');
  try {
    const unsubBtc = await subscriptionClient.l2Book({ coin: 'BTC' }, data => {
      console.log(
        `      Received data! Levels: ${data.levels[0].length} bids, ${data.levels[1].length} asks`,
      );
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await unsubBtc();
    console.log('      Success!');
  } catch (e) {
    console.log(`      Error: ${e}`);
  }

  // HIP-3 with coin name via WebSocket
  if (firstHip3Dex) {
    const [hip3Meta2] = await infoClient.metaAndAssetCtxs({ dex: firstHip3Dex.name });
    const testCoin = hip3Meta2.universe[0]?.name;
    if (testCoin) {
      console.log(`   b) WebSocket l2Book for "${testCoin}" (HIP-3 coin name):`);
      try {
        const unsubHip3 = await subscriptionClient.l2Book({ coin: testCoin }, data => {
          console.log(
            `      Received data! Levels: ${data.levels[0].length} bids, ${data.levels[1].length} asks`,
          );
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await unsubHip3();
        console.log('      Success!');
      } catch (e) {
        console.log(`      Error: ${e}`);
      }
    }
  }

  // 8. Test activeAssetData for HIP-3
  console.log('\n8. Testing activeAssetData...');
  const testUser = '0x0000000000000000000000000000000000000000'; // Dummy address

  console.log('   a) activeAssetData for BTC (regular):');
  try {
    const btcData = await infoClient.activeAssetData({ coin: 'BTC', user: testUser });
    console.log('      Full response:', JSON.stringify(btcData, null, 2));
  } catch (e) {
    console.log(`      Error: ${e}`);
  }

  if (firstHip3Dex) {
    const [hip3Meta3] = await infoClient.metaAndAssetCtxs({ dex: firstHip3Dex.name });
    const hip3Coin = hip3Meta3.universe[0]?.name;
    if (hip3Coin) {
      console.log(`   b) activeAssetData for "${hip3Coin}" (HIP-3 coin name):`);
      try {
        const hip3Data = await infoClient.activeAssetData({ coin: hip3Coin, user: testUser });
        console.log('      Full response:', JSON.stringify(hip3Data, null, 2));
      } catch (e) {
        console.log(`      Error: ${e}`);
      }
    }
  }

  // 9. Test WebSocket activeAssetData for HIP-3
  console.log('\n9. Testing WebSocket activeAssetData...');

  console.log('   a) WebSocket activeAssetData for BTC (regular):');
  try {
    await subscriptionClient.activeAssetData({ coin: 'BTC', user: testUser }, data => {
      console.log('      Received data! leverage:', data.leverage);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('      Success!');
  } catch (e) {
    console.log(`      Error: ${e}`);
  }

  if (firstHip3Dex) {
    const [hip3Meta4] = await infoClient.metaAndAssetCtxs({ dex: firstHip3Dex.name });
    const hip3Coin2 = hip3Meta4.universe[0]?.name;
    if (hip3Coin2) {
      console.log(`   b) WebSocket activeAssetData for "${hip3Coin2}" (HIP-3, lowercase):`);
      try {
        await subscriptionClient.activeAssetData({ coin: hip3Coin2, user: testUser }, data => {
          console.log('      Received data! leverage:', data.leverage);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('      Success!');
      } catch (e) {
        console.log(`      Error: ${e}`);
      }

      console.log(
        `   c) WebSocket activeAssetData for "${hip3Coin2.toUpperCase()}" (HIP-3, UPPERCASE):`,
      );
      try {
        await subscriptionClient.activeAssetData(
          { coin: hip3Coin2.toUpperCase(), user: testUser },
          data => {
            console.log('      Received data! leverage:', data.leverage);
          },
        );
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('      Success!');
      } catch (e) {
        console.log(`      Error: ${e}`);
      }
    }
  }

  console.log('\n=== Test Complete ===');
  process.exit(0);
}

main().catch(console.error);
