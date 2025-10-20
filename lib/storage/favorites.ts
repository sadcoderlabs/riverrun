import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@riverrun:favorite_markets';

/**
 * Get the list of favorite market IDs
 */
export async function getFavoriteMarkets(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(FAVORITES_KEY);
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Error loading favorite markets:', error);
    return [];
  }
}

/**
 * Add a market to favorites
 */
export async function addFavoriteMarket(marketId: string): Promise<void> {
  try {
    const favorites = await getFavoriteMarkets();
    if (!favorites.includes(marketId)) {
      favorites.push(marketId);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('Error adding favorite market:', error);
  }
}

/**
 * Remove a market from favorites
 */
export async function removeFavoriteMarket(marketId: string): Promise<void> {
  try {
    const favorites = await getFavoriteMarkets();
    const filtered = favorites.filter(id => id !== marketId);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing favorite market:', error);
  }
}

/**
 * Toggle a market's favorite status
 */
export async function toggleFavoriteMarket(marketId: string): Promise<boolean> {
  try {
    const favorites = await getFavoriteMarkets();
    const isFavorite = favorites.includes(marketId);

    if (isFavorite) {
      await removeFavoriteMarket(marketId);
      return false;
    } else {
      await addFavoriteMarket(marketId);
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite market:', error);
    return false;
  }
}

/**
 * Check if a market is favorited
 */
export async function isFavoriteMarket(marketId: string): Promise<boolean> {
  try {
    const favorites = await getFavoriteMarkets();
    return favorites.includes(marketId);
  } catch (error) {
    console.error('Error checking favorite market:', error);
    return false;
  }
}
